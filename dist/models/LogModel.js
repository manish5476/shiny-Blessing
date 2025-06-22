"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const logSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.Mixed, // Typed with ILogMeta
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
        type: mongoose_1.Schema.Types.ObjectId,
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
logSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'userId',
        select: 'name email',
    });
    next();
});
const Log = mongoose_1.default.model('Log', logSchema);
exports.default = Log;
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
//# sourceMappingURL=LogModel.js.map