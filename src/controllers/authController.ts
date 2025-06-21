import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { Secret, JwtPayload as DefaultJwtPayload } from 'jsonwebtoken';
import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// Import your User Model and IUser interface

import { catchAsync } from '../utils/catchAsyncModule';
// import AppError from '../Utils/appError';
import User, { IUser } from '../models/UserModel';
import { sendEmail } from '../utils/email';
import AppError from '@utils/appError';

// --- Logger configuration ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/auth.log', level: 'info' }),
  ]
});

// --- JWT Cookie Options ---
interface CookieOptions {
  expires: Date;
  httpOnly: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none'; // 'none' requires secure: true
}
const jwtCookieExpiresInMs = Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000;

let cookieExpiresIn: number;
if (isNaN(jwtCookieExpiresInMs) || jwtCookieExpiresInMs <= 0) {
  logger.error('Invalid JWT_COOKIE_EXPIRES_IN environment variable. Using default of 90 days.');
  cookieExpiresIn = 90 * 24 * 60 * 60 * 1000; // Default to 90 days if invalid
} else {
  cookieExpiresIn = jwtCookieExpiresInMs;
}

const cookieOptions: CookieOptions = {
  expires: new Date(Date.now() + cookieExpiresIn),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

// --- JWT Token Signing ---
const signToken = (id: mongoose.Types.ObjectId): string => {
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET environment variable is not defined!');
    throw new AppError('Server configuration error: JWT secret not found.', 500);
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  } as jwt.SignOptions);
};

// --- Create and Send Token Helper ---
const createSendToken = (user: IUser, statusCode: number, res: Response): void => {
  const token = signToken(user._id as mongoose.Types.ObjectId); // Explicitly cast _id to ObjectId
  res.cookie('jwt', token, cookieOptions);

  // Remove password from the user object sent in the response
  user.password = undefined as any; // Type assertion needed for strict mode

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user: userData },
  });
};

// --- Extend Express Request to include authenticated user ---
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// --- Custom JwtPayload Interface (for decoded token) ---
interface CustomJwtPayload extends DefaultJwtPayload {
  id: string; // Our JWT payload specifically has an 'id' field
}

// --- Controller Functions ---

export const signup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, passwordConfirm, role } = req.body;

  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role,
  });

  logger.info(`User Signed Up: UserID: ${newUser._id}, Email: ${newUser.email}, Role: ${newUser.role}, IP: ${req.ip}`);
  createSendToken(newUser, 201, res);
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  // Corrected: Pass both candidatePassword and userPassword (the hashed one from DB)
  if (!user || !(await user.correctPassword(password, user.password))) {
    logger.warn(`Failed Login Attempt: Email: ${email}, IP: ${req.ip}`);
    return next(new AppError('Invalid email or password', 401));
  }

  logger.info(`User Logged In: UserID: ${user._id}, Email: ${user.email}, Role: ${user.role}, IP: ${req.ip}`);

  createSendToken(user, 200, res);
});


export const protect = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1) Get token from headers (e.g., Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1].replace(/['"]+/g, '');
  }
  // Optional: Check cookies for the token if not in headers (e.g., for SSR)
  // else if (req.cookies && req.cookies.jwt) {
  //   token = req.cookies.jwt;
  // }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verify token
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET environment variable is not defined!');
    return next(new AppError('Server configuration error: JWT secret not found.', 500));
  }

  let decoded: CustomJwtPayload;
  try {
    // Manual promisification of jwt.verify
    decoded = await new Promise<CustomJwtPayload>((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET as Secret, (err, result) => {
        if (err) {
          return reject(err);
        }
        // jwt.verify can return string | object | undefined based on options/token validity.
        // We expect an object payload here.
        if (typeof result === 'string' || !result) {
          return reject(new jwt.JsonWebTokenError('Invalid token: expected object payload.'));
        }
        resolve(result as CustomJwtPayload); // Assert to our CustomJwtPayload
      });
    });

  } catch (err: any) {
    if (err instanceof jwt.JsonWebTokenError) {
      logger.warn(`JWT Error: ${err.message}, Token: ${token}, IP: ${req.ip}`);
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    // Handle other potential errors during verification (e.g., network, unexpected)
    return next(new AppError('Authentication error. Please try again.', 500));
  }

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4) Check if user changed password after token was issued
  // `decoded.iat` is the 'issued at' timestamp in seconds
  if (currentUser.changedPasswordAfter(decoded.iat!)) { // `iat` is guaranteed by JwtPayload but `!` asserts it's not undefined
    return next(new AppError('Password changed recently. Please log in again.', 401));
  }

  // 5) Grant access: Attach the user to the request object
  req.user = currentUser;
  res.locals.user = currentUser; // Useful for passing user to views/other middleware
  next();
});

