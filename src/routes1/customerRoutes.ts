// src/routes/customerRoutes.ts

import express from 'express';
import * as authController from '../controllers/authController';
import * as customerController from '../controllers/customerController'; // Import the customer controller

const router = express.Router();

// All routes after this point will be protected
// Make sure authController.protect is itself a middleware function.
router.use(authController.protect);

// Customer routes that require authentication and ownership checks
// GET all customers for the authenticated user (or all if superAdmin)
router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);

// POST new customer
// Use the spread operator (...) because customerController.newCustomer is an array of middlewares
router.post(
  '/',
  customerController.uploadCustomerProfilePhoto, // If you have file uploads before validation
  customerController.resizeCustomerProfilePhoto,  // If you process photos before saving
  customerController.findDuplicateCustomer,      // Custom duplicate check middleware
  ...customerController.newCustomer              // Spread the validation and creation logic
);

// PATCH (update) a customer by ID
router.patch('/:id', customerController.updateCustomer);

// DELETE a customer by ID
router.delete('/:id', customerController.deleteCustomer);

// Specific routes for customers
router.patch('/deactivate-multiple', customerController.deactivateMultipleCustomers);
router.get('/dropdown', customerController.getCustomerDropdown);
router.get('/sales-statistics', customerController.getProductSales); // Assuming this is for invoice sales, but related to customers

export default router;