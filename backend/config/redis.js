const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const logger = require('../utils/logger');

let pubClient = null;
let subClient = null;

async function setupRedisAdapter(io) {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.info('REDIS_URL not configured — Socket.io using in-memory adapter (single-node mode)');
    return false;
  }

  try {
    logger.info('Initializing Redis adapter for Socket.io horizontal scaling...');

    pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 500, 5000);
        return delay;
      }
    });

    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      logger.error('Redis Pub Client Error:', err);
    });

    subClient.on('error', (err) => {
      logger.error('Redis Sub Client Error:', err);
    });

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.io Redis adapter successfully configured and attached');
    return true;
  } catch (err) {
    logger.error('Failed to initialize Redis adapter; continuing with in-memory adapter:', err);
    return false;
  }
}

async function closeRedis() {
  if (pubClient) {
    await pubClient.quit().catch(() => {});
    pubClient = null;
  }
  if (subClient) {
    await subClient.quit().catch(() => {});
    subClient = null;
  }
}

module.exports = {
  setupRedisAdapter,
  closeRedis
};

