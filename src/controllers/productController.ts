import Product from '../models/productModel';
import {catchAsync} from '../utils/catchAsyncModule';
import AppError from '../utils/appError';
import { body, validationResult } from 'express-validator'; // Still needed if you have custom validation
import * as handleFactory from './handleFactory';
import { AuthenticatedRequest } from '../types/custom';

// It's assumed that all routes using these handlers are protected by authController.protect middleware,
// which populates req.user with the authenticated user's details (including role and _id).

export const findDuplicateProduct = catchAsync(async (req: AuthenticatedRequest, res, next) => {
  const userId = req.user?._id;
  const isSuperAdmin = req.user?.role === 'superAdmin';
  
const filter: Record<string, any> = { sku: req.body.sku };

if (!isSuperAdmin && userId) {
  filter.owner = userId;
}

  // let filter = { sku: req.body.sku };
  // if (!isSuperAdmin) {
  //   filter.owner = userId; // Add owner filter if not super admin
  // }

  const existingProduct = await Product.findOne(filter);

  if (existingProduct) {
    const message = `Product with SKU ${req.body.sku} already exists` +
      (!isSuperAdmin ? ' for your account.' : '.');
    return next(new AppError(message, 400));
  }
  next();
});

export const deleteMultipleProduct = handleFactory.deleteMultiple(Product, true);

// Using handleFactory for all standard CRUD operations,
// which already incorporate the owner filter and super admin bypass logic.
export const getAllProduct = handleFactory.getAll(Product); // reviews path typically only for getOne
export const getProductById = handleFactory.getOne(Product, { path: "reviews" }); // Include populate option as specified
export const deleteProduct = handleFactory.deleteOne(Product);
export const updateProduct = handleFactory.updateOne(Product);
export const newProduct = handleFactory.newOne(Product);
// exports.deleteMultipleProduct = handleFactory.deleteMultipleProduct(Product); // Generic multiple delete
// const Product = require('../Models/productModel');
// const catchAsync = require('../Utils/catchAsyncModule');
// const AppError = require('../Utils/appError');
// const { body, validationResult } = require('express-validator');
// const handleFactory = require("./handleFactory");

// exports.findDuplicateProduct = catchAsync(async (req, res, next) => {
//   const existingProduct = await Product.findOne({ sku: req.body.sku });
//   if (existingProduct) {
//     return next(new AppError(`Product with SKU ${req.body.sku} already exists`, 400));
//   }
//   next();
// });
// exports.getProductDropdownWithId = catchAsync(async (req, res, next) => {
//   const products = await Product.find().select('title _id');
//   res.status(200).json({
//     status: 'success',
//     results: products.length,
//     data: { products },
//   });
// });

// exports.getAllProduct = handleFactory.getAll(Product, { path: "reviews" });
// exports.getProductById = handleFactory.getOne(Product, { path: "reviews" });
// exports.deleteProduct = handleFactory.deleteOne(Product);
// exports.updateProduct = handleFactory.updateOne(Product);
// exports.newProduct = handleFactory.newOne(Product);
// exports.deleteMultipleProduct = handleFactory.deleteMultipleProduct(Product)



// // exports.newProduct = [
// //   body('title').notEmpty().withMessage('Title is required'),
// //   body('sku').notEmpty().withMessage('SKU is required'),
// //   body('rate').isNumeric().withMessage('Rate must be a number'),
// //   catchAsync(async (req, res, next) => {
// //     const errors = validationResult(req);
// //     if (!errors.isEmpty()) {
// //       return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
// //     }
// //     const product = await Product.create(req.body);
// //     res.status(201).json({
// //       status: 'success',
// //       data: product,
// //     });
// //   }),
// // ];

// // exports.getAllProduct = catchAsync(async (req, res, next) => {
// //   const products = await Product.find();
// //   res.status(200).json({
// //     status: 'success',
// //     results: products.length,
// //     data: products,
// //   });
// // });

// // exports.getProductById = catchAsync(async (req, res, next) => {
// //   const product = await Product.findById(req.params.id);
// //   if (!product) return next(new AppError('Product not found with Id', 404));
// //   res.status(200).json({
// //     status: 'success',
// //     data: product,
// //   });
// // });

