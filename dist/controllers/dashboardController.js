"use strict";
// // controllers/statsController.ts
// import { Request, Response, NextFunction } from 'express';
// import { promises as fs } from 'fs';
// import path from 'path';
// import { Invoice, IInvoice } from '../models/invoiceModel';
// import { Product, IProduct } from '../models/productModel';
// import { Customer, ICustomer } from '../models/customerModel';
// import { Payment, IPayment } from '../models/paymentModel';
// import { Review, IReview } from '../models/ReviewModel';
// import { catchAsync } from '../utils/catchAsyncModule';
// import { ApiFeatures } from '../utils/ApiFeatures';
// import {
//   DateRangeQuery,
//   SalesDataQuery,
//   MonthlySalesQuery,
//   WeeklySalesQuery,
//   DashboardQuery,
//   LowStockQuery,
//   TopSellingQuery,
//   LogQuery,
// } from '../types/requests';
// import {
//   YearlySales,
//   MonthlySales,
//   WeeklySales,
//   TopSellingProduct,
//   CustomerWithDues,
//   TopCustomer,
//   InventoryValue,
//   PaymentMethodStats,
//   OverallRating,
// } from '../types/';
// interface GetDateRangeResult {
//   startDate: Date | null;
//   endDate: Date | null;
// }
// const getDateRange = (
//   period?: string,
//   queryStartDate?: string,
//   queryEndDate?: string
// ): GetDateRangeResult => {
//   let startDate: Date | null = null;
//   let endDate: Date | null = null;
//   const today = new Date();
//   today.setHours(23, 59, 59, 999);
//   if (queryStartDate && queryEndDate) {
//     startDate = new Date(queryStartDate);
//     startDate.setHours(0, 0, 0, 0);
//     endDate = new Date(queryEndDate);
//     endDate.setHours(23, 59, 999);
//     if (endDate > today) {
//       endDate = new Date(today);
//     }
//     return { startDate, endDate };
//   }
//   endDate = new Date(today);
//   switch (period) {
//     case 'today':
//       startDate = new Date(today);
//       startDate.setHours(0, 0, 0, 0);
//       break;
//     case 'yesterday':
//       startDate = new Date(today);
//       startDate.setDate(today.getDate() - 1);
//       startDate.setHours(0, 0, 0, 0);
//       endDate = new Date(startDate);
//       endDate.setHours(23, 59, 59, 999);
//       break;
//     case 'week':
//       startDate = new Date(today);
//       startDate.setDate(today.getDate() - today.getDay());
//       startDate.setHours(0, 0, 0, 0);
//       break;
//     case 'month':
//       startDate = new Date(today.getFullYear(), today.getMonth(), 1);
//       startDate.setHours(0, 0, 0, 0);
//       break;
//     case 'last_month':
//       const lastMonthDate = new Date(today);
//       lastMonthDate.setMonth(today.getMonth() - 1);
//       startDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
//       startDate.setHours(0, 0, 0, 0);
//       endDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0);
//       endDate.setHours(23, 59, 59, 999);
//       break;
//     case 'year':
//       startDate = new Date(today.getFullYear(), 0, 1);
//       startDate.setHours(0, 0, 0, 0);
//       break;
//     default:
//       startDate = null;
//       endDate = null;
//       break;
//   }
//   if (endDate && endDate > today && period !== 'last_month') {
//     endDate = new Date(today);
//   }
//   return { startDate, endDate };
// };
// const getISOWeek = (date: Date): number => {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   d.setDate(d.getDate() + 4 - (d.getDay() || 7));
//   const yearStart = new Date(d.getFullYear(), 0, 1);
//   return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
// };
// const getFirstDayOfISOWeek = (week: number, year: number): Date => {
//   const firstJan = new Date(year, 0, 1);
//   const dayOfWeek = firstJan.getDay();
//   const firstMonday = new Date(year, 0, 1 + (dayOfWeek <= 1 ? 1 - dayOfWeek : 8 - dayOfWeek));
//   const weekStart = new Date(firstMonday);
//   weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
//   weekStart.setHours(0, 0, 0, 0);
//   return weekStart;
// };
// export const getSystemLogs = catchAsync(async (req: Request<{}, {}, {}, LogQuery>, res: Response, next: NextFunction) => {
//   const logFileName = req.query.file || 'combined.log';
//   const logFilePath = path.join(__dirname, '..', 'logs', logFileName);
//   try {
//     await fs.access(logFilePath, fs.constants.R_OK);
//     const logsContent = await fs.readFile(logFilePath, 'utf8');
//     const logLines = logsContent.split('\n').filter((line) => line.trim() !== '');
//     const parsedLogs: Array<{ raw?: string; error?: string } | any> = logLines.map((line) => {
//       try {
//         return JSON.parse(line);
//       } catch (e) {
//         return { raw: line, error: 'JSON parsing failed' };
//       }
//     });
//     const page = parseInt(req.query.page, 10) || 1;
//     const limit = parseInt(req.query.limit, 10) || 50;
//     const startIndex = (page - 1) * limit;
//     const endIndex = page * limit;
//     const paginatedLogs = parsedLogs.slice(startIndex, endIndex);
//     res.status(200).json({
//       status: 'success',
//       results: paginatedLogs.length,
//       totalLogs: parsedLogs.length,
//       page,
//       limit,
//       data: paginatedLogs,
//     });
//   } catch (error: any) {
//     if (error.code === 'ENOENT') {
//       return next(new AppError(`Log file ${logFileName} not found.`, 404));
//     }
//     console.error('Error reading log file:', error);
//     return next(new AppError('Failed to retrieve logs.', 500));
//   }
// });
// export const getSalesDataForCharts = catchAsync(async (req: Request<{}, {}, {}, SalesDataQuery>, res: Response, next: NextFunction) => {
//   const { year } = req.query;
//   const currentYear = new Date().getFullYear();
//   const targetYear = year ? parseInt(year, 10) : currentYear;
//   if (isNaN(targetYear) || targetYear < 1900 || targetYear > currentYear) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid year: ${year}. Must be between 1900 and ${currentYear}.`,
//     });
//   }
//   const startDate = new Date(targetYear, 0, 1);
//   startDate.setHours(0, 0, 0, 0);
//   const endDate = targetYear === currentYear ? new Date() : new Date(targetYear, 11, 31);
//   endDate.setHours(23, 59, 59, 999);
//   const salesData = await Invoice.aggregate<{
//     yearly: YearlySales[];
//     monthly: MonthlySales[];
//     weekly: WeeklySales[];
//   }>([
//     {
//       $match: {
//         invoiceDate: { $gte: startDate, $lte: endDate },
//         status: { $ne: 'cancelled' },
//       },
//     },
//     {
//       $project: {
//         year: { $year: '$invoiceDate' },
//         month: { $month: '$invoiceDate' },
//         day: { $dayOfMonth: '$invoiceDate' },
//         week: { $isoWeek: '$invoiceDate' },
//         totalAmount: '$totalAmount',
//       },
//     },
//     {
//       $facet: {
//         yearly: [
//           {
//             $group: {
//               _id: '$month',
//               totalRevenue: { $sum: '$totalAmount' },
//               salesCount: { $sum: 1 },
//             },
//           },
//           { $sort: { '_id': 1 } },
//           { $project: { _id: 0, month: '$_id', totalRevenue: 1, salesCount: 1 } },
//         ],
//         monthly: [
//           {
//             $group: {
//               _id: { month: '$month', day: '$day' },
//               totalRevenue: { $sum: '$totalAmount' },
//               salesCount: { $sum: 1 },
//             },
//           },
//           { $sort: { '_id.month': 1, '_id.day': 1 } },
//           {
//             $group: {
//               _id: '$_id.month',
//               dailySales: {
//                 $push: {
//                   day: '$_id.day',
//                   totalRevenue: '$totalRevenue',
//                   salesCount: '$salesCount',
//                 },
//               },
//             },
//           },
//           { $sort: { '_id': 1 } },
//           { $project: { _id: 0, month: '$_id', dailySales: 1 } },
//         ],
//         weekly: [
//           {
//             $group: {
//               _id: { week: '$week', year: '$year', month: '$month', day: '$day' },
//               totalRevenue: { $sum: '$totalAmount' },
//               salesCount: { $sum: 1 },
//             },
//           },
//           { $sort: { '_id.week': 1, '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
//           {
//             $group: {
//               _id: '$_id.week',
//               dailySales: {
//                 $push: {
//                   date: {
//                     $dateFromParts: {
//                       year: '$_id.year',
//                       month: '$_id.month',
//                       day: '$_id.day',
//                     },
//                   },
//                   totalRevenue: '$totalRevenue',
//                   salesCount: '$salesCount',
//                 },
//               },
//             },
//           },
//           { $sort: { '_id': 1 } },
//           { $project: { _id: 0, week: '$_id', dailySales: 1 } },
//         ],
//       },
//     },
//   ]);
//   const months = Array.from({ length: 12 }, (_, i) => i + 1);
//   const yearlySales: YearlySales[] = months.map((month) => {
//     const found = salesData[0].yearly.find((data: { month: number; }) => data.month === month);
//     return found || { month, totalRevenue: 0, salesCount: 0 };
//   });
//   const monthlySales: MonthlySales[] = months.map((month) => {
//     const foundMonth = salesData[0].monthly.find((data: { month: number; }) => data.month === month);
//     const daysInMonth = new Date(targetYear, month, 0).getDate();
//     const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
//     const dailySales = days.map((day) => {
//       const foundDay = foundMonth?.dailySales.find((d: { day: number; }) => d.day === day);
//       return foundDay || { day, totalRevenue: 0, salesCount: 0 };
//     });
//     return { month, dailySales };
//   });
//   const weeksInYear = targetYear === currentYear ? getISOWeek(new Date()) : 53;
//   const weeklySales: WeeklySales[] = Array.from({ length: weeksInYear }, (_, i) => i + 1).map((week) => {
//     const foundWeek = salesData[0].weekly.find((data: { week: number; }) => data.week === week);
//     const weekStart = getFirstDayOfISOWeek(week, targetYear);
//     const dailySales: WeeklySales['dailySales'] = [];
//     for (let i = 0; i < 7; i++) {
//       const date = new Date(weekStart);
//       date.setDate(weekStart.getDate() + i);
//       if (date > endDate) break;
//       const dateStr = date.toISOString().split('T')[0];
//       const foundDay = foundWeek?.dailySales.find(
//         (d: { date: { toISOString: () => string; }; }) => d.date.toISOString().split('T')[0] === dateStr
//       );
//       dailySales.push({
//         date: dateStr,
//         totalRevenue: foundDay ? foundDay.totalRevenue : 0,
//         salesCount: foundDay ? foundDay.salesCount : 0,
//       });
//     }
//     return { week, dailySales };
//   });
//   res.status(200).json({
//     success: true,
//     data: {
//       year: targetYear,
//       yearlySales: { monthlySales: yearlySales },
//       monthlySales,
//       weeklySales,
//     },
//   });
// });
// export const getYearlySalesByMonth = catchAsync(async (req: Request<{}, {}, {}, SalesDataQuery>, res: Response, next: NextFunction) => {
//   const { year } = req.query;
//   const currentYear = new Date().getFullYear();
//   const targetYear = year ? parseInt(year, 10) : currentYear;
//   if (isNaN(targetYear) || targetYear < 1900 || targetYear > currentYear) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid year: ${year}. Must be between 1900 and ${currentYear}.`,
//     });
//   }
//   const startDate = new Date(targetYear, 0, 1);
//   startDate.setHours(0, 0, 0, 0);
//   const endDate = new Date(targetYear, 11, 31);
//   endDate.setHours(23, 59, 59, 999);
//   const salesData = await Invoice.aggregate<YearlySales[]>([
//     {
//       $match: {
//         invoiceDate: { $gte: startDate, $lte: endDate },
//         status: { $ne: 'cancelled' },
//       },
//     },
//     {
//       $group: {
//         _id: { month: { $month: '$invoiceDate' } },
//         totalRevenue: { $sum: '$totalAmount' },
//         salesCount: { $sum: 1 },
//       },
//     },
//     { $sort: { '_id.month': 1 } },
//     { $project: { _id: 0, month: '$_id.month', totalRevenue: 1, salesCount: 1 } },
//   ]);
//   const months = Array.from({ length: 12 }, (_, i) => i + 1);
//   const filledData: YearlySales[] = months.map((month) => {
//     const found = salesData.find((data: { month: number; }) => data.month === month);
//     return found || { month, totalRevenue: 0, salesCount: 0 };
//   });
//   res.status(200).json({
//     success: true,
//     data: {
//       year: targetYear,
//       monthlySales: filledData,
//     },
//   });
// });
// export const getMonthlySalesByDay = catchAsync(async (req: Request<{}, {}, {}, MonthlySalesQuery>, res: Response, next: NextFunction) => {
//   const { year, month } = req.query;
//   const currentYear = new Date().getFullYear();
//   const currentMonth = new Date().getMonth() + 1;
//   const targetYear = year ? parseInt(year, 10) : currentYear;
//   const targetMonth = month ? parseInt(month, 10) : currentMonth;
//   if (isNaN(targetYear) || targetYear < 1900 || targetYear > currentYear) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid year: ${year}. Must be between 1900 and ${currentYear}.`,
//     });
//   }
//   if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid month: ${month}. Must be between 1 and 12.`,
//     });
//   }
//   if (targetYear === currentYear && targetMonth > currentMonth) {
//     return res.status(400).json({
//       success: false,
//       message: `Cannot fetch sales for future month: ${targetMonth}/${targetYear}.`,
//     });
//   }
//   const startDate = new Date(targetYear, targetMonth - 1, 1);
//   startDate.setHours(0, 0, 0, 0);
//   const endDate = new Date(targetYear, targetMonth, 0);
//   endDate.setHours(23, 59, 59, 999);
//   const salesData = await Invoice.aggregate<{
//     day: number;
//     totalRevenue: number;
//     salesCount: number;
//   }[]>([
//     {
//       $match: {
//         invoiceDate: { $gte: startDate, $lte: endDate },
//         status: { $ne: 'cancelled' },
//       },
//     },
//     {
//       $group: {
//         _id: { day: { $dayOfMonth: '$invoiceDate' } },
//         totalRevenue: { $sum: '$totalAmount' },
//         salesCount: { $sum: 1 },
//       },
//     },
//     { $sort: { '_id.day': 1 } },
//     { $project: { _id: 0, day: '$_id.day', totalRevenue: 1, salesCount: 1 } },
//   ]);
//   const daysInMonth = endDate.getDate();
//   const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
//   const filledData = days.map((day) => {
//     const found = salesData.find((data: { day: number; }) => data.day === day);
//     return found || { day, totalRevenue: 0, salesCount: 0 };
//   });
//   res.status(200).json({
//     success: true,
//     data: {
//       year: targetYear,
//       month: targetMonth,
//       dailySales: filledData,
//     },
//   });
// });
// export const getWeeklySalesByDay = catchAsync(async (req: Request<{}, {}, {}, WeeklySalesQuery>, res: Response, next: NextFunction) => {
//   const { year, week } = req.query;
//   const currentYear = new Date().getFullYear();
//   const currentWeek = getISOWeek(new Date());
//   const targetYear = year ? parseInt(year, 10) : currentYear;
//   const targetWeek = week ? parseInt(week, 10) : currentWeek;
//   if (isNaN(targetYear) || targetYear < 1900 || targetYear > currentYear) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid year: ${year}. Must be between 1900 and ${currentYear}.`,
//     });
//   }
//   if (isNaN(targetWeek) || targetWeek < 1 || targetWeek > 53) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid week: ${week}. Must be between 1 and 53.`,
//     });
//   }
//   if (targetYear === currentYear && targetWeek > currentWeek) {
//     return res.status(400).json({
//       success: false,
//       message: `Cannot fetch sales for future week: Week ${targetWeek} of ${targetYear}.`,
//     });
//   }
//   const startDate = getFirstDayOfISOWeek(targetWeek, targetYear);
//   const endDate = new Date(startDate);
//   endDate.setDate(startDate.getDate() + 6);
//   endDate.setHours(23, 59, 59, 999);
//   const salesData = await Invoice.aggregate<{
//     date: Date;
//     totalRevenue: number;
//     salesCount: number;
//   }[]>([
//     {
//       $match: {
//         invoiceDate: { $gte: startDate, $lte: endDate },
//         status: { $ne: 'cancelled' },
//       },
//     },
//     {
//       $group: {
//         _id: { day: { $dayOfMonth: '$invoiceDate' }, month: { $month: '$invoiceDate' }, year: { $year: '$invoiceDate' } },
//         totalRevenue: { $sum: '$totalAmount' },
//         salesCount: { $sum: 1 },
//       },
//     },
//     { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
//     {
//       $project: {
//         _id: 0,
//         date: {
//           $dateFromParts: {
//             year: '$_id.year',
//             month: '$_id.month',
//             day: '$_id.day',
//           },
//         },
//         totalRevenue: 1,
//         salesCount: 1,
//       },
//     },
//   ]);
//   const filledData: { date: string; totalRevenue: number; salesCount: number }[] = [];
//   for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
//     const dateStr = d.toISOString().split('T')[0];
//     const found = salesData.find((data: { date: { toISOString: () => string; }; }) => data.date.toISOString().split('T')[0] === dateStr);
//     filledData.push({
//       date: dateStr,
//       totalRevenue: found ? found.totalRevenue : 0,
//       salesCount: found ? found.salesCount : 0,
//     });
//   }
//   res.status(200).json({
//     success: true,
//     data: {
//       year: targetYear,
//       week: targetWeek,
//       dailySales: filledData,
//     },
//   });
// });
// export const getDashboardSummary = catchAsync(async (req: Request<{}, {}, {}, DashboardQuery>, res: Response, next: NextFunction) => {
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const lowStockThreshold = parseInt(req.query.lowStockThreshold, 10) || 10;
//   const listLimits = parseInt(req.query.listLimits, 10) || 15;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const dateMatchCriteria = (sDate: Date | null, eDate: Date | null, dateField = 'invoiceDate') => {
//     const match: { [key: string]: any } = {};
//     if (sDate && eDate) {
//       match[dateField] = { $gte: sDate, $lte: eDate };
//     }
//     return match;
//   };
//   const [
//     totalRevenueData,
//     salesCountData,
//     lowStockProductsData,
//     topSellingProductsData,
//     customersWithDuesData,
//     newCustomersCountData,
//     totalPaymentsReceivedData,
//   ] = await Promise.all([
//     Invoice.aggregate<{ total: number }>([
//       { $match: dateMatchCriteria(startDate, endDate) },
//       { $group: { _id: null, total: { $sum: '$totalAmount' } } },
//     ]),
//     Invoice.countDocuments(dateMatchCriteria(startDate, endDate)),
//     Product.find({ stock: { $lt: lowStockThreshold, $gte: 0 } })
//       .limit(listLimits)
//       .select('title stock sku category brand rate thumbnail'),
//     Invoice.aggregate<TopSellingProduct>([
//       { $match: dateMatchCriteria(startDate, endDate) },
//       { $unwind: '$items' },
//       {
//         $group: {
//           _id: '$items.product',
//           totalRevenue: { $sum: '$items.amount' },
//           totalQuantitySold: { $sum: '$items.quantity' },
//         },
//       },
//       { $sort: { totalRevenue: -1 } },
//       { $limit: listLimits },
//       { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
//       { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
//       {
//         $project: {
//           productId: '$_id',
//           title: { $ifNull: ['$productDetails.title', '$items.customTitle'] },
//           totalRevenue: 1,
//           totalQuantitySold: 1,
//         },
//       },
//     ]),
//     Customer.find({ remainingAmount: { $gt: 0 } })
//       .sort({ remainingAmount: -1 })
//       .limit(listLimits)
//       .select('fullname mobileNumber email remainingAmount'),
//     Customer.countDocuments(dateMatchCriteria(startDate, endDate, 'createdAt')),
//     Payment.aggregate<{ total: number }>([
//       { $match: { ...dateMatchCriteria(startDate, endDate, 'createdAt'), status: 'completed' } },
//       { $group: { _id: null, total: { $sum: '$amount' } } },
//     ]),
//   ]);
//   const revenue = totalRevenueData.length > 0 ? totalRevenueData[0].total : 0;
//   const salesCount = salesCountData || 0;
//   res.status(200).json({
//     success: true,
//     data: {
//       sales: {
//         totalRevenue: revenue,
//         numberOfSales: salesCount,
//         averageOrderValue: salesCount > 0 ? revenue / salesCount : 0,
//       },
//       products: {
//         lowStock: lowStockProductsData,
//         topSelling: topSellingProductsData,
//       },
//       customers: {
//         outstandingPayments: customersWithDuesData,
//         newCustomersCount: newCustomersCountData,
//       },
//       payments: {
//         totalReceived: totalPaymentsReceivedData.length > 0 ? totalPaymentsReceivedData[0].total : 0,
//       },
//     },
//   });
// });
// export const getTotalRevenue = catchAsync(async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response, next: NextFunction) => {
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const matchStage: { invoiceDate?: { $gte: Date; $lte: Date } } = {};
//   if (startDate && endDate) {
//     matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
//   }
//   const revenueData = await Invoice.aggregate<{ totalRevenue: number }>([
//     { $match: matchStage },
//     { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
//   ]);
//   const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
//   res.status(200).json({ success: true, data: { totalRevenue } });
// });
// export const getSalesCount = catchAsync(async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response, next: NextFunction) => {
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const query: { invoiceDate?: { $gte: Date; $lte: Date } } = {};
//   if (startDate && endDate) {
//     query.invoiceDate = { $gte: startDate, $lte: endDate };
//   }
//   const salesCount = await Invoice.countDocuments(query);
//   res.status(200).json({ success: true, data: { salesCount } });
// });
// export const getAverageOrderValue = catchAsync(async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response, next: NextFunction) => {
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const matchStage: { invoiceDate?: { $gte: Date; $lte: Date } } = {};
//   if (startDate && endDate) {
//     matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
//   }
//   const salesData = await Invoice.aggregate<{
//     totalRevenue: number;
//     numberOfSales: number;
//   }>([
//     { $match: matchStage },
//     {
//       $group: {
//         _id: null,
//         totalRevenue: { $sum: '$totalAmount' },
//         numberOfSales: { $sum: 1 },
//       },
//     },
//   ]);
//   const averageOrderValue =
//     salesData.length > 0 && salesData[0].numberOfSales > 0
//       ? salesData[0].totalRevenue / salesData[0].numberOfSales
//       : 0;
//   res.status(200).json({ success: true, data: { averageOrderValue } });
// });
// export const getSalesTrends = catchAsync(async (req: Request<{}, {}, {}, { days?: string }>, res: Response, next: NextFunction) => {
//   const days = parseInt(req.query.days, 10) || 30;
//   const NdaysAgo = new Date();
//   NdaysAgo.setDate(NdaysAgo.getDate() - days + 1);
//   NdaysAgo.setHours(0, 0, 0, 0);
//   const todayEnd = new Date();
//   todayEnd.setHours(23, 59, 59, 999);
//   const trends = await Invoice.aggregate<{
//     _id: string;
//     dailyRevenue: number;
//     dailySalesCount: number;
//   }>([
//     { $match: { invoiceDate: { $gte: NdaysAgo, $lte: todayEnd } } },
//     {
//       $group: {
//         _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' } },
//         dailyRevenue: { $sum: '$totalAmount' },
//         dailySalesCount: { $sum: 1 },
//       },
//     },
//     { $sort: { _id: 1 } },
//   ]);
//   res.status(200).json({ success: true, data: trends });
// });
// export const getLowStockProducts = catchAsync(async (req: Request<{}, {}, {}, LowStockQuery>, res: Response, next: NextFunction) => {
//   const threshold = parseInt(req.query.threshold, 10) || 10;
//   const limit = parseInt(req.query.limit, 10) || 10;
//   const products = await Product.find({
//     stock: { $lt: threshold, $gte: 0 },
//   })
//     .limit(limit)
//     .select('title slug stock sku availabilityStatus');
//   res.status(200).json({ success: true, data: products });
// });
// export const getOutOfStockProducts = catchAsync(async (req: Request<{}, {}, {}, { limit?: string }>, res: Response, next: NextFunction) => {
//   const limit = parseInt(req.query.limit, 10) || 10;
//   const products = await Product.find({ stock: { $eq: 0 } })
//     .limit(limit)
//     .select('title slug stock sku availabilityStatus');
//   res.status(200).json({ success: true, data: products });
// });
// export const getTopSellingProducts = catchAsync(async (req: Request<{}, {}, {}, TopSellingQuery>, res: Response, next: NextFunction) => {
//   const limit = parseInt(req.query.limit, 10) || 5;
//   const sortBy = req.query.sortBy === 'quantity' ? 'totalQuantitySold' : 'totalRevenue';
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const matchStage: { invoiceDate?: { $gte: Date; $lte: Date } } = {};
//   if (startDate && endDate) {
//     matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
//   }
//   const topProducts = await Invoice.aggregate<TopSellingProduct>([
//     { $match: matchStage },
//     { $unwind: '$items' },
//     {
//       $group: {
//         _id: '$items.product',
//         totalRevenue: { $sum: '$items.amount' },
//         totalQuantitySold: { $sum: '$items.quantity' },
//       },
//     },
//     { $sort: { [sortBy]: -1 } },
//     { $limit: limit },
//     { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
//     { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
//     {
//       $project: {
//         productId: '$_id',
//         title: { $ifNull: ['$productDetails.title', '$items.customTitle'] },
//         slug: '$productDetails.slug',
//         thumbnail: '$productDetails.thumbnail',
//         totalRevenue: 1,
//         totalQuantitySold: 1,
//       },
//     },
//   ]);
//   res.status(200).json({ success: true, data: topProducts });
// });
// export const getTotalInventoryValue = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//   const inventoryData = await Product.aggregate<InventoryValue>([
//     {
//       $group: {
//         _id: null,
//         totalValue: { $sum: { $multiply: ['$stock', '$rate'] } },
//         totalItemsInStock: { $sum: '$stock' },
//       },
//     },
//   ]);
//   const result = inventoryData.length > 0 ? inventoryData[0] : { totalValue: 0, totalItemsInStock: 0 };
//   res.status(200).json({ success: true, data: result });
// });
// export const getCustomersWithOutstandingPayments = catchAsync(async (req: Request<{}, {}, {}, { limit?: string }>, res: Response, next: NextFunction) => {
//   const limit = parseInt(req.query.limit, 10) || 10;
//   const customers = await Customer.find({ remainingAmount: { $gt: 0 } })
//     .sort({ remainingAmount: -1 })
//     .limit(limit)
//     .select('fullname email mobileNumber remainingAmount totalPurchasedAmount');
//   res.status(200).json({ success: true, data: customers });
// });
// export const getTopCustomersByPurchase = catchAsync(async (req: Request<{}, {}, {}, TopSellingQuery>, res: Response, next: NextFunction) => {
//   const limit = parseInt(req.query.limit, 10) || 5;
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   if (period || (queryStartDate && queryEndDate)) {
//     const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//     const matchStage: { invoiceDate?: { $gte: Date; $lte: Date } } = {};
//     if (startDate && endDate) {
//       matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
//     }
//     const topCustomers = await Invoice.aggregate<TopCustomer>([
//       { $match: matchStage },
//       {
//         $group: {
//           _id: '$buyer',
//           periodPurchasedAmount: { $sum: '$totalAmount' },
//         },
//       },
//       { $sort: { periodPurchasedAmount: -1 } },
//       { $limit: limit },
//       { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customerDetails' } },
//       { $unwind: '$customerDetails' },
//       {
//         $project: {
//           _id: '$customerDetails._id',
//           fullname: '$customerDetails.fullname',
//           email: '$customerDetails.email',
//           periodPurchasedAmount: 1,
//           totalPurchasedAmountGlobal: '$customerDetails.totalPurchasedAmount',
//         },
//       },
//     ]);
//     return res.status(200).json({ success: true, data: topCustomers });
//   } else {
//     const customers = await Customer.find({})
//       .sort({ totalPurchasedAmount: -1 })
//       .limit(limit)
//       .select('fullname email totalPurchasedAmount remainingAmount');
//     return res.status(200).json({ success: true, data: customers });
//   }
// });
// export const getNewCustomersCount = catchAsync(async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response, next: NextFunction) => {
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const query: { createdAt?: { $gte: Date; $lte: Date } } = {};
//   if (startDate && endDate) {
//     query.createdAt = { $gte: startDate, $lte: endDate };
//   }
//   const count = await Customer.countDocuments(query);
//   res.status(200).json({ success: true, data: { newCustomersCount: count } });
// });
// export const getTotalPaymentsReceived = catchAsync(async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response, next: NextFunction) => {
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const matchStage: { status: string; createdAt?: { $gte: Date; $lte: Date } } = { status: 'completed' };
//   if (startDate && endDate) {
//     matchStage.createdAt = { $gte: startDate, $lte: endDate };
//   }
//   const paymentData = await Payment.aggregate<{ totalPaymentsReceived: number }>([
//     { $match: matchStage },
//     { $group: { _id: null, totalPaymentsReceived: { $sum: '$amount' } } },
//   ]);
//   const totalReceived = paymentData.length > 0 ? paymentData[0].totalPaymentsReceived : 0;
//   res.status(200).json({ success: true, data: { totalPaymentsReceived: totalReceived } });
// });
// export const getPaymentsByMethod = catchAsync(async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response, next: NextFunction) => {
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const matchStage: { status: string; createdAt?: { $gte: Date; $lte: Date } } = { status: 'completed' };
//   if (startDate && endDate) {
//     matchStage.createdAt = { $gte: startDate, $lte: endDate };
//   }
//   const methods = await Payment.aggregate<PaymentMethodStats>([
//     { $match: matchStage },
//     {
//       $group: {
//         _id: '$paymentMethod',
//         totalAmount: { $sum: '$amount' },
//         count: { $sum: 1 },
//       },
//     },
//     { $sort: { totalAmount: -1 } },
//   ]);
//   res.status(200).json({ success: true, data: methods });
// });
// export const getFailedPaymentsCount = catchAsync(async (req: Request<{}, {}, {}, DateRangeQuery>, res: Response, next: NextFunction) => {
//   const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//   const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//   const query: { status: string; createdAt?: { $gte: Date; $lte: Date } } = { status: 'failed' };
//   if (startDate && endDate) {
//     query.createdAt = { $gte: startDate, $lte: endDate };
//   }
//   const count = await Payment.countDocuments(query);
//   res.status(200).json({ success: true, data: { failedPaymentsCount: count } });
// });
// export const getOverallAverageRating = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//   const overallStats = await Product.aggregate<OverallRating>([
//     { $match: { ratingQuantity: { $gt: 0 } } },
//     {
//       $group: {
//         _id: null,
//         totalWeightedRatingSum: { $sum: { $multiply: ['$ratingAverage', '$ratingQuantity'] } },
//         totalRatingQuantity: { $sum: '$ratingQuantity' },
//       },
//     },
//     {
//       $project: {
//         _id: 0,
//         overallAverage: {
//           $cond: [
//             { $eq: ['$totalRatingQuantity', 0] },
//             0,
//             { $divide: ['$totalWeightedRatingSum', '$totalRatingQuantity'] },
//           ],
//         },
//         totalReviewsConsidered: '$totalRatingQuantity',
//       },
//     },
//   ]);
//   const result = overallStats.length > 0 ? overallStats[0] : { overallAverage: 0, totalReviewsConsidered: 0 };
//   res.status(200).json({ success: true, data: result });
// });
// export const getRecentReviews = catchAsync(async (req: Request<{}, {}, {}, { limit?: string }>, res: Response, next: NextFunction) => {
//   const limit = parseInt(req.?query?.limit, 10) || 5;
//   const reviews = await Review.find({})
//     .sort({ createdAt: -1 })
//     .limit(limit)
//     .populate('user', 'fullname email')
//     .populate('product', 'title thumbnail slug');
//   res.status(200).json({ success: true, data: reviews });
// });
//# sourceMappingURL=dashboardController.js.map