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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const validator_1 = __importDefault(require("validator"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: [validator_1.default.isEmail, 'Please provide a valid email'],
    },
    photo: String,
    role: {
        type: String,
        enum: ['user', 'seller', 'admin', 'superAdmin'],
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function (val) {
                if (this.isNew && val === undefined)
                    return false;
                return val === undefined || val === this.password;
            },
            message: 'Passwords must match',
        },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Middleware to hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});
// Middleware to update passwordChangedAt
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew)
        return next();
    this.passwordChangedAt = new Date(Date.now() - 1000);
    next();
});
// Middleware to exclude inactive users
userSchema.pre(/^find/, function (next) {
    if (!this.getOptions().includeInactive) {
        this.find({ active: { $ne: false } });
    }
    this.select('-__v');
    next();
});
// Instance method to compare passwords
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcryptjs_1.default.compare(candidatePassword, userPassword);
};
// Instance method to check if password changed after token issuance
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
        return changedTimestamp > JWTTimestamp;
    }
    return false;
};
// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto_1.default.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return resetToken;
};
// Create and export the User model
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
// import mongoose, { Schema, Document, Model, Query } from 'mongoose';
// import validator from 'validator';
// import bcrypt from 'bcryptjs';
// import crypto from 'crypto';
// // 1. Define Interface for User Document
// export interface IUser extends Document {
//   name: string;
//   email: string;
//   role: 'user' | 'staff' | 'admin' | 'superAdmin';
//   photo?: string;
//   password: string;
//   // FIX 1: Make passwordConfirm optional (string | undefined)
//   passwordConfirm?: string; // Not stored in DB, but used for validation
//   passwordChangedAt?: Date;
//   passwordResetToken?: string;
//   passwordResetExpires?: Date;
//   active: boolean; // For soft-deletion
//   // Instance methods (declared in interface to be recognized by TypeScript)
//   correctPassword(candidatePassword: string): Promise<boolean>;
//   changedPasswordAfter(JWTTimestamp: number): boolean;
//   createPasswordResetToken(): string;
// }
// // 2. Define Interface for User Model (if you have static methods)
// export interface IUserModel extends Model<IUser> {
//   // ... (static methods if any)
// }
// const userSchema = new mongoose.Schema<IUser>(
//   {
//     name: {
//       type: String,
//       required: [true, 'Name is required'],
//     },
//     email: {
//       type: String,
//       required: [true, 'Email is required'],
//       unique: true,
//       lowercase: true,
//       validate: [validator.isEmail, 'Please provide a valid email'],
//     },
//     role: {
//       type: String,
//       enum: ['user', 'staff', 'admin', 'superAdmin'],
//       default: 'user',
//     },
//     photo: String,
//     password: {
//       type: String,
//       required: [true, 'Password is required'],
//       minlength: [8, 'Password must be at least 8 characters'],
//       select: false,
//     },
//     passwordConfirm: {
//       type: String,
//       required: [true, 'Please confirm your password'],
//       validate: {
//         validator: function (this: IUser, val: string | undefined): boolean {
//           if (this.isNew && val === undefined) return false; // Only require on create
//           return val === undefined || val === this.password;
//         },
//         message: 'Passwords must match',
//       },
//   },
//   passwordChangedAt: Date,
//   passwordResetToken: String,
//   passwordResetExpires: Date,
//   active: {
//   type: Boolean,
//   default: true,
//   select: false,
// },
//   },
// { timestamps: true }
// );
// // Pre-save hooks
// userSchema.pre<IUser>('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   // FIX 1: Assign `undefined` is now allowed because passwordConfirm is `string | undefined`
//   // Mongoose will automatically strip undefined fields before saving to DB.
//   this.passwordConfirm = undefined;
//   if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
//   next();
// });
// userSchema.pre<Query<IUser[], IUser>>(/^find/, function (next) {
//   if (!this.getOptions().includeInactive) {
//     this.find({ active: { $ne: false } });
//   }
//   this.select('-__v');
//   next();
// });
// // // Query middleware for soft-deletion
// // userSchema.pre<Query<IUser[], IUser>>(/^find/, function (next) {
// //   this.find({ active: { $ne: false } }).select('-__v');
// //   next();
// // });
// // Instance methods (defined on userSchema.methods)
// userSchema.methods.correctPassword = async function (candidatePassword: string): Promise<boolean> {
//   if (!this.password) return false;
//   return await bcrypt.compare(candidatePassword, this.password);
// };
// userSchema.methods.changedPasswordAfter = function (this: IUser, JWTTimestamp: number): boolean {
//   if (this.passwordChangedAt) {
//     const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
//     return changedTimestamp > JWTTimestamp;
//   }
//   return false;
// };
// // userSchema.methods.changedPasswordAfter = function (this: IUser, JWTTimestamp: number): boolean {
// //   if (this.passwordChangedAt) {
// //     // FIX 2: Convert the number to a string explicitly before passing to parseInt
// //     const changedTimestamp = parseInt(String(this.passwordChangedAt.getTime() / 1000), 10);
// //     return changedTimestamp > JWTTimestamp;
// //   }
// //   return false;
// // };
// userSchema.methods.createPasswordResetToken = function (this: IUser): string {
//   const resetToken = crypto.randomBytes(32).toString('hex');
//   this.passwordResetToken = crypto
//     .createHash('sha256')
//     .update(resetToken)
//     .digest('hex');
//   this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
//   return resetToken;
// };
// const User = mongoose.model<IUser, IUserModel>('User', userSchema);
// export default User;
//# sourceMappingURL=UserModel.js.map