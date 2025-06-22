import express, { Router } from 'express';
import * as masterListController from '../controllers/masterListController';
import { protect } from '../controllers/authController';

const router: Router = express.Router();

// Protect all routes
router.use(protect);

// Get master lists
router.get('/', masterListController.getMasterList);
router.get('/:module', masterListController.getModuleMasterList);
router.get('/search/:module', masterListController.searchMasterList);

export default router;