// // exports.updateProduct = catchAsync(async (req, res, next) => {
// //   const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
// //     new: true,
// //     runValidators: true,
// //   });
// //   if (!product) return next(new AppError('Product not found with Id', 404));
// //   res.status(201).json({
// //     status: 'success',
// //     data: product,
// //   });
// // });

// // exports.deleteProduct = catchAsync(async (req, res, next) => {
// //   const product = await Product.findByIdAndDelete(req.params.id);
// //   if (!product) return next(new AppError('Product not found with Id', 404));
// //   res.status(200).json({
// //     status: 'success',
// //     message: 'Product deleted successfully',
// //     data: null,
// //   });
// // });


// // const { query } = require("express");
// // const Product = require("./../Models/productModel");
// // const ApiFeatures = require("../Utils/ApiFeatures");
// // const catchAsync = require("../Utils/catchAsyncModule");
// // const AppError = require("../Utils/appError");
// // // const reviewRoutes = require('../routes/reviewRoutes');  // Import reviewRoutes
// // const handleFactory = require("./handleFactory");
// // const { Status } = require("git");
// // //get all data on the basis of the product
// // // ---------------------------------------------------------------------------------------------------------------------------------------

// // exports.getProductDropDownWithId = catchAsync(async (req, res, next) => {
// //   const products = await Product.find().select("modelName modelCode _id");
// //   res.status(200).json({
// //     status: "success",
// //     results: products.length,
// //     data: {
// //       products,
// //     },
// //   });
// // });

// // // ---------------------------------------------------------------------------------------------------------------------------------------
// // exports.getProductStats = catchAsync(async (req, res, next) => {
// //   const stat = await Product.aggregate([
// //     {
// //       $match: { listPrice: { gte: 400 } },
// //     },
// //     {
// //       $group: {
// //         _id: null,
// //         avgPrice: { $avg: "$listPrice" },
// //         maxPrice: { $max: "$listPrice" },
// //         minPrice: { $min: "$listPrice" },
// //         count: { $sum: 1 },
// //       },
// //     },
// //   ]);
// // });
// // // ------------------------
// // exports.findDuplicateProduct = catchAsync(async (req, res, next) => {
// //   // console.log("Checking for duplicate with SKU:", req.body.sku);
// //   const existingProduct = await Product.findOne({ sku: req.body.sku });
// //   // console.log("Existing Product:", existingProduct);
// //   if (existingProduct) {
// //     return next(
// //       new AppError(
// //         `Product with this name already exists: ${req.body.sku}`,
// //         400
// //       )
// //     );
// //   }
// //   next();
// // });

// // //
// // exports.getProductWithIn = catchAsync(async (req, res, next) => {
// //   const { distance, latlng, unit } = req.params;
// //   // Split latitude and longitude
// //   const [lat, lng] = latlng.split(",");

// //   const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;
// //   // Validate latitude and longitude
// //   if (!lat || !lng) {
// //     next(
// //       new AppError(
// //         "Please provide latitude and longitude in the format lat,lng.",
// //         400
// //       )
// //     );
// //   }

// //   const products = await Product.find({
// //     startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
// //   });
// //   res.status(200).json({
// //     Status: "success",
// //     results: products.length,
// //     data: {
// //       products,
// //     },
// //   });
// //   // console.log(distance, lat, lng, unit);
// // });
// // //
// // exports.getDistances = catchAsync(async (req, res, next) => {
// //   const { latlng, unit } = req.params;

// //   // Split latitude and longitude
// //   const [lat, lng] = latlng.split(",");

// //   // Validate latitude and longitude
// //   if (!lat || !lng) {
// //     next(
// //       new AppError(
// //         "Please provide latitude and longitude in the format lat,lng.",
// //         400
// //       )
// //     );
// //   }

