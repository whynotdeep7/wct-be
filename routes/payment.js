const express = require('express');
const Pixel = require('../models/Pixel');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/payment/verify-transaction - Verify Web3 transaction
router.post('/verify-transaction', auth, async (req, res) => {
  try {
    const { pixelId, transactionHash, amount } = req.body;

    // Validate input
    if (!pixelId || !transactionHash || !amount) {
      return res.status(400).json({
        error: 'Pixel ID, transaction hash, and amount are required'
      });
    }

    // Validate amount (should be $1 = 1000000000000000000 wei for ETH)
    const expectedAmount = '1000000000000000000'; // 1 ETH in wei (approximately $1)
    if (amount !== expectedAmount) {
      return res.status(400).json({
        error: 'Invalid payment amount. Expected $1 worth of ETH.'
      });
    }

    // Check if pixel exists and is available
    const pixel = await Pixel.findOne({ pixelId });
    if (!pixel) {
      return res.status(404).json({
        error: 'Pixel not found'
      });
    }

    if (pixel.isPurchased) {
      return res.status(400).json({
        error: 'Pixel is already purchased'
      });
    }

    // Verify transaction hash format (basic validation)
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return res.status(400).json({
        error: 'Invalid transaction hash format'
      });
    }

    // Update pixel ownership
    pixel.isPurchased = true;
    pixel.owner = req.user._id;
    await pixel.save();

    console.log(`Web3 payment successful: Pixel ${pixelId} purchased by user ${req.user._id} with transaction ${transactionHash}`);

    res.json({
      success: true,
      message: 'Payment verified and pixel updated successfully',
      pixel: pixel
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      error: 'Payment verification failed'
    });
  }
});

// GET /api/payment/pixel-price - Get current pixel price in ETH
router.get('/pixel-price', async (req, res) => {
  try {
    // Return the price in wei (1 ETH = 1000000000000000000 wei)
    // This is approximately $1 worth of ETH
    res.json({
      priceInWei: '1000000000000000000',
      priceInEth: '1.0',
      currency: 'ETH',
      usdEquivalent: 1.0
    });
  } catch (error) {
    console.error('Get price error:', error);
    res.status(500).json({
      error: 'Failed to get pixel price'
    });
  }
});

module.exports = router;