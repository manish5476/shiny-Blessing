import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';

// Interface for meta field to improve type safety
export interface ILogMeta {
  userId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  url?: string;
  method?: string;
  [key: string]: any; // Allow additional fields
}

// Interface for Log document
export interface ILog extends Document {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
  message: string;
  meta: ILogMeta;
  environment: 'development' | 'production' | 'test';
  userId?: mongoose.Types.ObjectId;
  userRole?: string;
  ipAddress?: string;
  method?: string;
  url?: string;
}

// Interface for Log model
interface ILogModel extends Model<ILog> {
  // Add static methods here if needed
}

const logSchema = new Schema<ILog, ILogModel>({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true, // Keep for time-based queries
  },
  level: {
    type: String,
    required: [true, 'Log level is required'],
    enum: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
    index: true, // Keep for filtering by level
  },
  message: {
    type: String,
    required: [true, 'Log message is required'],
  },
  meta: {
    type: Schema.Types.Mixed, // Typed with ILogMeta
    default: {},
  },
  environment: {
    type: String,
    required: [true, 'Environment is required'],
    enum: ['development', 'production', 'test'],
    default: process.env.NODE_ENV || 'development',
    index: true, // Keep for environment-based queries
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true, // Keep for user-based queries
  },
  userRole: String, // Removed index to optimize write performance
  ipAddress: String, // Removed index
  method: String, // Removed index
  url: String, // Removed index
}, {
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
});

// Middleware to populate userId
logSchema.pre(/^find/, function (this: mongoose.Query<ILog, ILog>, next) {
  this.populate({
    path: 'userId',
    select: 'name email',
  } as PopulateOptions);
  next();
});

const Log = mongoose.model<ILog, ILogModel>('Log', logSchema);
export default Log;
// import mongoose, { PopulateOptions, Schema } from "mongoose";

// export interface ILogMeta {
//   userId?: mongoose.Types.ObjectId;
//   ipAddress?: string;
//   url?: string;
//   method?: string;
//   [key: string]: any; // Allow additional fields
// }

// export interface ILog extends Document {
//   timestamp: Date;
//   level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
//   message: string;
//   meta: ILogMeta;
//   environment: 'development' | 'production' | 'test';
//   userId?: mongoose.Types.ObjectId;
//   userRole?: string;
//   ipAddress?: string;
//   method?: string;
//   url?: string;
// }

// const logSchema = new mongoose.Schema<ILog>({
//   timestamp: {
//     type: Date,
//     default: Date.now,
//     index: true,
//   },
//   level: {
//     type: String,
//     required: true,
//     enum: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
//     index: true,
//   },
//   message: {
//     type: String,
//     required: true,
//   },
//   meta: {
//     type: Schema.Types.Mixed, // Still Mixed, but typed with ILogMeta
//     default: {},
//   },
//   environment: {
//     type: String,
//     required: true,
//     enum: ['development', 'production', 'test'],
//     default: process.env.NODE_ENV || 'development',
//     index: true,
//   },
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     index: true,
//   },
//   userRole: {
//     type: String,
//     index: true,
//   },
//   ipAddress: {
//     type: String,
//     index: true,
//   },
//   method: {
//     type: String,
//     index: true,
//   },
//   url: {
//     type: String,
//     index: true,
//   },
// }, {
//   toObject: { virtuals: true },
//   toJSON: { virtuals: true },
// });

// logSchema.pre(/^find/, function (this: mongoose.Query<ILog, ILog>, next) {
//   this.populate({
//     path: 'userId',
//     select: 'name email',
//   } as PopulateOptions);
//   next();
// });