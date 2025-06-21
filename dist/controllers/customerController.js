"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerDropdown = exports.deleteMultipleCustomer = exports.deleteCustomer = exports.updateCustomer = exports.getCustomerById = exports.getAllCustomer = exports.newCustomer = exports.findDuplicateCustomer = void 0;
const express_validator_1 = require("express-validator");
const customerModel_1 = __importDefault(require("../models/customerModel"));
const handleFactory = __importStar(require("./handleFactory"));
const catchAsyncModule_1 = require("../utils/catchAsyncModule");
const appError_1 = __importDefault(require("../utils/appError"));
exports.findDuplicateCustomer = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    if (!req.user) {
        return next(new appError_1.default('Authentication required', 401));
    }
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';
    let filter = { email: req.body.email };
    // if (!isSuperAdmin) {
    //   filter.owner = userId;
    // }
    const existingCustomer = await customerModel_1.default.findOne(filter);
    if (existingCustomer) {
        const message = `Customer with email ${req.body.email} already exists` +
            (!isSuperAdmin ? ' for your account.' : '.');
        return next(new appError_1.default(message, 400));
    }
    next();
});
exports.newCustomer = [
    (0, express_validator_1.body)('fullname')
        .notEmpty()
        .withMessage('Full name is required')
        .isString()
        .withMessage('Full name must be a string'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone')
        .optional()
        .isString()
        .withMessage('Phone must be a string'),
    (0, express_validator_1.body)('address')
        .optional()
        .isString()
        .withMessage('Address must be a string'),
    (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
        if (!req.user) {
            return next(new appError_1.default('Authentication required', 401));
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return next(new appError_1.default(errors.array().map((e) => e.msg).join(', '), 400));
        }
        const { fullname, email, phone, address } = req.body;
        const userId = req.user._id;
        let customer = null;
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    customer = data.data;
                },
            }),
        };
        await handleFactory.newOne(customerModel_1.default, false)({ ...req, body: { fullname, email, phone, address, owner: userId } }, mockRes, next);
        if (!customer) {
            return next(new appError_1.default('Failed to create customer', 500));
        }
        res.status(201).json({
            status: 'success',
            statusCode: 201,
            message: 'Customer created successfully',
            data: customer,
        });
    }),
];
exports.getAllCustomer = handleFactory.getAll(customerModel_1.default, false);
exports.getCustomerById = handleFactory.getOne(customerModel_1.default, undefined, false);
exports.updateCustomer = handleFactory.updateOne(customerModel_1.default, false);
exports.deleteCustomer = handleFactory.deleteOne(customerModel_1.default, false);
exports.deleteMultipleCustomer = handleFactory.deleteMultiple(customerModel_1.default, false);
exports.getCustomerDropdown = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const customers = await customerModel_1.default.find().select('fullname _id').lean();
    res.status(200).json({
        status: 'success',
        data: customers.map(c => ({ id: c._id, label: c.fullname })),
    });
});
// import { Request, Response, NextFunction } from 'express';
// import Customer, { ICustomer, ICustomerModel, IPhoneNumber } from '../models/customerModel';
// import { catchAsync } from '../utils/catchAsyncModule';
// import AppError from '../utils/appError';
// import { body, validationResult } from 'express-validator';
// import * as handleFactory from './handleFactory';
// import { Types } from 'mongoose';
// import { IUser } from '../models/UserModel';
// // Extend Request to include user from authController
// interface AuthenticatedRequest extends Request {
//   user?: IUser;
// }
// export const findDuplicateCustomer = catchAsync(
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const phoneNumbers: IPhoneNumber[] = req.body.phoneNumbers;
//     if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
//       return next(new AppError('Phone numbers must be an array', 400));
//     }
//     const numbersToCheck = phoneNumbers
//       .map((item) => item.number)
//       .filter((num) => typeof num === 'string');
//     if (numbersToCheck.length === 0) {
//       return next(new AppError('No valid phone numbers provided', 400));
//     }
//     const existingCustomer = await Customer.findOne({
//       'phoneNumbers.number': { $in: numbersToCheck },
//     });
//     if (existingCustomer) {
//       return next(
//         new AppError(
//           `Customer with phone number(s) ${numbersToCheck.join(', ')} already exists.`,
//           400
//         )
//       );
//     }
//     next();
//   }
// );
// export const newCustomer = [
//   body('email').optional().isEmail().withMessage('Invalid email'),
//   body('fullname').notEmpty().withMessage('Full name is required'),
//   body('phoneNumbers')
//     .optional()
//     .isArray()
//     .withMessage('Phone numbers must be an array')
//     .custom((value, { req }) => {
//       if (!req.body.guaranteerId && (!value || value.length === 0)) {
//         throw new Error('At least one phone number is required unless a guarantor is provided');
//       }
//       return true;
//     }),
//   body('phoneNumbers.*.number')
//     .notEmpty()
//     .withMessage('Phone number is required')
//     .matches(/^\+?[1-9]\d{1,14}$/)
//     .withMessage('Invalid phone number format'),
//   body('phoneNumbers.*.type')
//     .optional()
//     .isIn(['home', 'work', 'mobile', 'other'])
//     .withMessage('Invalid phone number type'),
//   body('phoneNumbers.*.isPrimary').optional().isBoolean().withMessage('isPrimary must be a boolean'),
//   body('addresses.*.street').optional().notEmpty().withMessage('Street is required'),
//   body('addresses.*.city').optional().notEmpty().withMessage('City is required'),
//   body('addresses.*.state').optional().notEmpty().withMessage('State is required'),
//   body('addresses.*.pincode')
//     .optional()
//     .matches(/^\d{6}$/)
//     .withMessage('PIN code must be a 6-digit number'),
//   body('addresses.*.country').optional().notEmpty().withMessage('Country is required'),
//   body('guaranteerId').optional().isMongoId().withMessage('Invalid guarantor ID'),
//   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError(errors.array().map((e) => e.msg).join(', '), 400));
//     }
//     const { email, phoneNumbers, fullname, addresses, status, cart, paymentHistory, totalPurchasedAmount, remainingAmount,guaranteerId, ...otherData } = req.body;
//     let customer = await Customer.findOne({ email: email || undefined });
//     if (customer) {
//       if (customer.status === 'inactive') {
//         customer = await Customer.findByIdAndUpdate(
//           customer._id,
//           {
//             status: 'active',
//             phoneNumbers,
//             fullname,
//             addresses,
//             cart,
//             paymentHistory,
//             totalPurchasedAmount,
//             remainingAmount,
//             guaranteerId,
//             ...otherData,
//           },
//           { new: true, runValidators: true }
//         );
//         return res.status(200).json({
//           status: 'success',
//           statusCode: 200,
//           message: 'Customer reactivated successfully',
//           data: customer,
//         });
//       }
//       return next(new AppError('Customer already active.', 400));
//     }
//     customer = await Customer.create({
//       email,
//       phoneNumbers,
//       fullname,
//       addresses,
//       status,
//       cart,
//       paymentHistory,
//       totalPurchasedAmount,
//       remainingAmount,
//       guaranteerId,
//       ...otherData,
//     });
//     res.status(201).json({
//       status: 'success',
//       statusCode: 201,
//       message: 'Customer created successfully',
//       data: customer,
//     });
//   }),
// ];
// export const getCustomerById = catchAsync(
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return next(new AppError('Authentication required', 401));
//     }
//     const customerId = req.params.id;
//     if (!Types.ObjectId.isValid(customerId)) {
//       return next(new AppError('Invalid customer ID', 400));
//     }
//     let customer: ICustomer | null = await Customer.findById(customerId);
//     if (!customer) {
//       return next(new AppError('Customer not found', 404));
//     }
//     customer = await Customer.updateRemainingAmount(new Types.ObjectId(customerId));
//     if (!customer) {
//       return next(new AppError('Failed to update remaining amount', 500));
//     }
//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       message: 'Customer retrieved successfully',
//       data: customer,
//     });
//   }
// );
// export const getAllCustomers = handleFactory.getAll(Customer, false);
// export const updateCustomer = handleFactory.updateOne(Customer, false);
// export const deleteCustomer = handleFactory.deleteOne(Customer, false);
// export const deleteMultipleCustomer = handleFactory.deleteMultiple(Customer, false);
// export const getCustomerDropdown = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   const customers = await Customer.find().select('fullname _id').lean();
//   res.status(200).json({
//     status: 'success',
//     data: customers.map(c => ({ id: c._id, label: c.fullname })),
//   });
// });
// export const deactivateMultipleCustomers = catchAsync(
//   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return next(new AppError('Authentication required', 401));
//     }
//     const { ids } = req.body;
//     if (!ids || !Array.isArray(ids) || ids.length === 0) {
//       return next(new AppError('No valid IDs provided for deactivation.', 400));
//     }
//     const validIds = ids
//       .filter((id: string) => Types.ObjectId.isValid(id))
//       .map((id: string) => new Types.ObjectId(id));
//     if (validIds.length === 0) {
//       return next(new AppError('No valid ObjectIds provided.', 400));
//     }
//     const result = await Customer.updateMany(
//       { _id: { $in: validIds } },
//       { status: 'inactive' },
//       { runValidators: true }
//     );
//     if (result.modifiedCount === 0) {
//       return next(new AppError('No customers found', 404));
//     }
//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       message: `${result.modifiedCount} customer(s) deactivated successfully`,
//       data: { modifiedCount: result.modifiedCount },
//     });
//   }
// );
// // import { Request, Response, NextFunction } from 'express';
// // import Customer, { ICustomer, ICustomerModel, IPhoneNumber } from '../models/customerModel';
// // import { catchAsync } from '../utils/catchAsyncModule';
// // import AppError from '../utils/appError';
// // import { body, validationResult } from 'express-validator';
// // import * as handleFactory from './handleFactory';
// // import { Types } from 'mongoose';
// // import { IUser } from '../models/UserModel';
// // // Extend Request to include user from authController
// // interface AuthenticatedRequest extends Request {
// //   user?: IUser;
// // }
// // export const findDuplicateCustomer = catchAsync(
// //   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     if (!req.user) {
// //       return next(new AppError('Authentication required', 401));
// //     }
// //     const phoneNumbers: IPhoneNumber[] = req.body.phoneNumbers;
// //     const userId = req.user._id;
// //     if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
// //       return next(new AppError('Phone numbers must be an array', 400));
// //     }
// //     const numbersToCheck = phoneNumbers
// //       .map((item) => item.number)
// //       .filter((num) => typeof num === 'string');
// //     if (numbersToCheck.length === 0) {
// //       return next(new AppError('No valid phone numbers provided', 400));
// //     }
// //     const existingCustomer = await Customer.findOne({
// //       owner: userId,
// //       'phoneNumbers.number': { $in: numbersToCheck },
// //     });
// //     if (existingCustomer) {
// //       return next(
// //         new AppError(
// //           `Customer with phone number(s) ${numbersToCheck.join(', ')} already exists.`,
// //           400
// //         )
// //       );
// //     }
// //     next();
// //   }
// // );
// // export const newCustomer = [
// //   body('email').isEmail().withMessage('Invalid email'),
// //   body('fullname').notEmpty().withMessage('Full name is required'),
// //   body('phoneNumbers.*.number').notEmpty().withMessage('Phone number is required'),
// //   body('phoneNumbers.*.label').optional().isString().withMessage('Label must be a string'),
// //   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     if (!req.user) {
// //       return next(new AppError('Authentication required', 401));
// //     }
// //     const errors = validationResult(req);
// //     if (!errors.isEmpty()) {
// //       return next(new AppError(errors.array().map((e) => e.msg).join(', '), 400));
// //     }
// //     const { email, phoneNumbers, fullname, ...otherData } = req.body;
// //     const userId = req.user._id;
// //     let customer: ICustomer | null = await Customer.findOne({ email, owner: userId });
// //     if (customer) {
// //       if (customer.status === 'inactive') {
// //         customer = await Customer.findByIdAndUpdate(
// //           customer._id,
// //           { status: 'active', phoneNumbers, fullname, ...otherData },
// //           { new: true, runValidators: true }
// //         );
// //         return res.status(200).json({
// //           status: 'success',
// //           statusCode: 200,
// //           message: 'Customer reactivated successfully',
// //           data: customer,
// //         });
// //       }
// //       return next(new AppError('Customer already active for this user.', 400));
// //     }
// //     // Use handleFactory.newOne for creation
// //     const createCustomer = handleFactory.newOne(Customer, true);
// //     await createCustomer(
// //       { ...req, body: { email, phoneNumbers, fullname, ...otherData } },
// //       res,
// //       next
// //     );
// //   }),
// // ];
// // export const getCustomerById = catchAsync(
// //   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     if (!req.user) {
// //       return next(new AppError('Authentication required', 401));
// //     }
// //     const userId = req.user._id;
// //     const customerId = req.params.id;
// //     if (!Types.ObjectId.isValid(customerId)) {
// //       return next(new AppError('Invalid customer ID', 400));
// //     }
// //     let customer = await Customer.findOne({ _id: customerId, owner: userId });
// //     if (!customer) {
// //       return next(new AppError('Customer not found or unauthorized', 404));
// //     }
// //     customer = await Customer.updateRemainingAmount(new Types.ObjectId(customerId));
// //     if (!customer) {
// //       return next(new AppError('Failed to update remaining amount', 500));
// //     }
// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       message: 'Customer retrieved successfully',
// //       data: customer,
// //     });
// //   }
// // );
// // export const getAllCustomers = handleFactory.getAll(Customer, true);
// // export const updateCustomer = handleFactory.updateOne(Customer, true);
// // export const deleteCustomer = handleFactory.deleteOne(Customer, true);
// // export const deactivateMultipleCustomers = catchAsync(
// //   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     if (!req.user) {
// //       return next(new AppError('Authentication required', 401));
// //     }
// //     const { ids } = req.body;
// //     const userId = req.user._id;
// //     if (!ids || !Array.isArray(ids) || ids.length === 0) {
// //       return next(new AppError('No valid IDs provided for deactivation.', 400));
// //     }
// //     const validIds = ids
// //       .filter((id: string) => Types.ObjectId.isValid(id))
// //       .map((id: string) => new Types.ObjectId(id));
// //     if (validIds.length === 0) {
// //       return next(new AppError('No valid ObjectIds provided.', 400));
// //     }
// //     const result = await Customer.updateMany(
// //       { _id: { $in: validIds }, owner: userId },
// //       { status: 'inactive' },
// //       { runValidators: true }
// //     );
// //     if (result.modifiedCount === 0) {
// //       return next(new AppError('No customers found or unauthorized', 404));
// //     }
// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       message: `${result.modifiedCount} customer(s) deactivated successfully`,
// //       data: { modifiedCount: result.modifiedCount },
// //     });
// //   }
// // );
//# sourceMappingURL=customerController.js.map