import express, { Router } from 'express';
import { protect, restrictTo } from '../controllers/authController';

const router: Router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Admin-only routes
router.get('/', restrictTo('admin', 'superAdmin'), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Dashboard route - implementation pending'
  });
});

export default router;