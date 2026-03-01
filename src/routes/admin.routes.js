import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { 
  getAllUsers, 
  getUserById, 
  updateUserRole, 
  updateUserStatus,
  getSystemStats,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getRecentActivity
} from '../controllers/admin.controller.js';

const router = Router();

// User Management Routes (Admin only)
router.get('/users', auth(['admin']), getAllUsers);
router.get('/users/:id', auth(['admin']), getUserById);
router.put('/users/:id/role', auth(['admin']), updateUserRole);
router.put('/users/:id/status', auth(['admin']), updateUserStatus);

// System Statistics Routes (Admin only)
router.get('/stats', auth(['admin']), getSystemStats);

// Category Management Routes (Admin only)
router.get('/categories', auth(['admin']), getAllCategories);
router.post('/categories', auth(['admin']), createCategory);
router.put('/categories/:id', auth(['admin']), updateCategory);
router.delete('/categories/:id', auth(['admin']), deleteCategory);

// Activity Log Routes (Admin only)
router.get('/activity', auth(['admin']), getRecentActivity);

export default router;