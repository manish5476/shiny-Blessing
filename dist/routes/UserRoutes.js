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
const express_1 = __importDefault(require("express"));
const authController = __importStar(require("../controllers/authController"));
const userController = __importStar(require("../controllers/userController"));
const router = express_1.default.Router();
// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
// Protected routes
router.use(authController.protect);
// User-accessible routes
router.get('/me', userController.getMe);
router.patch('/updatePassword', authController.updateUserPassword);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);
// Admin/seller-only routes
router
    .route('/')
    .get(userController.getAllUsers);
router
    .route('/:id')
    .get(userController.getUserById)
    .patch(authController.restrictTo('admin', 'seller'), userController.updateUser)
    .delete(authController.restrictTo('admin'), userController.deleteUser);
exports.default = router;
// // const fs = require('fs');
// const express = require("express");
// const router = express.Router();
// const app = express();
// const authController = require("../Controllers/authController");
// const usercontroller = require("../Controllers/usercontroller");
// app.use(express.json());
// router.post("/signup", authController.signup);
// router.post("/login", authController.login);
// router.post("/forgotPassword", authController.forgotPassword);
// router.patch("/resetPassword/:token", authController.resetPassword);
// router.use(authController.protect);
// // router.get("/me", usercontroller.getMe, usercontroller.getAllUsers);
// router.get("/me", usercontroller.getMe);
// router.get("/allusers", usercontroller.getAllUsers);
// router.patch("/updatePassword", authController.updateUserPassword);
// router.route("/updateMe").patch(usercontroller.updateMe);
// router.route("/deleteMe").delete(usercontroller.deleteMe);
// // do not update password with this
// router.route("/updateUser/:id").patch(authController.restrictTo("admin", "staff"), usercontroller.updateUser);
// router.route("/").get(usercontroller.getAllUsers);
// router.route("/:id").get(usercontroller.getUserById);
// router.route("/deleteUser/:id").delete(authController.restrictTo("admin"), usercontroller.deleteUser);
// module.exports = router;
// /**const express = require('express');
// const router = express.Router();
// const authController = require('../Controllers/authController');
// const userController = require('../Controllers/usercontroller');
// // Public routes (no authentication)
// router.post('/signup', authController.signup);
// router.post('/login', authController.login);
// router.post('/forgotPassword', authController.forgotPassword);
// router.patch('/resetPassword/:token', authController.resetPassword);
// // Protected routes (require authentication)
// router.use(authController.protect);
// // User-accessible routes
// router.get('/me', userController.getMe); // User can view their own profile
// router.patch('/updatePassword', authController.updateUserPassword); // User can update their password
// router.patch('/updateMe', userController.updateMe); // User can update their profile
// router.delete('/deleteMe', userController.deleteMe); // User can deactivate their account
// // Admin/staff-only routes
// router.get('/allusers', authController.restrictTo('admin', 'staff'), userController.getAllUsers); // View all users
// router.patch('/updateUser/:id', authController.restrictTo('admin', 'staff'), userController.updateUser); // Update any user
// router.get('/:id', authController.restrictTo('admin', 'staff'), userController.getAllUsersById); // View any user by ID
// router.delete('/deleteUser/:id', authController.restrictTo('admin'), userController.deleteUser); // Delete any user
// module.exports = router; */
//# sourceMappingURL=UserRoutes.js.map