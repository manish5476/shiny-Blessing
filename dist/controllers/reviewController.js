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
exports.deleteReview = exports.updateReview = exports.createReview = exports.reviewById = exports.getAllReviews = exports.setUserProductIds = void 0;
const handleFactory = __importStar(require("./handleFactory"));
const ReviewModel_1 = __importDefault(require("../models/ReviewModel"));
const setUserProductIds = (req, res, next) => {
    if (!req.body.product && req.params.productId) {
        req.body.product = req.params.productId;
    }
    if (!req.body.user) {
        req.body.user = req.user.id;
    }
    next();
};
exports.setUserProductIds = setUserProductIds;
exports.getAllReviews = handleFactory.getAll(ReviewModel_1.default);
exports.reviewById = handleFactory.getOne(ReviewModel_1.default, { path: "product" });
exports.createReview = handleFactory.newOne(ReviewModel_1.default);
exports.updateReview = handleFactory.updateOne(ReviewModel_1.default);
exports.deleteReview = handleFactory.deleteOne(ReviewModel_1.default);
//# sourceMappingURL=reviewController.js.map