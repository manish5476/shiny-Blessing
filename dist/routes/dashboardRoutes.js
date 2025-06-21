"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
// Protected routes (require authentication)
router.use(authController_1.protect);
// Admin-only routes
router.get('/', (0, authController_1.restrictTo)('admin', 'superAdmin'), (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Dashboard route - implementation pending'
    });
});
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map