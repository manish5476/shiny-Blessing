import express from 'express';
import * as productController from '../controllers/productController';
import * as authController from '../controllers/authController';
import * as masterListController from '../controllers/masterListController';
import reviewRoutes from './reviewRoutes';

const router = express.Router();

// Public routes
router.get('/DropdownData', productController.getProductDropdownWithId);
router.get('/autopopulate', masterListController.getMasterList);

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/', productController.getAllProduct);
router.get('/:id', productController.getProductById);

// Admin/staff-only routesw
router.post('/', authController.restrictTo('admin', 'staff'), productController.findDuplicateProduct, productController.newProduct);
router.patch('/:id', authController.restrictTo('admin', 'staff'), productController.updateProduct);
router.delete('/:id', authController.restrictTo('admin', 'staff'), productController.deleteProduct);
router.delete('/deletemany', authController.restrictTo('admin', 'staff'), productController.deleteMultipleProduct);

// Nested review routes
router.use('/:productId/reviews', reviewRoutes);

export default router;