import mongoose, { Schema, Document, Model, Query } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Interface for User document
export interface IUser extends Document {
  name: string;
  email: string;
  photo?: string;
  role: 'user' | 'seller' | 'admin' | 'superAdmin';
  password: string;
  passwordConfirm?: string | undefined;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean;
  correctPassword(candidatePassword: string, userPassword: string): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): boolean;
  createPasswordResetToken(): string;
}

// Interface for User query
interface UserQuery extends Query<IUser[], IUser> {
  includeInactive?: boolean;
}

// Interface for User model
interface IUserModel extends Model<IUser> {
  // Add static methods here if needed
}

const userSchema = new Schema<IUser, IUserModel>({
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
    validate: [validator.isEmail, 'Please provide a valid email'],
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
      validator: function (this: IUser, val: string | undefined): boolean {
        if (this.isNew && val === undefined) return false;
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
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// Middleware to update passwordChangedAt
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Middleware to exclude inactive users
userSchema.pre<UserQuery>(/^find/, function (next) {
  if (!this.getOptions().includeInactive) {
    this.find({ active: { $ne: false } });
  }
  this.select('-__v');
  next();
});

// Instance method to compare passwords
userSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password changed after token issuance
userSchema.methods.changedPasswordAfter = function (JWTTimestamp: number): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return resetToken;
};

// Create and export the User model
const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;
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