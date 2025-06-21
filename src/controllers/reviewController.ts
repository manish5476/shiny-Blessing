// const Review = require("../Models/ReviewModel");
// const Product = require("./../Models/productModel"); // Product model is likely for linking reviews
// const ApiFeatures = require("../utils/ApiFeatures"); // Still good to have for custom queries if needed
// const AppError = require("../utils/appError");
// const catchAsync = require("../utils/catchAsyncModule");
// const handleFactory = require("./handleFactory");
import Product from '../models/productModel';
import {catchAsync} from '../utils/catchAsyncModule';
import AppError from '../utils/appError';
import { body, validationResult } from 'express-validator'; // Still needed if you have custom validation
import * as handleFactory from './handleFactory';
import Review from "../models/ReviewModel";

exports.setUserProductIds = (req:any, res:any, next:any) => {
  if (!req.body.product && req.params.productId) {
    req.body.product = req.params.productId;
  }
  if (!req.body.user) {
    req.body.user = req.user.id;
  }
  next();
};
exports.getAllReviews = handleFactory.getAll(Review);
exports.reviewById = handleFactory.getOne(Review, { path: "product" });
exports.createReview = handleFactory.newOne(Review);
exports.updateReview = handleFactory.updateOne(Review);
exports.deleteReview = handleFactory.deleteOne(Review);
