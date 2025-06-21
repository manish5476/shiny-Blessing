import express, { Router } from 'express';
import {
  getAllProduct,
  getProductById,
  newProduct,
  deleteProduct,
  updateProduct,
  findDuplicateProduct,
  deleteMultipleProduct,
} from '../controllers/productController';
import { protect, restrictTo } from '../controllers/authController';
import reviewRoutes from './reviewRoutes';

const router: Router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// User-accessible routes
router.get('/', getAllProduct);
router.get('/:id', getProductById);

// Admin/staff-only routes
router
  .route('/')
  .post(restrictTo('admin', 'staff'), findDuplicateProduct, newProduct)
  .delete(restrictTo('admin', 'staff'), deleteMultipleProduct);

router
  .route('/:id')
  .patch(restrictTo('admin', 'staff'), updateProduct)
  .delete(restrictTo('admin', 'staff'), deleteProduct);

// Nested review routes
router.use('/:productId/reviews', reviewRoutes);

export default router;