// --- Role Restriction Middleware ---
export const restrictTo = (...roles: Array<IUser['role']>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required to check roles.', 401));
    }

    if (req.user.role === 'superAdmin') {
      return next(); // Super admin bypasses all restrictions
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// --- Password Reset ---
export const forgotPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email address.', 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Save user with new token, bypassing other validations

  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err: any) {
    logger.error(`Error sending password reset email to ${user.email}: ${err.message}`);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false }); // Clear tokens on error

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

export const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm; // Essential for pre-save validation
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save(); // This will trigger password hashing and validation

  createSendToken(user, 200, res);
});

export const updateUserPassword = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required to update password.', 401));
  }

  const user = await User.findById(req.user.id).select('+password'); // Use req.user.id (virtual) or req.user._id

  if (!user) {
    return next(new AppError('User not found. Please log in again.', 404));
  }

  if (!(await user.correctPassword(req.body.currentPassword,user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save(); // Triggers password hashing and `passwordChangedAt` update

  createSendToken(user, 200, res);
});

export const logout = (req: Request, res: Response, next: NextFunction) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};





















































// import { promisify } from 'util';
// import crypto from 'crypto';
// import bcrypt from 'bcryptjs';
// import jwt, { Secret, JwtPayload as DefaultJwtPayload } from 'jsonwebtoken';
// import winston from 'winston';
// import { Request, Response, NextFunction } from 'express';

// // Import your User Model and IUser interface
// import User, { IUser, IUserModel } from '../models/UserModel'; // Ensure IUserModel is also exported if needed for static methods
// import { catchAsync } from '../utils/catchAsyncModule';
// import AppError from '../Utils/appError';
// import { sendEmail } from '../utils/email';
// import mongoose from 'mongoose';

// // --- Logger configuration ---
// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.json()
//   ),
//   transports: [
//     new winston.transports.File({ filename: 'logs/auth.log', level: 'info' }),
//     // In production, consider adding Console transport for real-time monitoring
//     // new winston.transports.Console()
//   ]
// });

// // --- JWT Cookie Options ---
// interface CookieOptions {
//   expires: Date;
//   httpOnly: boolean;
//   secure?: boolean; // Secure is optional based on NODE_ENV
//   sameSite?: 'lax' | 'strict' | 'none'; // Add sameSite for better security/compatibility
// }

// // Extend default payload to include our custom fields
// interface CustomJwtPayload extends DefaultJwtPayload {
//   id: string;
// }

// // Extend Express Request to include authenticated user
// interface AuthenticatedRequest extends Request {
//   user?: IUser;
// }

// const jwtCookieExpiresInMs = Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000;
// if (isNaN(jwtCookieExpiresInMs) || jwtCookieExpiresInMs <= 0) {
//   logger.error('Invalid JWT_COOKIE_EXPIRES_IN environment variable. Please set a positive number.');
//   // Fallback to a default or throw an error to prevent server startup
//   // For now, let's just default to 90 days if invalid.
//   process.env.JWT_COOKIE_EXPIRES_IN = '90';
//   // Recalculate with fallback
//   const fallbackExpiresIn = Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000;
//   // We'll use this for the cookie options, but log the issue
//   // In a real app, you might want to terminate the process or use a more robust default.
// }

