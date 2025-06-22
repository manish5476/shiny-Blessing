"use strict";
// src/utils/appError.ts
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Custom error class for operational errors.
 * Provides a structured way to handle and respond to expected errors (e.g., validation failures, resource not found).
 */
class AppError extends Error {
    /**
     * Creates an instance of AppError.
     * @param {string} message - The error message.
     * @param {number} statusCode - The HTTP status code associated with the error.
     */
    constructor(message, statusCode) {
        super(message); // Call the parent Error constructor with the message
        this.message = message;
        this.statusCode = statusCode;
        // Determine the status ('fail' for 4xx, 'error' for 5xx)
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Mark as an operational error
        // Capture the stack trace, excluding the constructor call itself
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.default = AppError;
// class AppError extends Error {
//   public status: string;
//   public isOperational: boolean;
//   constructor(public message: string, public statusCode: number) {
//     super(message);
//     this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
//     this.isOperational = true;
//     Error.captureStackTrace(this, this.constructor);
//   }
// }
// export default AppError;
//# sourceMappingURL=appError.js.map