// const fs = require('fs');

// const authController = require("../Controllers/authController");
import express from 'express';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';

const router = express.Router();

// Public routes (no authentication)
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/me', userController.getMe);
router.patch('/updatePassword', authController.updateUserPassword);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

// Admin/staff-only routes
router.get('/allusers', userController.getAllUsers);
router.patch('/updateUser/:id', authController.restrictTo('admin', 'staff'), userController.updateUser);
router.get('/:id', userController.getUserById);
router.delete('/deleteUser/:id', authController.restrictTo('admin'), userController.deleteUser);

export default router;

/**const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const userController = require('../Controllers/usercontroller');

// Public routes (no authentication)
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/me', userController.getMe); // User can view their own profile
router.patch('/updatePassword', authController.updateUserPassword); // User can update their password
router.patch('/updateMe', userController.updateMe); // User can update their profile
router.delete('/deleteMe', userController.deleteMe); // User can deactivate their account

// Admin/staff-only routes
router.get('/allusers', authController.restrictTo('admin', 'staff'), userController.getAllUsers); // View all users
router.patch('/updateUser/:id', authController.restrictTo('admin', 'staff'), userController.updateUser); // Update any user
router.get('/:id', authController.restrictTo('admin', 'staff'), userController.getAllUsersById); // View any user by ID
router.delete('/deleteUser/:id', authController.restrictTo('admin'), userController.deleteUser); // Delete any user

module.exports = router; */