// const cookieOptions: CookieOptions = {
//   expires: new Date(Date.now() + jwtCookieExpiresInMs),
//   httpOnly: true,
//   // Only set secure to true in production. It should be false for local HTTP development.
//   secure: process.env.NODE_ENV === 'production',
//   // Consider adding `sameSite: 'lax'` or `'none'` if you have cross-origin requests
//   // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 'none' requires secure: true
// };

// // --- JWT Token Signing ---
// const signToken = (id: mongoose.Types.ObjectId): string => { // Changed id to mongoose.Types.ObjectId
//   // Ensure JWT_SECRET is defined
//   if (!process.env.JWT_SECRET) {
//     logger.error('JWT_SECRET environment variable is not defined!');
//     throw new AppError('Server configuration error: JWT secret not found.', 500);
//   }
//   return jwt.sign({ id }, process.env.JWT_SECRET, { // No '!' needed if checked above
//     expiresIn: process.env.JWT_EXPIRES_IN || '90d',
//   } as jwt.SignOptions); // Assert to jwt.SignOptions for clarity, though often inferred
// };


// // --- Create and Send Token Helper ---
// // `user: IUser` now ensures we have type safety
// const createSendToken = (user: IUser, statusCode: number, res: Response): void => {
//   const token = signToken(user._id as mongoose.Types.ObjectId);
//   res.cookie('jwt', token, cookieOptions);
//   user.password = undefined as any;
//   const userData = {
//     _id: user._id,
//     name: user.name,
//     email: user.email,
//     role: user.role,
//   };

//   res.status(statusCode).json({
//     status: 'success',
//     token,
//     data: { user: userData },
//   });
// };

// // --- Extend Request Interface for req.user ---
// // This is critical for the `protect` and `restrictTo` middleware.
// interface AuthenticatedRequest extends Request {
//   user?: IUser; // The authenticated user object
// }

// // --- Controller Functions ---

// export const signup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//   const { name, email, password, passwordConfirm, role } = req.body;

//   if (password !== passwordConfirm) {
//     return next(new AppError('Passwords do not match', 400));
//   }

//   // Ensure role is a valid type if provided, otherwise it will default by schema
//   const newUser = await User.create({
//     name,
//     email,
//     password,
//     passwordConfirm, // This will be handled by the pre-save hook in UserModel
//     role, // If role is provided in req.body, otherwise schema default applies
//   });

//   logger.info(`User Signed Up: UserID: ${newUser._id}, Email: ${newUser.email}, Role: ${newUser.role}, IP: ${req.ip}`);
//   createSendToken(newUser, 201, res);
// });

// export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return next(new AppError('Please provide email and password', 400));
//   }

//   // Use `select('+password')` to include the password for comparison
//   const user = await User.findOne({ email }).select('+password');

//   // If user not found or password incorrect
//   // Use `user.correctPassword` instance method for comparison
//   if (!user || !(await user.correctPassword(password))) {
//     logger.warn(`Failed Login Attempt: Email: ${email}, IP: ${req.ip}`);
//     return next(new AppError('Invalid email or password', 401));
//   }

//   logger.info(`User Logged In: UserID: ${user._id}, Email: ${user.email}, Role: ${user.role}, IP: ${req.ip}`);

//   createSendToken(user, 200, res);
// });

// // --- JWT Payload Interface ---
// // --- JWT Payload Interface ---
// interface JwtPayload {
//   id: string; // The user ID stored in the JWT
//   iat: number; // Issued at timestamp
//   exp: number; // Expiration timestamp
// }

// // --- Custom promisified verify function ---
// // This function explicitly matches the signature that `promisify` expects
// // (arg1, arg2, callback) => void
// const jwtVerifyPromisified = (
//   token: string,
//   secretOrPublicKey: Secret, // jwt.verify expects Secret type
//   // options?: VerifyOptions, // If you need options, you'd add them here
//   callback: (err: jwt.VerifyErrors | null, decoded: JwtPayload | undefined) => void
// ) => {

