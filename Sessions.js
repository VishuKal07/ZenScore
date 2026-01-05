const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  appName: {
    type: String,
    required: [true, 'App name is required'],
    trim: true,
    maxlength: [100, 'App name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['productive', 'restful', 'neutral', 'distractive'],
      message: 'Category must be one of: productive, restful, neutral, distractive'
    }
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [1440, 'Duration cannot exceed 1440 minutes (24 hours)'] // in minutes
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  productivityScore: {
    type: Number,
    min: [0, 'Productivity score cannot be negative'],
    max: [100, 'Productivity score cannot exceed 100'],
    default: function() {
      // Auto-calculate based on category
      const categoryScores = {
        productive: 85,
        restful: 70,
        neutral: 50,
        distractive: 25
      };
      return categoryScores[this.category] || 50;
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  metadata: {
    platform: String, // 'web', 'desktop', 'mobile'
    version: String,
    deviceType: String,
    location: {
      timezone: String,
      country: String
    }
  },
  isManualEntry: {
    type: Boolean,
    default: false
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});