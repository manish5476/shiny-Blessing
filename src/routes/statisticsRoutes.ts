// import express, { Router } from 'express';
// import * as statisticsController from '../controllers/statisticsController';
// import { protect, restrictTo } from '../controllers/authController';

// const router: Router = express.Router();

// // Protect all routes and restrict to superAdmin
// router.use(protect);
// router.use(restrictTo('superAdmin'));

// // Dashboard overview statistics
// router.get('/dashboard', statisticsController.getDashboardStats);
// // Top selling products
// router.get('/top-products', statisticsController.getTopSellingProducts);
// // Customer payment statistics
// router.get('/customer-payments', statisticsController.getCustomerPaymentStats);
// // Monthly sales trend
// router.get('/sales-trend', statisticsController.getMonthlySalesTrend);
// // Upcoming EMI payments
// router.get('/upcoming-emis', statisticsController.getUpcomingEMIPayments);
// // Inventory status
// router.get('/inventory', statisticsController.getInventoryStatus);

// export default router;