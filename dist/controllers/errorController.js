"use strict";
// src/controllers/errorController.ts (or globalErrorHandler.ts)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const appError_1 = __importDefault(require("../utils/appError")); // Import your AppError class
// --- Error Handling Functions ---
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: "${err.value}"`;
    return new appError_1.default(message, 400);
};
const handleDuplicateErrorDB = (err) => {
    let value;
    // Modern Mongoose errors usually have keyValue directly
    if (err.keyValue) {
        value = Object.values(err.keyValue).join(", ");
    }
    else if (err.errmsg) {
        // Fallback for older Mongoose or direct MongoDB errors
        const match = err.errmsg.match(/dup key: \{ : "([^"]+)" \}/) || err.errmsg.match(/(["])(\\?.)*?\1/);
        value = match ? match[0] : 'unknown value';
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1); // Remove quotes if present
        }
    }
    else {
        value = 'unknown';
    }
    const message = `Duplicate field value: "${value}". Please use another value.`;
    return new appError_1.default(message, 400);
};
const handleValidationErrorDB = (err) => {
    const errors = {}; // Store errors as key-value pairs
    Object.values(err.errors).forEach(val => {
        errors[val.path] = val.message;
    });
    const message = `Invalid input data. ${Object.values(errors).join('. ')}`; // More descriptive message
    return new appError_1.default(message, 400); // Pass errors as details
};
const handleJWTError = () => {
    return new appError_1.default('Invalid token. Please log in again!', 401);
};
const handleJWTExpiredError = () => {
    return new appError_1.default('Your token has expired! Please log in again.', 401);
};
// --- Development Error Response ---
const sendErrorDev = (err, res) => {
    res.status(err.statusCode || 500).json({
        status: err.status || 'error',
        error: err,
        message: err.message,
        stack: err.stack,
    });
};
// --- Production Error Response ---
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            status: err.status || 'error',
            message: err.message,
            errors: err.details || undefined, // Include details if available (e.g., for validation)
        });
        // Programming or other unknown error: don't leak error details
    }
    else {
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
const globalErrorHandler = (err, req, res, next) => {
    // Set default status code and status for the error
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    }
    else if (process.env.NODE_ENV === 'production') {
        // Create a copy of the error to avoid modifying the original
        let error = { ...err };
        error.name = err.name; // Copy name for type checking
        error.message = err.message; // Copy message
        error.stack = err.stack; // Copy stack
        // Handle specific error types
        if (error.name === 'CastError') {
            error = handleCastErrorDB(error);
        }
        if (error.code === 11000) {
            error = handleDuplicateErrorDB(error);
        }
        if (error.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
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
exports.default = globalErrorHandler;
//# sourceMappingURL=errorController.js.map