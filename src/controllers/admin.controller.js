import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import ActivityLog from '../models/ActivityLog.js';
import Category from '../models/Category.js';
import logger from '../config/logger.js';

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + users.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ success: true, message: 'User role updated successfully', data: user });
  } catch (error) {
    logger.error('Error updating user role:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update user status
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ success: true, message: 'User status updated successfully', data: user });
  } catch (error) {
    logger.error('Error updating user status:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Also delete user's subscriptions, payments, and activity logs
    await Promise.all([
      Subscription.deleteMany({ userId: req.params.id }),
      Payment.deleteMany({ userId: req.params.id }),
      ActivityLog.deleteMany({ userId: req.params.id })
    ]);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get system statistics
export const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalSubscriptions,
      totalPayments,
      totalActivityLogs
    ] = await Promise.all([
      User.countDocuments(),
      Subscription.countDocuments(),
      Payment.countDocuments(),
      ActivityLog.countDocuments()
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        totalSubscriptions,
        totalPayments,
        totalActivityLogs,
        activeUsers: await User.countDocuments({ status: 'active' }),
        adminUsers: await User.countDocuments({ role: 'admin' }),
        todaySubscriptions: await Subscription.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        })
      }
    });
  } catch (error) {
    logger.error('Error fetching system stats:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create category
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const existingCategory = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    const category = new Category({ name, description });
    await category.save();
    
    res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ success: true, message: 'Category updated successfully', data: category });
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get recent activity
export const getRecentActivity = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const activityLogs = await ActivityLog.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ActivityLog.countDocuments();
    
    res.json({
      success: true,
      data: activityLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + activityLogs.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching activity logs:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reset all collections except users (Admin only)
export const resetCollections = async (req, res) => {
  try {
    // Delete all documents from all collections except User
    await Subscription.deleteMany({});
    await Payment.deleteMany({});
    await ActivityLog.deleteMany({});
    await Category.deleteMany({});
    
    // Create default categories
    const defaultCategories = [
      { name: "Communication", description: "Messaging and communication tools" },
      { name: "Meetings", description: "Video conferencing and meeting tools" },
      { name: "Productivity", description: "Task management and productivity tools" },
      { name: "Design", description: "Design and creative tools" },
      { name: "Development", description: "Development tools and platforms" },
      { name: "Marketing", description: "Marketing and promotion tools" },
      { name: "Finance", description: "Financial and accounting tools" },
      { name: "CRM", description: "Customer relationship management tools" },
      { name: "Analytics", description: "Analytics and reporting tools" },
      { name: "Security", description: "Security and protection tools" },
      { name: "Cloud Storage", description: "Cloud storage and backup tools" },
      { name: "Project Management", description: "Project planning and management tools" },
      { name: "HR & Payroll", description: "Human resources and payroll tools" },
      { name: "Accounting", description: "Accounting and bookkeeping tools" },
      { name: "E-commerce", description: "E-commerce and online store tools" },
      { name: "Other", description: "Other miscellaneous tools" }
    ];
    
    await Category.insertMany(defaultCategories);
    
    res.json({ 
      success: true, 
      message: 'All collections reset successfully (except users)',
      resetCollections: ['subscriptions', 'payments', 'activity_logs', 'categories']
    });
  } catch (error) {
    logger.error('Error resetting collections:', error);
    res.status(500).json({ message: error.message });
  }
};