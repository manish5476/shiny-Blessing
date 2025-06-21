import { Request, Response, NextFunction } from 'express';
import User from '../models/UserModel';
import { catchAsync } from '../utils/catchAsyncModule';
import AppError from '../utils/appError';
import * as handleFactory from './handleFactory';

const filterObj = (obj: Record<string, any>, ...allowedFields: string[]) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => allowedFields.includes(key))
  );
};

const createSendToken = (user: any, statusCode: number, res: Response) => {
  res.status(statusCode).json({
    status: 'success',
    data: { user: user || null },
  });
};

// Middleware: /me -> /:id
export const getMe = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  req.params.id = req.user.id;
  next();
};

// PATCH /updateMe
export const updateMe = catchAsync(async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('Use dedicated password update route', 400));
  }

  const filteredBody = filterObj(req.body, 'name', 'email');
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  createSendToken(updatedUser, 200, res);
});

// DELETE /deleteMe
export const deleteMe = catchAsync(async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({ status: 'success', data: null });
});

// Generic CRUD operations
export const getAllUsers = handleFactory.getAll(User);
export const getUserById = handleFactory.getOne(User);
export const deleteUser = handleFactory.deleteOne(User);
export const updateUser = handleFactory.updateOne(User);

// const User = require("../Models/UserModel");
// const catchAsync = require("../utils/catchAsyncModule");
// const AppError = require("../utils/appError");
// const handleFactory = require("./handleFactory");

// const filterObj = (obj: { [s: string]: unknown; } | ArrayLike<unknown>, ...allowedFields: string[]) => {
//   return Object.fromEntries(
//     Object.entries(obj).filter(([key]) => allowedFields.includes(key))
//   );
// };

// const createSendToken = (user: any, statusCode: number, res: { status: (arg0: any) => { (): any; new(): any; json: { (arg0: { status: string; data: { user: any; }; }): void; new(): any; }; }; }) => {
//   res.status(statusCode).json({
//     status: "success",
//     data: { user: user || null },
//   });
// };

// exports.getMe = (req: { params: { id: any; }; user: { id: any; }; }, res: any, next: () => void) => {
//   req.params.id = req.user.id;
//   next();
// };

// exports.updateMe = catchAsync(async (req: { body: { [s: string]: unknown; } | ArrayLike<unknown>; user: { id: any; }; }, res: any, next: (arg0: any) => any) => {
//   if (req.body?.password || req.body?.passwordConfirm) {
//     return next(new AppError("Use dedicated password update route", 400));
//   }

//   const filteredBody = filterObj(req.body, "name", "email");
//   const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
//     new: true,
//     runValidators: true,
//   });

//   createSendToken(updatedUser, 200, res);
// });

// exports.deleteMe = catchAsync(async (req: { user: { id: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { status: string; data: null; }): void; new(): any; }; }; }, next: any) => {
//   await User.findByIdAndUpdate(req.user.id, { active: false });
//   res.status(204).json({ status: "success", data: null });
// });

// // Factory handlers
// exports.getAllUsers = handleFactory.getAll(User);
// exports.getUserById = handleFactory.getOne(User);
// exports.deleteUser = handleFactory.deleteOne(User);
// exports.updateUser = handleFactory.updateOne(User);
