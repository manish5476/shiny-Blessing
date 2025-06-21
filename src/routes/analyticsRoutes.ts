import express, { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { protect, restrictTo } from '../controllers/authController';

const router: Router = express.Router();

// Protect all routes and restrict to superAdmin
router.use(protect);
router.use(restrictTo('superAdmin'));

// Sales performance metrics
router.get('/sales-performance', analyticsController.getSalesPerformance);

// Customer insights
router.get('/customer-insights', analyticsController.getCustomerInsights);

// Product performance analysis
router.get('/product-performance', analyticsController.getProductPerformance);

// Payment collection efficiency
router.get('/payment-efficiency', analyticsController.getPaymentCollectionEfficiency);

// Inventory turnover rate
router.get('/inventory-turnover', analyticsController.getInventoryTurnover);

export default router;