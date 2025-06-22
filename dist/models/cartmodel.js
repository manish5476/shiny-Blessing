"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const cartItemSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Product", required: true },
    invoiceIds: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Invoice" }],
});
//# sourceMappingURL=cartmodel.js.map