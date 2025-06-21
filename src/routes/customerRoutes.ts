// src/routes/customerRoutes.ts
import express, { Router } from 'express';
import * as customerController from '../controllers/customerController';
import { protect, restrictTo } from '../controllers/authController';

const router: Router = express.Router();

// Protected routes (require authentication)
router.use(protect);

router.get('/:id', customerController.getCustomerById);

// Admin/superAdmin-only routes
router
  .route('/')
  .get(restrictTo('admin', 'superAdmin'), customerController.getAllCustomer)
  .post(restrictTo('admin', 'superAdmin'), customerController.findDuplicateCustomer, customerController.newCustomer)
  .delete(restrictTo('admin', 'superAdmin'), customerController.deleteMultipleCustomer);

router
  .route('/:id')
  .patch(restrictTo('admin', 'superAdmin'), customerController.updateCustomer)
  .delete(restrictTo('admin', 'superAdmin'), customerController.deleteCustomer);

// Dropdown for admins
router.get('/customerDropDown', restrictTo('admin', 'superAdmin'), customerController.getCustomerDropdown);

export default router;
// import express, { Router } from 'express';
// import * as customerController from '../controllers/customerController';
// import { protect, restrictTo } from '../controllers/authController';

// const router: Router = express.Router();

// // Protected routes (require authentication)
// router.use(protect);

// // User-accessible routes
// router.get('/:id', customerController.getCustomerById);

// // Admin/superAdmin-only routes
// router
//   .route('/')
//   .get(restrictTo('admin', 'superAdmin'), customerController.getAllCustomers)
//   .post(restrictTo('admin', 'superAdmin'), customerController.findDuplicateCustomer, customerController.newCustomer)
//   .delete(restrictTo('admin', 'superAdmin'), customerController.deactivateMultipleCustomers);

// router
//   .route('/:id')
//   .patch(restrictTo('admin', 'superAdmin'), customerController.updateCustomer)
//   .delete(restrictTo('admin', 'superAdmin'), customerController.deleteCustomer);

// // Dropdown for admins
// router.get('/customerDropDown', restrictTo('admin', 'superAdmin'), customerController.getCustomerDropdown);

// export default router;