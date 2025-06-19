import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Efficient time-based queries
  },
  level: {
    type: String,
    required: true,
    enum: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'], // Winston levels
    index: true
  },
  message: {
    type: String,
    required: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed // Flexible structure for userId, IP, URL, etc.
  },
  environment: {
    type: String,
    required: true,
    enum: ['development', 'production', 'test'],
    default: process.env.NODE_ENV || 'development',
    index: true
  },
  // These are optional denormalized fields to support easier querying without parsing meta
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userRole: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String,
    index: true
  },
  method: {
    type: String,
    index: true
  },
  url: {
    type: String,
    index: true
  }
}, {
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});
