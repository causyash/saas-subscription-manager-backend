import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { 
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  getUserSubscriptions
} from '../controllers/subscription.controller.js';

const router = Router();

// Subscription Management Routes
router.route('/')
  .post(auth(['user', 'admin']), createSubscription)
  .get(auth(['user', 'admin']), getSubscriptions);

// User's Subscriptions
router.get('/user', auth(['user', 'admin']), getUserSubscriptions);

// Individual Subscription Routes
router.route('/:id')
  .get(auth(['user', 'admin']), getSubscriptionById)
  .put(auth(['user', 'admin']), updateSubscription)
  .delete(auth(['user', 'admin']), deleteSubscription);

export default router;