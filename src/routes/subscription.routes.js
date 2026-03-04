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
  .post(auth(['member', 'admin']), createSubscription)
  .get(auth(['member', 'admin']), getSubscriptions);

// User's Subscriptions
router.get('/user', auth(['member', 'admin']), getUserSubscriptions);

// Individual Subscription Routes
router.route('/:id')
  .get(auth(['member', 'admin']), getSubscriptionById)
  .put(auth(['member', 'admin']), updateSubscription)
  .delete(auth(['member', 'admin']), deleteSubscription);

export default router;
