"use strict";
// const { query } = require("express");
// const Payment = require("./../Models/paymentModel");
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
exports.deleteMultiplePayment = exports.updatePayment = exports.deletePayment = exports.newPayment = exports.getPaymentById = exports.getAllPayment = void 0;
// exports.deleteMultiplePayment = handleFactory.deleteMultiplePayment(Payment)
const handleFactory = __importStar(require("./handleFactory"));
const paymentModel_1 = __importDefault(require("../models/paymentModel"));
// import {catchAsync} from '../utils/catchAsyncModule';
// import AppError from '../utils/appError';
// import { body, validationResult } from 'express-validator';
exports.getAllPayment = handleFactory.getAll(paymentModel_1.default, false);
exports.getPaymentById = handleFactory.getOne(paymentModel_1.default, { path: "reviews" });
exports.newPayment = handleFactory.newOne(paymentModel_1.default);
exports.deletePayment = handleFactory.deleteOne(paymentModel_1.default);
exports.updatePayment = handleFactory.updateOne(paymentModel_1.default);
exports.deleteMultiplePayment = handleFactory.deleteMultiple(paymentModel_1.default, true);
// exports.newPayment = [
//   body('amount').isNumeric().withMessage('Amount must be a number'),
//   body('customerId').notEmpty().withMessage('Customer ID is required'),
//   catchAsync(async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
//     }
//     const payment = await Payment.create(req.body);
//     res.status(201).json({
//       status: 'success',
//       data: payment,
//     });
//   }),
// ];
// exports.getAllPayment = catchAsync(async (req, res, next) => {
//   const payments = await Payment.find();
//   res.status(200).json({
//     status: 'success',
//     results: payments.length,
//     data: payments,
//   });
// });
// exports.getPaymentById = catchAsync(async (req, res, next) => {
//   const payment = await Payment.findById(req.params.id);
//   if (!payment) return next(new AppError('Payment not found with Id', 404));
//   res.status(200).json({
//     status: 'success',
//     data: payment,
//   });
// });
// exports.updatePayment = catchAsync(async (req, res, next) => {
//   const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   if (!payment) return next(new AppError('Payment not found with Id', 404));
//   res.status(201).json({
//     status: 'success',
//     data: payment,
//   });
// });
// exports.deletePayment = catchAsync(async (req, res, next) => {
//   const payment = await Payment.findByIdAndDelete(req.params.id);
//   if (!payment) return next(new AppError('Payment not found with Id', 404));
//   res.status(200).json({
//     status: 'success',
//     message: 'Payment deleted successfully',
//     data: null,
//   });
// });
//# sourceMappingURL=paymentController.js.map