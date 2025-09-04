const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Pixel = require('../models/Pixel');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wish-pixel-map',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto' }
    ]
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /api/pixels - Get all pixels (public access)
router.get('/', async (req, res) => {
  try {
    const pixels = await Pixel.find()
      .populate('owner', 'email')
      .sort({ pixelId: 1 });

    res.json(pixels);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch pixels'
    });
  }
});

// GET /api/pixels/:pixelId - Get specific pixel (public access)
router.get('/:pixelId', async (req, res) => {
  try {
    const { pixelId } = req.params;
    
    const pixel = await Pixel.findOne({ pixelId })
      .populate('owner', 'email');
    
    if (!pixel) {
      return res.status(404).json({
        error: 'Pixel not found'
      });
    }

    res.json(pixel);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch pixel'
    });
  }
});

// POST /api/pixels/submit-wish/:pixelId - Submit wish for a pixel (protected route)
router.post('/submit-wish/:pixelId', auth, upload.single('image'), async (req, res) => {
  try {
    const { pixelId } = req.params;
    const { wishText, color, walletAddress } = req.body;

    // Validate input
    if (!wishText || !color || !walletAddress) {
      return res.status(400).json({
        error: 'Wish text, color, and wallet address are required'
      });
    }

    // Find pixel
    const pixel = await Pixel.findOne({ pixelId });
    if (!pixel) {
      return res.status(404).json({
        error: 'Pixel not found'
      });
    }

    // Check if pixel already has a wish
    if (pixel.hasWish) {
      return res.status(400).json({
        error: 'This pixel already has a wish'
      });
    }

    // Prepare update data
    const updateData = {
      hasWish: true,
      owner: req.user._id,
      wishText: wishText.trim(),
      color,
      walletAddress
    };

    // Add image URL if file was uploaded
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    // Update pixel
    const updatedPixel = await Pixel.findOneAndUpdate(
      { pixelId },
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'email');

    res.json({
      message: 'Wish submitted successfully',
      pixel: updatedPixel
    });
  } catch (error) {
    console.error('Submit wish error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    res.status(500).json({
      error: 'Failed to submit wish'
    });
  }
});

// GET /api/pixels/user/:userId - Get pixels owned by a user (public access)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const pixels = await Pixel.find({ owner: userId })
      .populate('owner', 'email')
      .sort({ pixelId: 1 });

    res.json(pixels);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch user pixels'
    });
  }
});

// GET /api/pixels/stats/overview - Get pixel statistics (public access)
router.get('/stats/overview', async (req, res) => {
  try {
    const totalPixels = await Pixel.countDocuments();
    const pixelsWithWishes = await Pixel.countDocuments({ hasWish: true });
    const availablePixels = totalPixels - pixelsWithWishes;
    
    res.json({
      totalPixels,
      pixelsWithWishes,
      availablePixels,
      wishPercentage: totalPixels > 0 ? ((pixelsWithWishes / totalPixels) * 100).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;