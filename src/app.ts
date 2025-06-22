// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import compression from 'compression';
import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Custom utilities and handlers
import globalErrorHandler from './controllers/errorController';
import AppError from './utils/appError';

// Import routes
import productRoutes from './routes/productRoutes';
import usersRoutes from './routes/UserRoutes';
import reviewRoutes from './routes/reviewRoutes';
import customerRoutes from './routes/customerRoutes';
import paymentRoutes from './routes/paymentRoutes';
import sellerRoutes from './routes/sellerRoutes';
import invoiceRoutes from './routes/InvoiceRoutes';
import masterListRoutes from './routes/masterListRoutes';
import statisticsRoutes from './routes/statisticsRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
// import botRoutes from './routes/botRoutes';

const app = express();
app.set('trust proxy', 1);

// Logger setup
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      zippedArchive: true,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      zippedArchive: true,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ]
});

if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Middleware
app.use(helmet());

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

const apiLimiter = rateLimit({
  limit: 1000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many requests from this IP, please try again after an hour.', 429));
  }
});
app.use('/api/v1', apiLimiter);

app.use(express.json({ limit: '50kb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({
  whitelist: [
    'duration', 'average', 'page', 'limit', 'sort', 'fields', 'filter',
    'status', 'category', 'price', 'stock', 'fullname', 'email', 'name', 'shopname', 'mobileNumber',
    'level', 'startDate', 'endDate', 'userId', 'userRole', 'ipAddress', 'method', 'url', 'environment'
  ]
}));

app.use(compression());
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestTime = new Date().toISOString();
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  next();
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return next(new AppError('Invalid JSON payload provided.', 400));
  }
  next(err);
});

// Routes
// app.use('/api/v1/users', usersRoutes);
// app.use('/api/v1/products', productRoutes);
// app.use('/api/v1/reviews', reviewRoutes);
// app.use('/api/v1/customers', customerRoutes);
// app.use('/api/v1/payments', paymentRoutes);
// app.use('/api/v1/sellers', sellerRoutes);
// app.use('/api/v1/invoices', invoiceRoutes);
// app.use('/api/v1/master-list', masterListRoutes);
// app.use('/api/v1/statistics', statisticsRoutes);
// app.use('/api/v1/analytics', analyticsRoutes);
// app.use('/api/v1/dashboard', dashboardRoutes);
// app.use('/api/v1/bot', botRoutes);

// Static assets
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '1d', dotfiles: 'deny' }));

// 404 handler
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

export default app;
