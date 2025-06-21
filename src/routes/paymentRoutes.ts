import express, { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { protect, restrictTo } from '../controllers/authController';

const router: Router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// User-accessible routes
router
  .route('/')
  .post(paymentController.newPayment)
  .get(restrictTo('admin', 'staff'), paymentController.getAllPayment);

router
  .route('/:id')
  .get(paymentController.getPaymentById)
  .patch(restrictTo('admin', 'staff'), paymentController.updatePayment)
  .delete(restrictTo('admin', 'staff'), paymentController.deletePayment);

// Bulk delete for admin/staff
router.delete('/bulk', restrictTo('admin', 'staff'), paymentController.deleteMultiplePayment);

export default router;