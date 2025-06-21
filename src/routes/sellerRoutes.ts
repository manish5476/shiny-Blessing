import express, { Router } from 'express';
import * as sellerController from '../controllers/sellerController';
import { protect, restrictTo } from '../controllers/authController';

const router: Router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Admin/staff-only routes
router
  .route('/')
  .get(restrictTo('admin', 'superAdmin'), sellerController.getAllSeller)
  .post(restrictTo('admin', 'superAdmin'), sellerController.newSeller);

router
  .route('/:id')
  .get(restrictTo('admin', 'superAdmin'), sellerController.getSellerById)
  .patch(restrictTo('admin', 'superAdmin'), sellerController.updateSeller)
  .delete(restrictTo('admin', 'superAdmin'), sellerController.deleteSeller);

export default router;