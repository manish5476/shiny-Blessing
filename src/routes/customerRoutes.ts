import express from 'express';
import * as authController from '../controllers/authController';
import * as customerController from '../controllers/customerController';

const router = express.Router();

// Protected routes (require authentication)
router.use(authController.protect);

// Customer routes
router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.patch('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

// Admin/staff-only routes
router.get('/', authController.restrictTo('admin', 'staff'), customerController.getAllCustomer); // View all customers
router.post('/', authController.restrictTo('admin', 'staff'), customerController.findDuplicateCustomer, customerController.newCustomer); // Create customer
router.patch('/:id', authController.restrictTo('admin', 'staff'), customerController.updateCustomer); // Update customer
router.delete('/:id', authController.restrictTo('admin', 'staff'), customerController.deleteCustomer); // Delete customer
// router.delete('/deletemany', authController.restrictTo('admin', 'staff'), customerController.deleteMultipleCustomer); // Delete multiple customers
// authController.restrictTo('admin', 'staff'),
// router.get('/customerDropDown', customerController.getCustomerDropdown); // Dropdown for admins

module.exports = router;