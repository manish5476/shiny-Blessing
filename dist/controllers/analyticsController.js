"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryTurnover = exports.getPaymentCollectionEfficiency = exports.getProductPerformance = exports.getCustomerInsights = exports.getSalesPerformance = void 0;
// import mongoose from 'mongoose'; // Import mongoose for Types.ObjectId
const catchAsyncModule_1 = require("../utils/catchAsyncModule");
const appError_1 = __importDefault(require("../utils/appError"));
const invoiceModel_1 = __importDefault(require("../models/invoiceModel"));
const productModel_1 = __importDefault(require("../models/productModel"));
const customerModel_1 = __importDefault(require("../models/customerModel"));
const paymentModel_1 = __importDefault(require("../models/paymentModel"));
// Helper function to get the owner filter
const getOwnerFilter = (req) => {
    // Ensure req.user exists and has an _id and role.
    if (!req.user || !req.user._id) {
        throw new appError_1.default('User not authenticated or user ID missing.', 401);
    }
    // FIX: Explicitly cast req.user._id to mongoose.Types.ObjectId
    // This reassures TypeScript that userId will indeed be an ObjectId.
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';
    if (isSuperAdmin) {
        return {};
    }
    else {
        return { owner: userId };
    }
};
// Get sales performance metrics
exports.getSalesPerformance = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    // Type assertion for query parameters
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new appError_1.default('Invalid date format. Please provide valid startDate and endDate.', 400));
    }
    const ownerFilter = getOwnerFilter(req);
    const salesMetrics = await invoiceModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter,
                date: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$totalAmount" },
                averageOrderValue: { $avg: "$totalAmount" },
                totalOrders: { $sum: 1 },
                uniqueCustomers: { $addToSet: "$customer" }
            }
        },
        {
            $project: {
                _id: 0,
                totalSales: 1,
                averageOrderValue: 1,
                totalOrders: 1,
                uniqueCustomerCount: { $size: "$uniqueCustomers" }
            }
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: salesMetrics[0] || {
            totalSales: 0,
            averageOrderValue: 0,
            totalOrders: 0,
            uniqueCustomerCount: 0
        }
    });
});
// Get customer insights
exports.getCustomerInsights = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const ownerFilter = getOwnerFilter(req);
    // Ensure req.user._id is a valid ObjectId for the $eq comparison
    const userId = req.user._id; // `!` asserts non-null/undefined, as checked in getOwnerFilter
    const customerInsights = await customerModel_1.default.aggregate([
        {
            $match: ownerFilter
        },
        {
            $lookup: {
                from: "invoices",
                localField: "_id",
                foreignField: "customer",
                as: "orders"
            }
        },
        {
            $addFields: {
                orders: {
                    $filter: {
                        input: "$orders",
                        as: "order",
                        cond: {
                            $eq: ["$$order.owner", userId] // Use the extracted userId
                        }
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                fullname: 1,
                totalOrders: { $size: "$orders" },
                totalSpent: { $sum: "$orders.totalAmount" },
                lastOrderDate: { $max: "$orders.date" }
            }
        },
        {
            $sort: { totalSpent: -1 }
        },
        {
            $limit: 10
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: customerInsights
    });
});
// Get product performance analysis
exports.getProductPerformance = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new appError_1.default('Invalid date format. Please provide valid startDate and endDate.', 400));
    }
    const ownerFilter = getOwnerFilter(req);
    const userId = req.user._id; // For filtering productDetails by owner
    const productPerformance = await invoiceModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter,
                date: { $gte: start, $lte: end }
            }
        },
        {
            $unwind: "$items"
        },
        {
            $group: {
                _id: "$items.product",
                totalQuantity: { $sum: "$items.quantity" },
                totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                averagePrice: { $avg: "$items.price" },
                orderCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "products", // Ensure this matches your Product collection name
                localField: "_id",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        {
            $unwind: "$productDetails"
        },
        {
            $match: {
                // Only filter by product owner if ownerFilter has a specific owner (not superAdmin)
                // Ensure the joined product also belongs to the current user, if not super admin
                ...(ownerFilter.owner ? { "productDetails.owner": userId } : {})
            }
        },
        {
            $project: {
                _id: 1,
                name: "$productDetails.title",
                category: "$productDetails.category",
                totalQuantity: 1,
                totalRevenue: 1,
                averagePrice: 1,
                orderCount: 1,
                profitMargin: {
                    $multiply: [
                        {
                            $divide: [
                                { $subtract: ["$totalRevenue", { $multiply: ["$totalQuantity", "$productDetails.costPrice"] }] },
                                "$totalRevenue"
                            ]
                        },
                        100
                    ]
                }
            }
        },
        {
            $sort: { totalRevenue: -1 }
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: productPerformance
    });
});
// Get payment collection efficiency
exports.getPaymentCollectionEfficiency = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new appError_1.default('Invalid date format. Please provide valid startDate and endDate.', 400));
    }
    const ownerFilter = getOwnerFilter(req);
    const paymentEfficiency = await paymentModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter,
                createdAt: { $gte: start, $lte: end } // Assuming payment has 'createdAt' for date filtering
            }
        },
        {
            $group: {
                _id: "$status",
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        },
        // Re-evaluate if you need 'averageDaysToPay' here.
        // If you do, you'll need to join with Invoices correctly,
        // assuming a Payment document explicitly links to an Invoice.
        // Example (requires 'invoiceId' on Payment and 'invoiceDate' on Invoice):
        // {
        //   $lookup: {
        //     from: 'invoices',
        //     localField: 'invoiceId', // Assuming Payment has invoiceId field
        //     foreignField: '_id',
        //     as: 'invoiceDetails'
        //   }
        // },
        // { $unwind: { path: "$invoiceDetails", preserveNullAndEmptyArrays: true } },
        // {
        //   $project: {
        //     _id: 1,
        //     totalAmount: 1,
        //     count: 1,
        //     averageDaysToPay: {
        //       $avg: {
        //         $cond: {
        //           if: { $and: ["$invoiceDetails.date", "$createdAt"] },
        //           then: { $divide: [{ $subtract: ["$createdAt", "$invoiceDetails.date"] }, 1000 * 60 * 60 * 24] },
        //           else: null
        //         }
        //       }
        //     }
        //   }
        // }
    ]);
    res.status(200).json({
        status: 'success',
        data: paymentEfficiency
    });
});
// Get inventory turnover rate
exports.getInventoryTurnover = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new appError_1.default('Invalid date format. Please provide valid startDate and endDate.', 400));
    }
    const ownerFilter = getOwnerFilter(req);
    const userId = req.user._id; // For filtering sales by owner
    const inventoryTurnover = await productModel_1.default.aggregate([
        {
            $match: ownerFilter
        },
        {
            $lookup: {
                from: "invoices", // Ensure this matches your Invoice collection name
                localField: "_id",
                foreignField: "items.product",
                as: "sales"
            }
        },
        {
            $addFields: {
                sales: {
                    $filter: {
                        input: "$sales",
                        as: "sale",
                        cond: {
                            $and: [
                                { $eq: ["$$sale.owner", userId] }, // Check invoice owner
                                { $gte: ["$$sale.date", start] },
                                { $lte: ["$$sale.date", end] }
                            ]
                        }
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                category: 1,
                currentStock: 1,
                // Calculate total sold quantity for THIS product from filtered sales
                totalSold: {
                    $sum: {
                        $map: {
                            input: "$sales",
                            as: "sale",
                            in: {
                                $sum: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$$sale.items",
                                                as: "item",
                                                cond: { $eq: ["$$item.product", "$_id"] }
                                            }
                                        },
                                        as: "filteredItem",
                                        in: "$$filteredItem.quantity"
                                    }
                                }
                            }
                        }
                    }
                },
                // Calculate average price from sales for this product
                averagePrice: {
                    $avg: {
                        $map: {
                            input: "$sales",
                            as: "sale",
                            in: {
                                $avg: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$$sale.items",
                                                as: "item",
                                                cond: { $eq: ["$$item.product", "$_id"] }
                                            }
                                        },
                                        as: "filteredItem",
                                        in: "$$filteredItem.price"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                turnoverRate: {
                    $cond: {
                        if: { $ne: ["$currentStock", 0] },
                        then: { $divide: ["$totalSold", "$currentStock"] },
                        else: 0 // Avoid division by zero
                    }
                }
            }
        },
        {
            $sort: { turnoverRate: -1 }
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: inventoryTurnover
    });
});
//# sourceMappingURL=analyticsController.js.map