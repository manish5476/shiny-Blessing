import express, { Router } from 'express';
import * as reviewController from '../controllers/reviewController';
import { protect, restrictTo } from '../controllers/authController';

const router: Router = express.Router({ mergeParams: true });

// Protected routes (require authentication)
router.use(protect);

// User-accessible routes
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(restrictTo('user'), reviewController.setUserProductIds, reviewController.createReview);

// Mixed access (user or admin)
router
  .route('/:id')
  .get(restrictTo('user', 'admin'), reviewController.reviewById)
  .patch(restrictTo('user', 'admin'), reviewController.updateReview)
  .delete(restrictTo('user', 'admin'), reviewController.deleteReview);

export default router;