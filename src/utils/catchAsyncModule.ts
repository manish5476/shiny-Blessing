// src/utils/catchAsyncModule.ts

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Defines the type for an asynchronous Express middleware function.
 * @template Req - The type of the Express Request object, allowing for augmentation (e.g., `req.user`). Defaults to `express.Request`.
 */
export type AsyncHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<any>; // Functions are expected to be async and thus return a Promise

/**
 * A higher-order function that wraps an asynchronous Express middleware function.
 * It catches any errors thrown by the async function and passes them to the `next` middleware
 * (which typically routes to a global error handling middleware).
 *
 * @template Req - The type of the Express Request object that the wrapped function expects.
 * @param {AsyncHandler<Req>} fn - The asynchronous middleware function to wrap.
 * @returns {RequestHandler} An Express middleware function.
 */
export const catchAsync = <Req extends Request = Request>(fn: AsyncHandler<Req>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Call the asynchronous function. If it resolves, fine. If it rejects, catch the error
    // and pass it to the next middleware in the chain (Express's error handler).
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
};
// // src/utils/catchAsyncModule.ts
// import { Request, Response, NextFunction } from 'express';

// // Define a generic AsyncHandler type
// // Req extends Request = Request means Req is a type parameter that must extend Express.Request
// // If no specific Req is provided, it defaults to Express.Request
// export type AsyncHandler<Req extends Request = Request> = (
//   req: Req,
//   res: Response,
//   next: NextFunction
// ) => Promise<any>;

// // Make the catchAsync function generic as well
// // It infers the Req type from the fn parameter it receives
// export const catchAsync = <Req extends Request = Request>(fn: AsyncHandler<Req>) => {
//   return (req: Req, res: Response, next: NextFunction) => {
//     // No need for typeof fn check if fn is strictly typed as AsyncHandler
//     Promise.resolve(fn(req, res, next)).catch(next);
//   };
// };
// // import { Request, Response, NextFunction } from 'express';

// // export type AsyncHandler = (
// //   req: Request,
// //   res: Response,
// //   next: NextFunction
// // ) => Promise<any>;

// // export const catchAsync = (fn: AsyncHandler) => {
// //   return (req: Request, res: Response, next: NextFunction) => {
// //     if (typeof fn !== 'function') {
// //       throw new Error('Handler must be a function');
// //     }
// //     Promise.resolve(fn(req, res, next)).catch(next);
// //   };
// // };
