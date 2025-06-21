"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/customerRoutes.ts
const express_1 = __importDefault(require("express"));
const customerController = __importStar(require("../controllers/customerController"));
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
// Protected routes (require authentication)
router.use(authController_1.protect);
router.get('/:id', customerController.getCustomerById);
// Admin/superAdmin-only routes
router
    .route('/')
    .get((0, authController_1.restrictTo)('admin', 'superAdmin'), customerController.getAllCustomer)
    .post((0, authController_1.restrictTo)('admin', 'superAdmin'), customerController.findDuplicateCustomer, customerController.newCustomer)
    .delete((0, authController_1.restrictTo)('admin', 'superAdmin'), customerController.deleteMultipleCustomer);
router
    .route('/:id')
    .patch((0, authController_1.restrictTo)('admin', 'superAdmin'), customerController.updateCustomer)
    .delete((0, authController_1.restrictTo)('admin', 'superAdmin'), customerController.deleteCustomer);
// Dropdown for admins
router.get('/customerDropDown', (0, authController_1.restrictTo)('admin', 'superAdmin'), customerController.getCustomerDropdown);
exports.default = router;
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
//# sourceMappingURL=customerRoutes.js.map