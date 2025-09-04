require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Pixel = require('./models/Pixel');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wish-pixel-map', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  initializePixels();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Initialize pixels if database is empty
async function initializePixels() {
  try {
    const pixelCount = await Pixel.countDocuments();
    
    if (pixelCount === 0) {
      const pixels = [];
      
      for (let i = 0; i < 10000; i++) {
        pixels.push({
          pixelId: i,
          hasWish: false,
          color: '#E0E0E0'
        });
      }
      
      await Pixel.insertMany(pixels);
    }
  } catch (error) {
    console.error('Error initializing pixels:', error);
  }
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pixels', require('./routes/pixels'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Wish Pixel Map API v2.0 is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large. Maximum size is 5MB.'
    });
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      error: 'Only image files are allowed'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  mongoose.connection.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    process.exit(0);
  });
});