import { Request, Response, NextFunction } from 'express';
// import mongoose from 'mongoose'; // Import mongoose for Types.ObjectId
import {catchAsync} from '../utils/catchAsyncModule';
// import AppError from '../Utils/appError';
import mongoose from 'mongoose'; // Import mongoose for Types.ObjectId

import Invoice, { IInvoice } from '../models/invoiceModel';
import Product, { IProduct } from '../models/productModel';
import Customer, { ICustomer } from '../models/customerModel';
import Payment, { IPayment } from '../models/paymentModel';
import { IUser } from '../models/UserModel'; // Assuming UserModel.ts exports IUser

interface CustomRequest extends Request {
  user?: IUser; // Make it optional for safety, though typically present after protect middleware
}

// Helper function to get the owner filter
const getOwnerFilter = (req: CustomRequest): { owner?: mongoose.Types.ObjectId } => {
  // Ensure req.user exists and has an _id and role.
  if (!req.user || !req.user._id) {
    throw new AppError('User not authenticated or user ID missing.', 401);
  }

  // FIX: Explicitly cast req.user._id to mongoose.Types.ObjectId
  // This reassures TypeScript that userId will indeed be an ObjectId.
  const userId: mongoose.Types.ObjectId = req.user._id as mongoose.Types.ObjectId;
  const isSuperAdmin = req.user.role === 'superAdmin';

  if (isSuperAdmin) {
    return {};
  } else {
    return { owner: userId };
  }
};
 
// --- Interfaces for Aggregation Outputs ---

interface SalesMetricsResult {
  totalSales: number;
  averageOrderValue: number;
  totalOrders: number;
  uniqueCustomerCount: number;
}

interface CustomerInsightResult {
  _id: mongoose.Types.ObjectId;
  fullname: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
}

interface ProductPerformanceResult {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  averagePrice: number;
  orderCount: number;
  profitMargin: number;
}

interface PaymentEfficiencyResult {
  _id: string; // payment status (e.g., 'completed', 'pending')
  totalAmount: number;
  count: number;
  // averageDaysToPay: number; // If you re-implement this, add its type
}

interface InventoryTurnoverResult {
  _id: mongoose.Types.ObjectId;
  title: string;
  category: string;
  currentStock: number;
  totalSold: number;
  averagePrice: number; // Note: This average price is from sales, not product's original price
  turnoverRate: number;
}

// Get sales performance metrics
export const getSalesPerformance = catchAsync(async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;

  // Type assertion for query parameters
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new AppError('Invalid date format. Please provide valid startDate and endDate.', 400));
  }

  const ownerFilter = getOwnerFilter(req);

  const salesMetrics = await Invoice.aggregate<SalesMetricsResult>([
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
export const getCustomerInsights = catchAsync(async (req: CustomRequest, res: Response, next: NextFunction) => {
  const ownerFilter = getOwnerFilter(req);

  // Ensure req.user._id is a valid ObjectId for the $eq comparison
  const userId = req.user!._id; // `!` asserts non-null/undefined, as checked in getOwnerFilter

  const customerInsights = await Customer.aggregate<CustomerInsightResult>([
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
export const getProductPerformance = catchAsync(async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new AppError('Invalid date format. Please provide valid startDate and endDate.', 400));
  }

  const ownerFilter = getOwnerFilter(req);
  const userId = req.user!._id; // For filtering productDetails by owner

  const productPerformance = await Invoice.aggregate<ProductPerformanceResult>([
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
export const getPaymentCollectionEfficiency = catchAsync(async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new AppError('Invalid date format. Please provide valid startDate and endDate.', 400));
  }

  const ownerFilter = getOwnerFilter(req);

  const paymentEfficiency = await Payment.aggregate<PaymentEfficiencyResult>([
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
export const getInventoryTurnover = catchAsync(async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new AppError('Invalid date format. Please provide valid startDate and endDate.', 400));
  }

  const ownerFilter = getOwnerFilter(req);
  const userId = req.user!._id; // For filtering sales by owner

  const inventoryTurnover = await Product.aggregate<InventoryTurnoverResult>([
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