// //   const distances = await Product.aggregate([
// //     {
// //       $geoNear: {
// //         near: {
// //           type: "Point",
// //           coordinates: [lng * 1, lat * 1],
// //         },
// //         distanceField: "distance",
// //         distanceMultiplier: 0.001,
// //       },
// //     },
// //     {
// //       $project: {
// //         distance: 1,
// //         name: 1,
// //       },
// //     },
// //   ]);
// //   res.status(200).json({
// //     Status: "success",
// //     results: products.length,
// //     data: {
// //       distances,
// //     },
// //   });
// // });

// // // ---------------------------------------------------------------------------------------------------------------------------------------
// // exports.getAllProduct = handleFactory.getAll(Product, { path: "reviews" });
// // exports.getProductById = handleFactory.getOne(Product, { path: "reviews" });
// // exports.newProduct = handleFactory.newOne(Product);
// // exports.deleteProduct = handleFactory.deleteOne(Product);
// // exports.updateProduct = handleFactory.updateOne(Product);
// // // ---------------------------------------------------------------------------------------------------------------------------------------

// // // exports.getProductById = catchAsync(async (req, res, next) => {
// // //   const product = await Product.findById(req.params.id).populate("reviews"); //here we are doing virtual populate with review
// // //   if (!product) {
// // //     return next(new AppError("Product not found with Id", 404));
// // //   }
// // //   res.status(200).json({
// // //     status: "success",
// // //     data: product,
// // //   });
// // // });
// // // =----------------------------------------------
// // // ---------------------------------------------------------------------------------------------------------------------------------------
// // // exports.newProduct = catchAsync(async (req, res, next) => {
// // //   const existingProduct = await Product.findOne({ name: req.body.sku });
// // //   if (existingProduct) {
// // //     return next(
// // //       new AppError(
// // //         `Product with this name already exists by name  ${req.body.sku}`,
// // //         400
// // //       )
// // //     );
// // //   }

// // //   const newProduct = await Product.create(req.body);
// // //   if (!newProduct) {
// // //     return next(new AppError("Failed to create product", 400));
// // //   }
// // //   res.status(201).json({
// // //     status: "success",
// // //     data: {
// // //       Product: newProduct,
// // //     },
// // //   });
// // // });
// // // ---------------------------------------------------------------------------------------------------------------------------------------

// // //  exports.newProduct = catchAsync(async (req, res, next) => {
// // //   const newProduct = await Product.create(req.body);

// // //   if (!newProduct) {
// // //     return next(new AppError("Failed to create product", 400));
// // //   }
// // //   res.status(201).json({
// // //     status: "success",
// // //     data: {
// // //       Product: newProduct,
// // //     },
// // //   });
// // // });
// // // ---------------------------------------------------------------------------------------------------------------------------------------

// // //update Product
// // // exports.updateProduct = catchAsync(async (req, res, next) => {
// // //   const product = await Product.findByIdAndUpdate(req.params.id, req.body);
// // //   if (!product) {
// // //     return next(
// // //       new AppError(`Product not found with Id ${req.params.id}`, 404)
// // //     );
// // //   }
// // //   res.status(201).json({
// // //     status: "Success",
// // //     data: { product },
// // //   });
// // // });
// // // ---------------------------------------------------------------------------------------------------------------------------------------

// // //delete Product
// // // exports.deleteProduct = catchAsync(async (req, res, next) => {
// // //   const product = await Product.findByIdAndDelete(req.params.id);
// // //   if (!product) {
// // //     return next(new AppError("Product not found with Id", 404));
// // //   }
// // //   res.status(200).json({
// // //     Status: "success",
// // //     message: "Data deleted successfully",
// // //     data: null,
// // //   });
// // // });
// // // ---------------------------------------------------------------------------------------------------------------------------------------
// // // Get product dropDown data
// // // exports.getAllProduct = catchAsync(async (req, res, next) => {
// // //   const features = new ApiFeatures(
// // //     Product.find().populate("reviews"),
// // //     req.query
// // //   )
// // //     .filter()
// // //     .limitFields()
// // //     .sort()
// // //     .paginate();
// // //   const products = await features.query;
// // //   res.status(200).json({
// // //     status: "success",
// // //     result: products.length,
// // //     data: { products },
// // //   });
// // // });

