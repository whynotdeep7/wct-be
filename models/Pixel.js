const mongoose = require('mongoose');

const pixelSchema = new mongoose.Schema({
  pixelId: {
    type: Number,
    required: [true, 'Pixel ID is required'],
    unique: true,
    min: [0, 'Pixel ID must be at least 0'],
    max: [9999, 'Pixel ID must be at most 9999']
  },
  hasWish: {
    type: Boolean,
    default: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  wishText: {
    type: String,
    maxlength: [500, 'Wish text cannot exceed 500 characters'],
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#E0E0E0',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
  },
  walletAddress: {
    type: String,
    trim: true,
    // Accept either EVM (0x...) or Solana base58 (32-44 chars without 0OIl)
    match: [
      /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/,
      'Please enter a valid wallet address'
    ]
  }
}, {
  timestamps: true
});

// Index for faster queries
pixelSchema.index({ owner: 1 });
pixelSchema.index({ hasWish: 1 });

module.exports = mongoose.model('Pixel', pixelSchema);