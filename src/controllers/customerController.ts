import { Request, Response, NextFunction } from 'express';
import Customer, { ICustomer, ICustomerModel, IPhoneNumber } from '../models/customerModel'; // Import Model and Interfaces
import {catchAsync} from '../utils/catchAsyncModule'; // Assuming this is now a TS module
import AppError from '../utils/appError';         // Assuming this is now a TS module
import { body, validationResult } from 'express-validator'; // For validation middleware
import multer from 'multer';                      // For file uploads
import * as handleFactory from './handleFactory'; // Import all from handleFactory

import { Types } from 'mongoose'; // For ObjectId type

const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
  const phoneNumbers = req.body.phoneNumbers;
  const userId = req.user._id;

  if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
    return next(new AppError('Phone numbers must be an array', 400));
  }
  const numbersToCheck = phoneNumbers.map((item) => item.number);

  const existingCustomer = await Customer.findOne({
    owner: userId,
    'phoneNumbers.number': { $in: numbersToCheck },
  });

  if (existingCustomer) {
    return next(new AppError(`Customer with phone number(s) ${numbersToCheck.join(', ')} already exists for this user.`, 400));
  }
  next();
});

exports.newCustomer = [
  body('email').isEmail().withMessage('Invalid email'),
  body('fullname').notEmpty().withMessage('Full name is required'),
  body('phoneNumbers.*.number').notEmpty().withMessage('Phone number is required'),
  catchAsync(async (req:any, res:any, next:any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array().map((e: { msg: any; }) => e.msg).join(', '), 400));
    }

    const { email, phoneNumbers, fullname, ...otherData } = req.body;
    const userId = req.user._id;

    let customer = await Customer.findOne({ email, owner: userId });

    if (customer) {
      if (customer.status === 'inactive') {
        customer = await Customer.findByIdAndUpdate(
          customer._id,
          { status: 'active', phoneNumbers, fullname, ...otherData },
          { new: true }
        );
        return res.status(200).json({
          status: 'success',
          statusCode: 200,
          message: 'Customer reactivated successfully',
          data: customer,
        });
      }
      return next(new AppError('Customer already active for this user.', 400));
    }

    customer = await Customer.create({
      email,
      phoneNumbers,
      fullname,
      ...otherData,
      owner: userId
    });

    res.status(201).json({
      status: 'success',
      message: 'Customer created successfully',
      data: customer,
    });
  }),
];

exports.getCustomerById = catchAsync(async (req:any, res:any, next:any) => {
  const userId = req.user._id;
  const customerId = req.params.id;

  let customer = await Customer.findById(customerId);
  if (!customer) return next(new AppError('Customer not found or you do not have permission.', 404));

  customer = await Customer.updateRemainingAmount(customer._id);
  if (!customer) return next(new AppError('Failed to update remaining amount', 500));

  res.status(200).json({
    status: 'success',
    statusCode: 200,
    data: customer,
  });
});

exports.getAllCustomers = handleFactory.getAll(Customer);
exports.updateCustomer = handleFactory.updateOne(Customer);
exports.deleteCustomer = handleFactory.deleteOne(Customer);

// exports.deactivateMultipleCustomers = catchAsync(async (req, res, next) => {
//   const ids = req.body.ids;
//   const userId = req.user._id;

//   if (!ids || !Array.isArray(ids) || ids.length === 0) {
//     return next(new AppError('No valid IDs provided for deactivation.', 400));
//   }

//   const result = await Customer.updateMany(
//     { _id: { $in: ids }, owner: userId },
//     { status: 'inactive' }
//   );

//   res.status(200).json({
//     status: 'success',
//     message: `${result.modifiedCount} customers deactivated successfully`,
//     data: { modifiedCount: result.modifiedCount }
//   });
// });