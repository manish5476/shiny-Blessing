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
exports.updateUser = exports.deleteUser = exports.getUserById = exports.getAllUsers = exports.deleteMe = exports.updateMe = exports.getMe = void 0;
const UserModel_1 = __importDefault(require("../models/UserModel"));
const catchAsyncModule_1 = require("../utils/catchAsyncModule");
const appError_1 = __importDefault(require("../utils/appError"));
const handleFactory = __importStar(require("./handleFactory"));
const filterObj = (obj, ...allowedFields) => {
    return Object.fromEntries(Object.entries(obj).filter(([key]) => allowedFields.includes(key)));
};
const createSendToken = (user, statusCode, res) => {
    res.status(statusCode).json({
        status: 'success',
        data: { user: user || null },
    });
};
// Middleware: /me -> /:id
const getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};
exports.getMe = getMe;
// PATCH /updateMe
exports.updateMe = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
        return next(new appError_1.default('Use dedicated password update route', 400));
    }
    const filteredBody = filterObj(req.body, 'name', 'email');
    const updatedUser = await UserModel_1.default.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true,
    });
    createSendToken(updatedUser, 200, res);
});
// DELETE /deleteMe
exports.deleteMe = (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    await UserModel_1.default.findByIdAndUpdate(req.user.id, { active: false });
    res.status(204).json({ status: 'success', data: null });
});
// Generic CRUD operations
exports.getAllUsers = handleFactory.getAll(UserModel_1.default);
exports.getUserById = handleFactory.getOne(UserModel_1.default);
exports.deleteUser = handleFactory.deleteOne(UserModel_1.default);
exports.updateUser = handleFactory.updateOne(UserModel_1.default);
// const User = require("../Models/UserModel");
// const catchAsync = require("../utils/catchAsyncModule");
// const AppError = require("../utils/appError");
// const handleFactory = require("./handleFactory");
// const filterObj = (obj: { [s: string]: unknown; } | ArrayLike<unknown>, ...allowedFields: string[]) => {
//   return Object.fromEntries(
//     Object.entries(obj).filter(([key]) => allowedFields.includes(key))
//   );
// };
// const createSendToken = (user: any, statusCode: number, res: { status: (arg0: any) => { (): any; new(): any; json: { (arg0: { status: string; data: { user: any; }; }): void; new(): any; }; }; }) => {
//   res.status(statusCode).json({
//     status: "success",
//     data: { user: user || null },
//   });
// };
// exports.getMe = (req: { params: { id: any; }; user: { id: any; }; }, res: any, next: () => void) => {
//   req.params.id = req.user.id;
//   next();
// };
// exports.updateMe = catchAsync(async (req: { body: { [s: string]: unknown; } | ArrayLike<unknown>; user: { id: any; }; }, res: any, next: (arg0: any) => any) => {
//   if (req.body?.password || req.body?.passwordConfirm) {
//     return next(new AppError("Use dedicated password update route", 400));
//   }
//   const filteredBody = filterObj(req.body, "name", "email");
//   const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
//     new: true,
//     runValidators: true,
//   });
//   createSendToken(updatedUser, 200, res);
// });
// exports.deleteMe = catchAsync(async (req: { user: { id: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { status: string; data: null; }): void; new(): any; }; }; }, next: any) => {
//   await User.findByIdAndUpdate(req.user.id, { active: false });
//   res.status(204).json({ status: "success", data: null });
// });
// // Factory handlers
// exports.getAllUsers = handleFactory.getAll(User);
// exports.getUserById = handleFactory.getOne(User);
// exports.deleteUser = handleFactory.deleteOne(User);
// exports.updateUser = handleFactory.updateOne(User);
//# sourceMappingURL=userController.js.map