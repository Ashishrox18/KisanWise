import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

router.get('/dashboard', authenticate, authorize('admin'), controller.getDashboard);
router.get('/system-health', authenticate, authorize('admin'), controller.getSystemHealth);
router.get('/metrics', authenticate, authorize('admin'), controller.getMetrics);
router.get('/users', authenticate, authorize('admin'), controller.getUsers);
router.get('/analytics', authenticate, authorize('admin'), controller.getAnalytics);

export default router;
