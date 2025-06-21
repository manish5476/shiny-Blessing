import * as authController from '../controllers/authController';
import * as paymentController from '../controllers/paymentController';

import express from 'express';
const router = express.Router();
// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.post('/', paymentController.newPayment); // Users can create payments
router.get('/:id', paymentController.getPaymentById); // Users can view their payment

// Admin/staff-only routes
router.get('/', paymentController.getAllPayment); 
router.patch('/:id', paymentController.updatePayment); 
router.delete('/:id', paymentController.deletePayment); 

module.exports = router;
export default router; // ✅ Use default export
