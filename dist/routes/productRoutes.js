"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const authController_1 = require("../controllers/authController");
const reviewRoutes_1 = __importDefault(require("./reviewRoutes"));
const router = express_1.default.Router();
// Protected routes (require authentication)
router.use(authController_1.protect);
// User-accessible routes
router.get('/', productController_1.getAllProduct);
router.get('/:id', productController_1.getProductById);
// Admin/seller-only routes
router
    .route('/')
    .post((0, authController_1.restrictTo)('admin', 'seller'), productController_1.findDuplicateProduct, productController_1.newProduct)
    .delete((0, authController_1.restrictTo)('admin', 'seller'), productController_1.deleteMultipleProduct);
router
    .route('/:id')
    .patch((0, authController_1.restrictTo)('admin', 'seller'), productController_1.updateProduct)
    .delete((0, authController_1.restrictTo)('admin', 'seller'), productController_1.deleteProduct);
// Nested review routes
router.use('/:productId/reviews', reviewRoutes_1.default);
exports.default = router;
//# sourceMappingURL=productRoutes.js.map