//   jwt.verify(token, secretOrPublicKey, (err: any, decoded: any) => {
//     // Cast decoded to JwtPayload if it's not undefined
//     callback(err, decoded as JwtPayload);
//   });
// };

// export const protect = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   let token: string | undefined;

//   // 1) Get token from headers (e.g., Bearer <token>)
//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     token = req.headers.authorization.split(' ')[1].replace(/['"]+/g, '');
//   }

//   if (!token) {
//     return next(new AppError('You are not logged in! Please log in to get access.', 401));
//   }

//   // 2) Verify token
//   if (!process.env.JWT_SECRET) {
//     logger.error('JWT_SECRET environment variable is not defined!');
//     return next(new AppError('Server configuration error: JWT secret not found.', 500));
//   }

//   let decoded: CustomJwtPayload;
//   try {
//     const decodedResult = await promisify(jwtVerifyPromisified)(token, process.env.JWT_SECRET);
//     if (!decodedResult) {
//       return next(new AppError('Invalid token. No payload returned.', 401));
//     }
//     decoded = decodedResult;
//   } catch (err: any) {
//     if (err instanceof jwt.JsonWebTokenError) {
//       logger.warn(`JWT Error: ${err.message}, Token: ${token}, IP: ${req.ip}`);
//       return next(new AppError('Invalid token. Please log in again.', 401));
//     }
//     return next(new AppError('Authentication error. Please try again.', 500));
//   }

//   // 3) Check if user still exists
//   const currentUser = await User.findById(decoded.id);
//   if (!currentUser) {
//     return next(new AppError('The user belonging to this token no longer exists.', 401));
//   }

//   // 4) Check if user changed password after token was issued
//   if (currentUser.changedPasswordAfter(decoded.iat!)) {
//     return next(new AppError('Password changed recently. Please log in again.', 401));
//   }

//   // 5) Grant access
//   req.user = currentUser;
//   res.locals.user = currentUser;
//   next();
// });

// // export const protect = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //   let token: string | undefined;

// //   // 1) Get token from headers
// //   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
// //     token = req.headers.authorization.split(' ')[1].replace(/['"]+/g, ''); // Clean quotes
// //   }
// //   // You might also check cookies for the token if not in headers
// //   // else if (req.cookies.jwt) {
// //   //   token = req.cookies.jwt;
// //   // }

// //   if (!token) {
// //     return next(new AppError('You are not logged in! Please log in to get access.', 401));
// //   }

// //   // 2) Verify token
// //   if (!process.env.JWT_SECRET) {
// //     logger.error('JWT_SECRET environment variable is not defined during token verification!');
// //     return next(new AppError('Server configuration error: JWT secret not found.', 500));
// //   }

// //   let decoded: JwtPayload;
// //   try {
// //     decoded = await promisify<string, string, JwtPayload>(jwt.verify)(token, process.env.JWT_SECRET);
// //   } catch (err: any) {
// //     if (err instanceof jwt.JsonWebTokenError) {
// //       logger.warn(`JWT Error: ${err.message}, Token: ${token}, IP: ${req.ip}`);
// //       return next(new AppError('Invalid token. Please log in again.', 401));
// //     }
// //     // Handle other potential errors during verification
// //     return next(new AppError('Authentication error. Please try again.', 500));
// //   }

// //   // 3) Check if user still exists
// //   // decoded.id is the user ID from the token, which should be an ObjectId compatible string.
// //   const currentUser = await User.findById(decoded.id);
// //   if (!currentUser) {
// //     return next(new AppError('The user belonging to this token no longer exists.', 401));
// //   }

// //   // 4) Check if user changed password after the token was issued
// //   // The `changedPasswordAfter` method expects `JWTTimestamp` in seconds, which `decoded.iat` provides.
// //   if (currentUser.changedPasswordAfter(decoded.iat)) {
// //     return next(new AppError('Password changed recently. Please log in again.', 401));
// //   }

