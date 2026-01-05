const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [0, 'Score cannot be negative'],
    max: [100, 'Score cannot exceed 100']
  },
  breakdown: {
    productive: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    restful: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    neutral: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    distractive: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  metrics: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalTime: {
      type: Number,
      default: 0 // in minutes
    },
    productiveTime: {
      type: Number,
      default: 0 // in minutes
    },
    focusRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    averageSessionLength: {
      type: Number,
      default: 0
    }
  },
  insights: {
    aiGenerated: {
      type: String,
      maxlength: [1000, 'AI insight cannot exceed 1000 characters']
    },
    recommendations: [{
      type: {
        type: String,
        enum: ['schedule', 'break', 'focus', 'habit', 'tool'],
        required: true
      },
      message: {
        type: String,
        required: true,
        maxlength: [200, 'Recommendation message cannot exceed 200 characters']
      },
      priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
      },
      category: String
    }],
    trends: {
      scoreChange: Number, // Change from previous day
      productivityTrend: String, // 'improving', 'declining', 'stable'
      peakHours: [String], // e.g. ['10:00-11:00', '14:00-15:00']
          distractionTriggers: [String] // e.g. ['social media', 'emails']
        }
      }
    });
    
    module.exports = mongoose.model('Score', scoreSchema);