import express, { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController';
import { protect, restrictTo } from '../controllers/authController';

const router: Router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// User-accessible routes
router
  .route('/:id')
  .get(invoiceController.getInvoiceById)
  .patch(restrictTo('admin', 'superAdmin'), invoiceController.updateInvoice)
  .delete(restrictTo('admin', 'superAdmin'), invoiceController.deleteInvoice);

// Admin/staff-only routes
router
  .route('/')
  .get(restrictTo('admin', 'superAdmin'), invoiceController.getAllInvoice)
  .post(restrictTo('admin', 'superAdmin'), invoiceController.findDuplicateInvoice, invoiceController.newInvoice);

router.post('/productSales', restrictTo('admin', 'superAdmin'), invoiceController.getProductSales);

export default router;