// //   // 5) Grant access to protected route
// //   // Attach the user to the request object for subsequent middleware/route handlers
// //   req.user = currentUser;
// //   res.locals.user = currentUser; // Often useful for template rendering or other middleware
// //   next();
// // });

// // --- Role Restriction Middleware ---
// export const restrictTo = (...roles: Array<IUser['role']>) => { // Type roles array
//   return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) { // Use req.user directly due to AuthenticatedRequest
//       return next(new AppError('Authentication required to check roles.', 401));
//     }

//     // Super admin bypasses all role restrictions
//     if (req.user.role === 'superAdmin') {
//       return next();
//     }

//     // Check if the user's role is included in the allowed roles
//     if (!roles.includes(req.user.role)) {
//       return next(new AppError('You do not have permission to perform this action', 403));
//     }
//     next();
//   };
// };

// // --- Password Reset and Update ---
// export const forgotPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//   const user = await User.findOne({ email: req.body.email });
//   if (!user) {
//     return next(new AppError('There is no user with this email address.', 404));
//   }

//   const resetToken = user.createPasswordResetToken(); // This method updates the user document
//   // Only save passwordResetToken and passwordResetExpires, bypass other validations
//   await user.save({ validateBeforeSave: false });

//   const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
//   const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

//   try {
//     await sendEmail({
//       email: user.email,
//       subject: 'Your password reset token (valid for 10 min)',
//       message,
//     });

//     res.status(200).json({
//       status: 'success',
//       message: 'Token sent to email!',
//     });
//   } catch (err: any) { // Catch block should type error if possible
//     logger.error(`Error sending password reset email to ${user.email}: ${err.message}`);
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save({ validateBeforeSave: false }); // Save without validation to clear tokens

//     return next(new AppError('There was an error sending the email. Try again later!', 500));
//   }
// });

// export const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//   // Hash the token received from params
//   const hashedToken = crypto
//     .createHash('sha256')
//     .update(req.params.token)
//     .digest('hex');

//   // Find user with the hashed token and ensure it's not expired
//   const user = await User.findOne({
//     passwordResetToken: hashedToken,
//     passwordResetExpires: { $gt: Date.now() },
//   });

//   if (!user) {
//     return next(new AppError('Token is invalid or has expired', 400));
//   }

//   // Set new password and confirm it (pre-save hook will hash it and validate)
//   // Ensure passwordConfirm is also set for validation in the model
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm; // This must be passed for model validation

//   // Clear reset token fields
//   user.passwordResetToken = undefined;
//   user.passwordResetExpires = undefined;

//   // Save the user; this will trigger the pre-save hook for password hashing and validation
//   await user.save(); // `validateBeforeSave: true` by default here, which is desired.

//   createSendToken(user, 200, res);
// });

// export const updateUserPassword = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   // Ensure req.user is available from the `protect` middleware
//   if (!req.user) {
//     return next(new AppError('Authentication required to update password.', 401));
//   }

//   // Select password to enable comparison
//   const user = await User.findById(req.user.id).select('+password'); // Use req.user.id (string virtual) for convenience or req.user._id (ObjectId)

//   if (!user) { // This should ideally not happen if req.user is populated correctly.
//     return next(new AppError('User not found. Please log in again.', 404));
//   }

//   // Check if current password is correct
//   if (!(await user.correctPassword(req.body.currentPassword))) {
//     return next(new AppError('Your current password is wrong.', 401));
//   }

//   // Update password and passwordConfirm (pre-save hook will hash and validate)
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm; // Crucial for schema validation

//   // Save the user; this triggers the pre-save hook for hashing and `passwordChangedAt` update.
//   await user.save(); // `validateBeforeSave: true` by default.

//   createSendToken(user, 200, res);
// });

// // Logout functionality (optional, but good to have)
// export const logout = (req: Request, res: Response, next: NextFunction) => {
//   res.cookie('jwt', 'loggedout', {
//     expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
//     httpOnly: true,
//   });
//   res.status(200).json({ status: 'success' });
// };