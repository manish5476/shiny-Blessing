import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
});