"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const xss_clean_1 = __importDefault(require("xss-clean"));
const hpp_1 = __importDefault(require("hpp"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Custom utilities and handlers
const errorController_1 = __importDefault(require("./controllers/errorController"));
const appError_1 = __importDefault(require("./utils/appError"));
// Import routes
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const UserRoutes_1 = __importDefault(require("./routes/UserRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const sellerRoutes_1 = __importDefault(require("./routes/sellerRoutes"));
const InvoiceRoutes_1 = __importDefault(require("./routes/InvoiceRoutes"));
const masterListRoutes_1 = __importDefault(require("./routes/masterListRoutes"));
const statisticsRoutes_1 = __importDefault(require("./routes/statisticsRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
// import botRoutes from './routes/botRoutes';
const app = (0, express_1.default)();
app.set('trust proxy', 1);
// Logger setup
const logsDir = path_1.default.join(__dirname, 'logs');
if (!fs_1.default.existsSync(logsDir))
    fs_1.default.mkdirSync(logsDir);
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
            zippedArchive: true,
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'combined.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
            zippedArchive: true,
        }),
    ],
    exceptionHandlers: [
        new winston_1.default.transports.File({ filename: path_1.default.join(logsDir, 'exceptions.log') })
    ],
    rejectionHandlers: [
        new winston_1.default.transports.File({ filename: path_1.default.join(logsDir, 'rejections.log') })
    ]
});
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }));
}
// Middleware
app.use((0, helmet_1.default)());
const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
    optionsSuccessStatus: 204,
};
app.use((0, cors_1.default)(corsOptions));
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined', { stream: { write: message => logger.info(message.trim()) } }));
}
const apiLimiter = (0, express_rate_limit_1.default)({
    limit: 1000,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again after an hour.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new appError_1.default('Too many requests from this IP, please try again after an hour.', 429));
    }
});
app.use('/api/v1', apiLimiter);
app.use(express_1.default.json({ limit: '50kb' }));
app.use((0, express_mongo_sanitize_1.default)());
app.use((0, xss_clean_1.default)());
app.use((0, hpp_1.default)({
    whitelist: [
        'duration', 'average', 'page', 'limit', 'sort', 'fields', 'filter',
        'status', 'category', 'price', 'stock', 'fullname', 'email', 'name', 'shopname', 'mobileNumber',
        'level', 'startDate', 'endDate', 'userId', 'userRole', 'ipAddress', 'method', 'url', 'environment'
    ]
}));
app.use((0, compression_1.default)());
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    logger.info(`Incoming Request: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
    next();
});
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return next(new appError_1.default('Invalid JSON payload provided.', 400));
    }
    next(err);
});
// Routes
app.use('/api/v1/users', UserRoutes_1.default);
app.use('/api/v1/products', productRoutes_1.default);
app.use('/api/v1/reviews', reviewRoutes_1.default);
app.use('/api/v1/customers', customerRoutes_1.default);
app.use('/api/v1/payments', paymentRoutes_1.default);
app.use('/api/v1/sellers', sellerRoutes_1.default);
app.use('/api/v1/invoices', InvoiceRoutes_1.default);
app.use('/api/v1/master-list', masterListRoutes_1.default);
app.use('/api/v1/statistics', statisticsRoutes_1.default);
app.use('/api/v1/analytics', analyticsRoutes_1.default);
app.use('/api/v1/dashboard', dashboardRoutes_1.default);
// app.use('/api/v1/bot', botRoutes);
// Static assets
app.use('/public', express_1.default.static(path_1.default.join(__dirname, 'public'), { maxAge: '1d', dotfiles: 'deny' }));
// 404 handler
app.all('*', (req, res, next) => {
    next(new appError_1.default(`Cannot find ${req.originalUrl} on this server!`, 404));
});
// Global error handler
app.use(errorController_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map