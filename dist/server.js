"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const envFile = process.argv[2] || ".env.dev";
dotenv_1.default.config({ path: envFile });
mongoose_1.default
    .connect(process.env.DATABASE)
    .then(() => {
    console.log(`Connected to MongoDB (${process.env.NODE_ENV})`);
})
    .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
});
const port = process.env.PORT || 4000;
const server = app_1.default.listen(port, () => {
    console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
});
async function shutdown() {
    console.log("Shutting down server...");
    await mongoose_1.default.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
//# sourceMappingURL=server.js.map