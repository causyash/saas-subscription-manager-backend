import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import logger from '../config/logger.js';

/**
 * Create a new subscription
 */
export const createSubscription = async (req, res) => {
  try {
    const { 
      softwareName, 
      category, 
      cost, 
      billingCycle, 
      customDays, 
      startDate, 
      renewalDate, 
      paymentMethod, 
      notes 
    } = req.body;

    // Validate required fields
    if (!softwareName || !category || cost === undefined || !startDate || !renewalDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: softwareName, category, cost, startDate, renewalDate' 
      });
    }

    // Validate cost
    if (typeof cost !== 'number' || cost < 0) {
      return res.status(400).json({ message: 'Cost must be a non-negative number' });
    }

    // Validate dates
    const start = new Date(startDate);
    const renewal = new Date(renewalDate);
    
    if (isNaN(start.getTime()) || isNaN(renewal.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (renewal <= start) {
      return res.status(400).json({ message: 'Renewal date must be after start date' });
    }

    // Create subscription
    const subscription = new Subscription({
      userId: req.user._id,
      softwareName,
      category,
      cost,
      billingCycle,
      customDays: billingCycle === 'Custom Days' ? customDays : undefined,
      startDate: start,
      renewalDate: renewal,
      paymentMethod,
      notes
    });

    await subscription.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'CREATE_SUBSCRIPTION',
      details: { subscriptionId: subscription._id, softwareName },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (error) {
    logger.error('Error creating subscription:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all subscriptions (admin only) or user's subscriptions
 */
export const getSubscriptions = async (req, res) => {
  try {
    let query = {};
    
    // If not admin, only return user's subscriptions
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    const { page = 1, limit = 10, category, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Add filters if provided
    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + subscriptions.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get user's subscriptions
 */
export const getUserSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const subscriptions = await Subscription.find({ userId: req.user._id })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + subscriptions.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching user subscriptions:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get subscription by ID
 */
export const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findById(id).populate('userId', 'name email');
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Check if user owns the subscription (if not admin)
    if (req.user.role !== 'admin' && subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error fetching subscription:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update subscription
 */
export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Find subscription and check ownership
    const subscription = await Subscription.findById(id);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (req.user.role !== 'admin' && subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate dates if provided
    if (updateData.startDate) {
      const start = new Date(updateData.startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ message: 'Invalid start date format' });
      }
    }

    if (updateData.renewalDate) {
      const renewal = new Date(updateData.renewalDate);
      if (isNaN(renewal.getTime())) {
        return res.status(400).json({ message: 'Invalid renewal date format' });
      }
      
      if (updateData.startDate) {
        const start = new Date(updateData.startDate);
        if (renewal <= start) {
          return res.status(400).json({ message: 'Renewal date must be after start date' });
        }
      } else if (subscription.startDate && renewal <= subscription.startDate) {
        return res.status(400).json({ message: 'Renewal date must be after start date' });
      }
    }

    // Update subscription
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        subscription[key] = updateData[key];
      }
    });

    await subscription.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'UPDATE_SUBSCRIPTION',
      details: { subscriptionId: subscription._id, softwareName: subscription.softwareName },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });
  } catch (error) {
    logger.error('Error updating subscription:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete subscription
 */
export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findById(id);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (req.user.role !== 'admin' && subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Subscription.findByIdAndDelete(id);

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'DELETE_SUBSCRIPTION',
      details: { subscriptionId: subscription._id, softwareName: subscription.softwareName },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting subscription:', error);
    res.status(500).json({ message: error.message });
  }
};