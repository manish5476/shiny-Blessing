"use strict";
// src/controllers/invoiceController.ts
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
exports.validateInvoiceCreation = exports.updateInvoice = exports.deleteInvoice = exports.newInvoice = exports.getInvoiceById = exports.getAllInvoice = exports.getProductSales = exports.findDuplicateInvoice = void 0;
const invoiceModel_1 = __importDefault(require("../models/invoiceModel"));
const catchAsyncModule_1 = require("../utils/catchAsyncModule");
const appError_1 = __importDefault(require("../utils/appError"));
const express_validator_1 = require("express-validator");
const handleFactory = __importStar(require("./handleFactory"));
/**
 * Middleware to check for duplicate invoice numbers before creating a new invoice.
 */
exports.findDuplicateInvoice = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    // Use 'as string' to explicitly tell TypeScript that req.body.invoiceNumber is a string
    const invoiceNumber = req.body.invoiceNumber;
    if (!invoiceNumber) {
        return next(new appError_1.default('Invoice number is required for duplicate check.', 400));
    }
    const existingInvoice = await invoiceModel_1.default.findOne({ invoiceNumber: invoiceNumber });
    if (existingInvoice) {
        return next(new appError_1.default(`Invoice with number ${invoiceNumber} already exists.`, 400));
    }
    next();
});
const productSalesStatistics = async (startDate, endDate) => {
    try {
        const salesData = await invoiceModel_1.default.aggregate([
            {
                $match: {
                    invoiceDate: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate),
                    },
                },
            },
            {
                $unwind: '$items', // Assuming 'items' is the array of products in your Invoice schema
            },
            {
                $group: {
                    _id: '$items.productId', // Group by product ID (assuming `productId` in Invoice.items)
                    totalQuantitySold: { $sum: '$items.quantity' }, // Sum quantity
                },
            },
            {
                $lookup: {
                    from: 'products', // Replace with your actual product collection name (usually pluralized lowercase model name)
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                $unwind: '$productDetails', // Unwind the productDetails array
            },
            {
                $project: {
                    _id: 0, // Exclude _id
                    product: '$productDetails.title', // Assuming 'title' is the product name
                    totalQuantitySold: 1, // Include totalQuantitySold
                },
            },
            {
                $sort: { totalQuantitySold: -1 }, // Sort by quantity sold descending
            },
        ]);
        return salesData;
    }
    catch (error) { // Catch as unknown for better type safety
        console.error('Error generating product sales statistics:', error instanceof Error ? error.message : error);
        throw error; // Re-throw to be caught by catchAsync or upstream error handler
    }
};
/**
 * Controller to get product sales statistics within a date range.
 */
exports.getProductSales = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const { startDate, endDate } = req.body;
    // Basic validation for dates
    if (!startDate || !endDate) {
        return next(new appError_1.default('Please provide startDate and endDate in the request body.', 400));
    }
    // Optional: Add more robust date format validation if needed
    if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
        return next(new appError_1.default('Invalid date format. Please use a valid date string (e.g., YYYY-MM-DD).', 400));
    }
    const salesStats = await productSalesStatistics(startDate, endDate);
    res.status(200).json({
        status: 'success',
        data: {
            salesStatistics: salesStats,
        },
    });
});
// --- CRUD Operations using handleFactory ---
// For handleFactory functions, we need to pass the specific Mongoose Model.
// We also ensure that IInvoice extends IOwnedDocument (which it should, based on customerModel)
// to satisfy the generic constraint of handleFactory functions.
/**
 * Get all invoices.
 * Uses handleFactory.getAll.
 */
exports.getAllInvoice = handleFactory.getAll(invoiceModel_1.default);
/**
 * Get a single invoice by ID.
 * Uses handleFactory.getOne. You can optionally specify populate options here.
 */
exports.getInvoiceById = handleFactory.getOne(invoiceModel_1.default, [
    'items.productId', // Assuming 'product' is a ref to Product model in IInvoice.items
    'customer', // Assuming 'customer' is a ref to Customer model in IInvoice
    'owner' // To populate the owner details
]);
/**
 * Create a new invoice.
 * Uses handleFactory.newOne. The owner will be automatically assigned from req.user.
 */
exports.newInvoice = handleFactory.newOne(invoiceModel_1.default);
/**
 * Delete an invoice by ID.
 * Uses handleFactory.deleteOne. Only owner or superAdmin can delete.
 */
exports.deleteInvoice = handleFactory.deleteOne(invoiceModel_1.default);
/**
 * Update an invoice by ID.
 * Uses handleFactory.updateOne. Only owner or superAdmin can update.
 */
exports.updateInvoice = handleFactory.updateOne(invoiceModel_1.default);
// You can add more specific validation middleware using express-validator here if needed.
// Example:
exports.validateInvoiceCreation = [
    (0, express_validator_1.body)('invoiceNumber').notEmpty().withMessage('Invoice number is required.'),
    (0, express_validator_1.body)('customer').isMongoId().withMessage('Customer ID must be a valid Mongo ID.'),
    (0, express_validator_1.body)('totalAmount').isNumeric().withMessage('Total amount must be a number.'),
    // ... more validations for other fields
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return next(new appError_1.default('Validation failed.', 400));
        }
        next();
    },
];
//# sourceMappingURL=invoiceController.js.map