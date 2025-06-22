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

// Admin/seller-only routes
router
  .route('/')
  .post(restrictTo('admin', 'seller'), findDuplicateProduct, newProduct)
  .delete(restrictTo('admin', 'seller'), deleteMultipleProduct);

router
  .route('/:id')
  .patch(restrictTo('admin', 'seller'), updateProduct)
  .delete(restrictTo('admin', 'seller'), deleteProduct);

// Nested review routes
router.use('/:productId/reviews', reviewRoutes);

export default router;