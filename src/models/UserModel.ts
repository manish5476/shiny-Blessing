import mongoose, { Schema, Document, Model, Query } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 1. Define Interface for User Document
export interface IUser extends Document {
  name: string;
  email: string;
  role: 'user' | 'staff' | 'admin' | 'superAdmin';
  photo?: string;
  password: string;
  // FIX 1: Make passwordConfirm optional (string | undefined)
  passwordConfirm?: string; // Not stored in DB, but used for validation
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean; // For soft-deletion

  // Instance methods (declared in interface to be recognized by TypeScript)
  correctPassword(candidatePassword: string): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): boolean;
  createPasswordResetToken(): string;
}

// 2. Define Interface for User Model (if you have static methods)
export interface IUserModel extends Model<IUser> {
  // ... (static methods if any)
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    role: {
      type: String,
      enum: ['user', 'staff', 'admin', 'superAdmin'],
      default: 'user',
    },
    photo: String,
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
        // This only works on CREATE and SAVE!
        validator: function (this: IUser, val: string) {
          return val === this.password;
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
  },
  { timestamps: true }
);

// Pre-save hooks
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  // FIX 1: Assign `undefined` is now allowed because passwordConfirm is `string | undefined`
  // Mongoose will automatically strip undefined fields before saving to DB.
  this.passwordConfirm = undefined;

  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);

  next();
});

// Query middleware for soft-deletion
userSchema.pre<Query<IUser[], IUser>>(/^find/, function (next) {
  this.find({ active: { $ne: false } }).select('-__v');
  next();
});

// Instance methods (defined on userSchema.methods)
userSchema.methods.correctPassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (this: IUser, JWTTimestamp: number): boolean {
  if (this.passwordChangedAt) {
    // FIX 2: Convert the number to a string explicitly before passing to parseInt
    const changedTimestamp = parseInt(String(this.passwordChangedAt.getTime() / 1000), 10);
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function (this: IUser): string {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  return resetToken;
};

const User = mongoose.model<IUser, IUserModel>('User', userSchema);
export default User;