const admin = require('firebase-admin');
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');

let isFirebaseConfigured = false;

// Initialize Firebase Admin if environment credentials are provided
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseConfigured = true;
    logger.info('✅ Firebase Admin SDK initialized from service account JSON');
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    isFirebaseConfigured = true;
    logger.info('✅ Firebase Admin SDK initialized from environment credentials');
  } else {
    logger.info('Firebase credentials not set — Push notifications operating in mock mode');
  }
} catch (err) {
  logger.warn('Failed to initialize Firebase Admin SDK; running in mock mode:', err.message);
  isFirebaseConfigured = false;
}

/**
 * Send push notification to one or multiple users.
 * @param {string|string[]} userIds - Single user ID or array of user IDs
 * @param {object} payload - { title, body, data }
 */
async function sendPushNotification(userIds, { title, body, data = {} }) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const validIds = ids.filter(id => id && mongoose.isValidObjectId(id));
  if (validIds.length === 0) return;

  try {
    const recipients = await User.find({
      _id: { $in: validIds },
      allowNotifications: { $ne: false }
    }).select('_id deviceTokens');

    const tokenMap = [];
    recipients.forEach(user => {
      if (user.deviceTokens && user.deviceTokens.length > 0) {
        user.deviceTokens.forEach(dt => {
          if (dt.token) {
            tokenMap.push({ userId: user._id, token: dt.token });
          }
        });
      }
    });

    if (tokenMap.length === 0) {
      logger.debug(`No device tokens found for notification: "${title}"`);
      return;
    }

    if (!isFirebaseConfigured) {
      logger.debug(`[MOCK PUSH] Would send to ${tokenMap.length} devices: "${title}" - "${body}"`, data);
      return;
    }

    const tokens = tokenMap.map(t => t.token);
    const stringData = {};
    for (const [key, val] of Object.entries(data)) {
      stringData[key] = String(val);
    }

    const message = {
      tokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'filotem_messages'
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(`Push notification sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);

    // Clean up expired or unregistered tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await User.updateMany(
          { 'deviceTokens.token': { $in: tokensToRemove } },
          { $pull: { deviceTokens: { token: { $in: tokensToRemove } } } }
        );
        logger.info(`Pruned ${tokensToRemove.length} invalid/expired device tokens`);
      }
    }
  } catch (err) {
    logger.error('Error dispatching push notification:', err.message);
  }
}

module.exports = {
  sendPushNotification,
  isFirebaseConfigured: () => isFirebaseConfigured
};
