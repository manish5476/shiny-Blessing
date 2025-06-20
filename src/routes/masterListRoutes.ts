import express from 'express';
import * as authController from '../controllers/authController';
import * as masterListController from '../controllers/masterListController';

const router = express.Router();

// Public routes
// const express = require('express');
// const router = express.Router();
const masterListController = require('../Controllers/masterListController');
// const authController = require('../Controllers/authController');

// Protect all routes
router.use(authController.protect);

// Get all master lists
router.get('/', masterListController.getMasterList);
router.get('/:module', masterListController.getModuleMasterList);
router.get('/search/:module', masterListController.searchMasterList);

module.exports = router; 