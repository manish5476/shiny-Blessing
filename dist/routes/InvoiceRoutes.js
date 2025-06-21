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
const invoiceController = __importStar(require("../controllers/invoiceController"));
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
// Protected routes (require authentication)
router.use(authController_1.protect);
// User-accessible routes
router.get('/:id', invoiceController.getInvoiceById);
// Admin/staff-only routes
router
    .route('/')
    .get((0, authController_1.restrictTo)('admin', 'superAdmin'), invoiceController.getAllInvoice)
    .post((0, authController_1.restrictTo)('admin', 'superAdmin'), invoiceController.findDuplicateInvoice, invoiceController.newInvoice);
router
    .route('/:id')
    .patch((0, authController_1.restrictTo)('admin', 'superAdmin'), invoiceController.updateInvoice)
    .delete((0, authController_1.restrictTo)('admin', 'superAdmin'), invoiceController.deleteInvoice);
router.post('/productSales', (0, authController_1.restrictTo)('admin', 'superAdmin'), invoiceController.getProductSales);
exports.default = router;
//# sourceMappingURL=InvoiceRoutes.js.map