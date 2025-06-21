// src/controllers/errorController.ts (or globalErrorHandler.ts)

import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError'; // Import your AppError class

// --- Type Definitions for Mongoose & JWT Errors ---

// Extend Error interface for common properties
interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number; // For MongoDB duplicate key errors (e.g., 11000)
  keyValue?: Record<string, any>; // For duplicate key errors
  errors?: Record<string, any>; // For validation errors
  path?: string; // For CastError
  value?: any; // For CastError
  errmsg?: string; // Old Mongoose error message for duplicates (less common now)
  details?: Record<string, any>; // For custom AppError details
}

// Mongoose CastError type
interface MongooseCastError extends CustomError {
  name: 'CastError';
  path: string;
  value: any;
}

// Mongoose Duplicate Key Error type (MongoDB error code 11000)
interface MongooseDuplicateKeyError extends CustomError {
  code: 11000;
  keyValue: Record<string, any>;
  // For older Mongoose versions or direct MongoDB errors, might have errmsg
  errmsg?: string; // Example: "E11000 duplicate key error collection: mydb.users index: email_1 dup key: { email: \"test@example.com\" }"
}

// Mongoose ValidationError type
interface MongooseValidationError extends CustomError {
  name: 'ValidationError';
  errors: {
    [key: string]: {
      name: string;
      message: string;
      path: string;
      kind: string;
      value: any;
    };
  };
}

// JWT Errors
interface JsonWebTokenError extends CustomError {
  name: 'JsonWebTokenError';
}

interface TokenExpiredError extends CustomError {
  name: 'TokenExpiredError';
}

// --- Error Handling Functions ---

const handleCastErrorDB = (err: MongooseCastError): AppError => {
  const message = `Invalid ${err.path}: "${err.value}"`;
  return new AppError(message, 400);
};

const handleDuplicateErrorDB = (err: MongooseDuplicateKeyError): AppError => {
  let value: string;
  // Modern Mongoose errors usually have keyValue directly
  if (err.keyValue) {
    value = Object.values(err.keyValue).join(", ");
  } else if (err.errmsg) {
    // Fallback for older Mongoose or direct MongoDB errors
    const match = err.errmsg.match(/dup key: \{ : "([^"]+)" \}/) || err.errmsg.match(/(["])(\\?.)*?\1/);
    value = match ? match[0] : 'unknown value';
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1); // Remove quotes if present
    }
  } else {
      value = 'unknown';
  }

  const message = `Duplicate field value: "${value}". Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err: MongooseValidationError): AppError => {
  const errors: Record<string, string> = {}; // Store errors as key-value pairs
  Object.values(err.errors).forEach(val => {
    errors[val.path] = val.message;
  });

  const message = `Invalid input data. ${Object.values(errors).join('. ')}`; // More descriptive message
  return new AppError(message, 400); // Pass errors as details
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again!', 401);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

// --- Development Error Response ---

const sendErrorDev = (err: CustomError, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// --- Production Error Response ---

const sendErrorProd = (err: CustomError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      message: err.message,
      errors: err.details || undefined, // Include details if available (e.g., for validation)
    });

  // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error('ERROR 💥', err); // Use a more distinct log for unhandled errors

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong from the server!',
    });
  }
};

// --- Global Error Handling Middleware ---

// The main error handling middleware function
const globalErrorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  // Set default status code and status for the error
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // Create a copy of the error to avoid modifying the original
    let error = { ...err };
    error.name = err.name; // Copy name for type checking
    error.message = err.message; // Copy message
    error.stack = err.stack; // Copy stack

    // Handle specific error types
    if (error.name === 'CastError') {
        error = handleCastErrorDB(error as MongooseCastError);
    }
    if (error.code === 11000) {
        error = handleDuplicateErrorDB(error as MongooseDuplicateKeyError);
    }
    if (error.name === 'ValidationError') {
        error = handleValidationErrorDB(error as MongooseValidationError);
    }
    if (error.name === 'JsonWebTokenError') {
        error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
        error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

export default globalErrorHandler;