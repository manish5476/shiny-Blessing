import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const catchAsync = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (typeof fn !== 'function') {
      throw new Error('Handler must be a function');
    }
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
