// src/controllers/invoiceController.ts

import { Request, Response, NextFunction } from 'express';
import Invoice, { IInvoice } from '../models/invoiceModel';
import {catchAsync} from '../utils/catchAsyncModule';
import AppError from '../utils/appError';
import { body, validationResult } from 'express-validator';
import * as handleFactory from './handleFactory';
import { Types } from 'mongoose';


/**
 * Middleware to check for duplicate invoice numbers before creating a new invoice.
 */
export const findDuplicateInvoice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Use 'as string' to explicitly tell TypeScript that req.body.invoiceNumber is a string
    const invoiceNumber = req.body.invoiceNumber as string;

    if (!invoiceNumber) {
        return next(new AppError('Invoice number is required for duplicate check.', 400));
    }

    const existingInvoice = await Invoice.findOne({ invoiceNumber: invoiceNumber });

    if (existingInvoice) {
        return next(new AppError(`Invoice with number ${invoiceNumber} already exists.`, 400));
    }
    next();
});

/**
 * Helper function to generate product sales statistics using MongoDB aggregation.
 * @param {string} startDate - Start date string (e.g., 'YYYY-MM-DD').
 * @param {string} endDate - End date string (e.g., 'YYYY-MM-DD').
 * @returns {Promise<Array<{ product: string, totalQuantitySold: number }>>} Sales data.
 */
interface ProductSalesStat {
    product: string;
    totalQuantitySold: number;
}

const productSalesStatistics = async (startDate: string, endDate: string): Promise<ProductSalesStat[]> => {
    try {
        const salesData = await Invoice.aggregate<ProductSalesStat>([ // Type the aggregation result
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
    } catch (error: unknown) { // Catch as unknown for better type safety
        console.error('Error generating product sales statistics:', error instanceof Error ? error.message : error);
        throw error; // Re-throw to be caught by catchAsync or upstream error handler
    }
};

/**
 * Controller to get product sales statistics within a date range.
 */
export const getProductSales = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { startDate, endDate } = req.body;

    // Basic validation for dates
    if (!startDate || !endDate) {
        return next(new AppError('Please provide startDate and endDate in the request body.', 400));
    }

    // Optional: Add more robust date format validation if needed
    if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
        return next(new AppError('Invalid date format. Please use a valid date string (e.g., YYYY-MM-DD).', 400));
    }

    const salesStats = await productSalesStatistics(startDate as string, endDate as string);

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
export const getAllInvoice = handleFactory.getAll<IInvoice>(Invoice);

/**
 * Get a single invoice by ID.
 * Uses handleFactory.getOne. You can optionally specify populate options here.
 */
export const getInvoiceById = handleFactory.getOne<IInvoice>(Invoice, [
    'items.productId', // Assuming 'product' is a ref to Product model in IInvoice.items
    'customer',         // Assuming 'customer' is a ref to Customer model in IInvoice
    'owner'             // To populate the owner details
]);

/**
 * Create a new invoice.
 * Uses handleFactory.newOne. The owner will be automatically assigned from req.user.
 */
export const newInvoice = handleFactory.newOne<IInvoice>(Invoice);

/**
 * Delete an invoice by ID.
 * Uses handleFactory.deleteOne. Only owner or superAdmin can delete.
 */
export const deleteInvoice = handleFactory.deleteOne<IInvoice>(Invoice);

/**
 * Update an invoice by ID.
 * Uses handleFactory.updateOne. Only owner or superAdmin can update.
 */
export const updateInvoice = handleFactory.updateOne<IInvoice>(Invoice);

// You can add more specific validation middleware using express-validator here if needed.
// Example:
export const validateInvoiceCreation = [
    body('invoiceNumber').notEmpty().withMessage('Invoice number is required.'),
    body('customer').isMongoId().withMessage('Customer ID must be a valid Mongo ID.'),
    body('totalAmount').isNumeric().withMessage('Total amount must be a number.'),
    // ... more validations for other fields
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError('Validation failed.', 400));
        }
        next();
    },
];