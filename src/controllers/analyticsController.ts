import { Request, Response, NextFunction } from 'express';
// ✅ Preferred solution
import { catchAsync } from '../utils/catchAsyncModule';
import {Invoice} from '../models/invoiceModel';
import {Product} from '../models/productModel';
import Customer from '../models/customerModel';
import Payment from '../models/paymentModel';
import AppError from '../utils/appError';

// Extend Express Request type for authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    role: 'admin' | 'seller' | 'superAdmin';
  };
}

const getOwnerFilter = (req: AuthenticatedRequest) => {
  const userId = req.user._id;
  const isSuperAdmin = req.user.role === 'superAdmin';
  return isSuperAdmin ? {} : { owner: userId };
};

// 📊 1. Sales Performance
export const getSalesPerformance = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  const ownerFilter = getOwnerFilter(req);

  const salesMetrics = await Invoice.aggregate([
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

// 🧠 2. Customer Insights
export const getCustomerInsights = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const ownerFilter = getOwnerFilter(req);

  const insights = await Customer.aggregate([
    { $match: ownerFilter },
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
            cond: { $eq: ["$$order.owner", req.user._id] }
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
    { $sort: { totalSpent: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    status: 'success',
    data: insights
  });
});

// 📦 3. Product Performance
export const getProductPerformance = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  const ownerFilter = getOwnerFilter(req);

  const performance = await Invoice.aggregate([
    { $match: { ...ownerFilter, date: { $gte: start, $lte: end } } },
    { $unwind: "$items" },
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
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productDetails"
      }
    },
    { $unwind: "$productDetails" },
    {
      $match: {
        ...(ownerFilter.owner && { "productDetails.owner": ownerFilter.owner })
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
                {
                  $subtract: [
                    "$totalRevenue",
                    { $multiply: ["$totalQuantity", "$productDetails.costPrice"] }
                  ]
                },
                "$totalRevenue"
              ]
            },
            100
          ]
        }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: performance
  });
});

// 💰 4. Payment Collection Efficiency
export const getPaymentCollectionEfficiency = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  const ownerFilter = getOwnerFilter(req);

  const paymentStats = await Payment.aggregate([
    {
      $match: {
        ...ownerFilter,
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: "$status",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: paymentStats
  });
});

// 📦 5. Inventory Turnover
export const getInventoryTurnover = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  const ownerFilter = getOwnerFilter(req);

  const turnover = await Product.aggregate([
    { $match: ownerFilter },
    {
      $lookup: {
        from: "invoices",
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
                { $eq: ["$$sale.owner", req.user._id] },
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
        totalSold: {
          $sum: {
            $map: {
              input: "$sales",
              as: "sale",
              in: {
                $sum: {
                  $map: {
                    input: "$$sale.items",
                    as: "item",
                    in: {
                      $cond: [
                        { $eq: ["$$item.product", "$_id"] },
                        "$$item.quantity",
                        0
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        averagePrice: {
          $avg: {
            $map: {
              input: "$sales",
              as: "sale",
              in: {
                $avg: {
                  $map: {
                    input: "$$sale.items",
                    as: "item",
                    in: {
                      $cond: [
                        { $eq: ["$$item.product", "$_id"] },
                        "$$item.price",
                        0
                      ]
                    }
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
            else: 0
          }
        }
      }
    },
    { $sort: { turnoverRate: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: turnover
  });
});
