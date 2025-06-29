"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const catchAsyncModule_1 = require("../utils/catchAsyncModule");
const invoiceModel_1 = __importDefault(require("../models/invoiceModel"));
const productModel_1 = __importDefault(require("../models/productModel"));
const customerModel_1 = __importDefault(require("../models/customerModel"));
const paymentModel_1 = __importDefault(require("../models/paymentModel"));
const appError_1 = __importDefault(require("../utils/appError"));
// It's assumed that all routes using these handlers are protected by authController.protect middleware,
// which populates req.user with the authenticated user's details (including role and _id).
// Helper function to get the owner filter
const getOwnerFilter = (req) => {
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';
    return isSuperAdmin ? {} : { owner: userId };
};
// Helper function to get date range for current month
const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startOfMonth, endOfMonth };
};
// Get overall dashboard statistics
exports.getDashboardStats = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();
    const ownerFilter = getOwnerFilter(req); // Get the owner filter
    // Get current month's total sales
    const currentMonthSales = await invoiceModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter, // Apply owner filter
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$totalAmount" },
                totalInvoices: { $sum: 1 }
            }
        }
    ]);
    // Get pending payments
    const pendingPayments = await paymentModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter, // Apply owner filter
                status: "pending"
            }
        },
        {
            $group: {
                _id: null,
                totalPendingAmount: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        }
    ]);
    // Get total customers
    const totalCustomers = await customerModel_1.default.countDocuments(ownerFilter); // Apply owner filter
    // Get total products
    const totalProducts = await productModel_1.default.countDocuments(ownerFilter); // Apply owner filter
    // Get low stock products (less than 10)
    const lowStockProducts = await productModel_1.default.countDocuments({ ...ownerFilter, stock: { $lt: 10 } }); // Apply owner filter
    res.status(200).json({
        status: 'success',
        data: {
            currentMonth: {
                totalSales: currentMonthSales[0]?.totalSales || 0,
                totalInvoices: currentMonthSales[0]?.totalInvoices || 0
            },
            pendingPayments: {
                totalAmount: pendingPayments[0]?.totalPendingAmount || 0,
                count: pendingPayments[0]?.count || 0
            },
            totalCustomers,
            totalProducts,
            lowStockProducts
        }
    });
});
// Get top selling products
exports.getTopSellingProducts = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();
    const ownerFilter = getOwnerFilter(req); // Get the owner filter
    const topProducts = await invoiceModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter, // Apply owner filter
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }
        },
        {
            $unwind: "$items"
        },
        {
            $group: {
                _id: "$items.product",
                totalQuantity: { $sum: "$items.quantity" },
                totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        {
            $unwind: "$productDetails"
        },
        // IMPORTANT: Filter joined product details by owner if not super admin
        {
            $match: {
                // if ownerFilter.owner is defined (i.e., not superAdmin), match productDetails.owner
                // otherwise (superAdmin), always match, which $productDetails.owner does
                "productDetails.owner": ownerFilter.owner || "$productDetails.owner"
            }
        },
        {
            $project: {
                _id: 1,
                name: "$productDetails.title",
                totalQuantity: 1,
                totalRevenue: 1
            }
        },
        {
            $sort: { totalQuantity: -1 }
        },
        {
            $limit: 10
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: topProducts
    });
});
// Get customer payment statistics
exports.getCustomerPaymentStats = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const ownerFilter = getOwnerFilter(req); // Get the owner filter
    const pendingPayments = await paymentModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter, // Apply owner filter
                status: "pending"
            }
        },
        {
            $group: {
                _id: "$customerId",
                totalPendingAmount: { $sum: "$amount" },
                paymentCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "customers",
                localField: "_id",
                foreignField: "_id",
                as: "customerDetails"
            }
        },
        {
            $unwind: "$customerDetails"
        },
        // IMPORTANT: Filter joined customer details by owner if not super admin
        {
            $match: {
                // if ownerFilter.owner is defined (i.e., not superAdmin), match customerDetails.owner
                // otherwise (superAdmin), always match, which $customerDetails.owner does
                "customerDetails.owner": ownerFilter.owner || "$customerDetails.owner"
            }
        },
        {
            $project: {
                _id: 1,
                customerName: "$customerDetails.fullname",
                // Assuming phoneNumbers array, project the first mobile number or the entire array
                phoneNumber: "$customerDetails.mobileNumber", // Or "$customerDetails.phoneNumbers.0.number" if structured differently
                totalPendingAmount: 1,
                paymentCount: 1
            }
        },
        {
            $sort: { totalPendingAmount: -1 }
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: pendingPayments
    });
});
exports.getMonthlySalesTrend = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    let year;
    if (typeof req.query.year === 'string') {
        year = parseInt(req.query.year, 10);
    }
    else if (Array.isArray(req.query.year) && typeof req.query.year[0] === 'string') {
        year = parseInt(req.query.year[0], 10);
    }
    else {
        year = new Date().getFullYear();
    }
    if (isNaN(year)) {
        return next(new appError_1.default('Invalid year query parameter', 400));
    }
    const ownerFilter = getOwnerFilter(req); // Your function
    const monthlySales = await invoiceModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter,
                date: {
                    $gte: new Date(year, 0, 1),
                    $lte: new Date(year, 11, 31, 23, 59, 59, 999),
                },
            },
        },
        {
            $group: {
                _id: { $month: "$date" },
                totalSales: { $sum: "$totalAmount" },
                invoiceCount: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    res.status(200).json({
        status: 'success',
        data: monthlySales,
    });
});
// Get upcoming EMI payments
exports.getUpcomingEMIPayments = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ownerFilter = getOwnerFilter(req); // Get the owner filter
    const upcomingEMIs = await paymentModel_1.default.aggregate([
        {
            $match: {
                ...ownerFilter, // Apply owner filter
                status: "pending",
                dueDate: { $gte: today, $lte: nextWeek }
            }
        },
        {
            $lookup: {
                from: "customers",
                localField: "customerId",
                foreignField: "_id",
                as: "customerDetails"
            }
        },
        {
            $unwind: "$customerDetails"
        },
        // IMPORTANT: Filter joined customer details by owner if not super admin
        {
            $match: {
                // if ownerFilter.owner is defined (i.e., not superAdmin), match customerDetails.owner
                // otherwise (superAdmin), always match, which $customerDetails.owner does
                "customerDetails.owner": ownerFilter.owner || "$customerDetails.owner"
            }
        },
        {
            $project: {
                _id: 1,
                customerName: "$customerDetails.fullname",
                phoneNumber: "$customerDetails.mobileNumber", // Adjust as needed if not using mobileNumber directly
                amount: 1,
                dueDate: 1,
                paymentType: 1
            }
        },
        {
            $sort: { dueDate: 1 }
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: upcomingEMIs
    });
});
// Get product inventory status
exports.getInventoryStatus = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const ownerFilter = getOwnerFilter(req); // Get the owner filter
    const inventoryStatus = await productModel_1.default.aggregate([
        {
            $match: ownerFilter // Apply owner filter
        },
        {
            $group: {
                _id: "$category",
                totalProducts: { $sum: 1 },
                lowStockProducts: {
                    $sum: {
                        $cond: [{ $lt: ["$stock", 10] }, 1, 0]
                    }
                },
                totalValue: { $sum: { $multiply: ["$price", "$stock"] } }
            }
        },
        {
            $sort: { totalProducts: -1 }
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: inventoryStatus
    });
});
// const catchAsync = require('../utils/catchAsyncModule');
// const Product = require('../models/productModel');
// const Invoice = require('../Models/invoiceModel');
// const Customer = require('../Models/customerModel');
// const Payment = require('../Models/paymentModel');
// const AppError = require('../utils/appError');
// // Helper function to get date range for current month
// const getCurrentMonthRange = () => {
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//     return { startOfMonth, endOfMonth };
// };
// // Get overall dashboard statistics
// exports.getDashboardStats = catchAsync(async (req, res, next) => {
//     const { startOfMonth, endOfMonth } = getCurrentMonthRange();
//     // Get current month's total sales
//     const currentMonthSales = await Invoice.aggregate([
//         {
//             $match: {
//                 date: { $gte: startOfMonth, $lte: endOfMonth }
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 totalSales: { $sum: "$totalAmount" },
//                 totalInvoices: { $sum: 1 }
//             }
//         }
//     ]);
//     // Get pending payments
//     const pendingPayments = await Payment.aggregate([
//         {
//             $match: {
//                 status: "pending"
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 totalPendingAmount: { $sum: "$amount" },
//                 count: { $sum: 1 }
//             }
//         }
//     ]);
//     // Get total customers
//     const totalCustomers = await Customer.countDocuments();
//     // Get total products
//     const totalProducts = await Product.countDocuments();
//     // Get low stock products (less than 10)
//     const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 } });
//     res.status(200).json({
//         status: 'success',
//         data: {
//             currentMonth: {
//                 totalSales: currentMonthSales[0]?.totalSales || 0,
//                 totalInvoices: currentMonthSales[0]?.totalInvoices || 0
//             },
//             pendingPayments: {
//                 totalAmount: pendingPayments[0]?.totalPendingAmount || 0,
//                 count: pendingPayments[0]?.count || 0
//             },
//             totalCustomers,
//             totalProducts,
//             lowStockProducts
//         }
//     });
// });
// // Get top selling products
// exports.getTopSellingProducts = catchAsync(async (req, res, next) => {
//     const { startOfMonth, endOfMonth } = getCurrentMonthRange();
//     const topProducts = await Invoice.aggregate([
//         {
//             $match: {
//                 date: { $gte: startOfMonth, $lte: endOfMonth }
//             }
//         },
//         {
//             $unwind: "$items"
//         },
//         {
//             $group: {
//                 _id: "$items.product",
//                 totalQuantity: { $sum: "$items.quantity" },
//                 totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
//             }
//         },
//         {
//             $lookup: {
//                 from: "products",
//                 localField: "_id",
//                 foreignField: "_id",
//                 as: "productDetails"
//             }
//         },
//         {
//             $unwind: "$productDetails"
//         },
//         {
//             $project: {
//                 _id: 1,
//                 name: "$productDetails.title",
//                 totalQuantity: 1,
//                 totalRevenue: 1
//             }
//         },
//         {
//             $sort: { totalQuantity: -1 }
//         },
//         {
//             $limit: 10
//         }
//     ]);
//     res.status(200).json({
//         status: 'success',
//         data: topProducts
//     });
// });
// // Get customer payment statistics
// exports.getCustomerPaymentStats = catchAsync(async (req, res, next) => {
//     const pendingPayments = await Payment.aggregate([
//         {
//             $match: {
//                 status: "pending"
//             }
//         },
//         {
//             $group: {
//                 _id: "$customerId",
//                 totalPendingAmount: { $sum: "$amount" },
//                 paymentCount: { $sum: 1 }
//             }
//         },
//         {
//             $lookup: {
//                 from: "customers",
//                 localField: "_id",
//                 foreignField: "_id",
//                 as: "customerDetails"
//             }
//         },
//         {
//             $unwind: "$customerDetails"
//         },
//         {
//             $project: {
//                 _id: 1,
//                 customerName: "$customerDetails.fullname",
//                 phoneNumber: "$customerDetails.phoneNumbers",
//                 totalPendingAmount: 1,
//                 paymentCount: 1
//             }
//         },
//         {
//             $sort: { totalPendingAmount: -1 }
//         }
//     ]);
//     res.status(200).json({
//         status: 'success',
//         data: pendingPayments
//     });
// });
// // Get monthly sales trend
// exports.getMonthlySalesTrend = catchAsync(async (req, res, next) => {
//     const { year = new Date().getFullYear() } = req.query;
//     const monthlySales = await Invoice.aggregate([
//         {
//             $match: {
//                 date: {
//                     $gte: new Date(year, 0, 1),
//                     $lte: new Date(year, 11, 31)
//                 }
//             }
//         },
//         {
//             $group: {
//                 _id: { $month: "$date" },
//                 totalSales: { $sum: "$totalAmount" },
//                 invoiceCount: { $sum: 1 }
//             }
//         },
//         {
//             $sort: { _id: 1 }
//         }
//     ]);
//     res.status(200).json({
//         status: 'success',
//         data: monthlySales
//     });
// });
// // Get upcoming EMI payments
// exports.getUpcomingEMIPayments = catchAsync(async (req, res, next) => {
//     const today = new Date();
//     const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
//     const upcomingEMIs = await Payment.aggregate([
//         {
//             $match: {
//                 status: "pending",
//                 dueDate: { $gte: today, $lte: nextWeek }
//             }
//         },
//         {
//             $lookup: {
//                 from: "customers",
//                 localField: "customerId",
//                 foreignField: "_id",
//                 as: "customerDetails"
//             }
//         },
//         {
//             $unwind: "$customerDetails"
//         },
//         {
//             $project: {
//                 _id: 1,
//                 customerName: "$customerDetails.fullname",
//                 phoneNumber: "$customerDetails.phoneNumbers",
//                 amount: 1,
//                 dueDate: 1,
//                 paymentType: 1
//             }
//         },
//         {
//             $sort: { dueDate: 1 }
//         }
//     ]);
//     res.status(200).json({
//         status: 'success',
//         data: upcomingEMIs
//     });
// });
// // Get product inventory status
// exports.getInventoryStatus = catchAsync(async (req, res, next) => {
//     const inventoryStatus = await Product.aggregate([
//         {
//             $group: {
//                 _id: "$category",
//                 totalProducts: { $sum: 1 },
//                 lowStockProducts: {
//                     $sum: {
//                         $cond: [{ $lt: ["$stock", 10] }, 1, 0]
//                     }
//                 },
//                 totalValue: { $sum: { $multiply: ["$price", "$stock"] } }
//             }
//         },
//         {
//             $sort: { totalProducts: -1 }
//         }
//     ]);
//     res.status(200).json({
//         status: 'success',
//         data: inventoryStatus
//     });
// }); 
//# sourceMappingURL=statisticsController.js.map