const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const auth = require('../middleware/auth');

// @route   POST /api/uploads/avatar
// @desc    Upload a base64 image to Cloudinary, return the secure URL
router.post('/avatar', auth, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ msg: 'No image provided' });
    }

    // Validate it's a data URI (base64 encoded image)
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ msg: 'Invalid image format. Must be a base64 data URI.' });
    }

    // Check approximate size (base64 is ~33% larger than binary)
    const base64Length = image.length - image.indexOf(',') - 1;
    const fileSizeBytes = Math.ceil(base64Length * 0.75);
    if (fileSizeBytes > 5 * 1024 * 1024) {
      return res.status(400).json({ msg: 'Image too large. Maximum size is 5MB.' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary is not configured in the server environment.' });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'filotem/avatars',
      public_id: `user_${req.user}_${Date.now()}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      tags: [req.user]
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;

