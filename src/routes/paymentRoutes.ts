import express, { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { protect, restrictTo } from '../controllers/authController';

const router: Router = express.Router();
router.use(protect);
router
  .route('/')
  .post(paymentController.newPayment)
  .get(restrictTo('admin', 'seller'), paymentController.getAllPayment);

router
  .route('/:id')
  .get(paymentController.getPaymentById)
  .patch(restrictTo('admin', 'seller'), paymentController.updatePayment)
  .delete(restrictTo('admin', 'seller'), paymentController.deletePayment);

// Bulk delete for admin/seller
router.delete('/bulk', restrictTo('admin', 'seller'), paymentController.deleteMultiplePayment);

export default router;