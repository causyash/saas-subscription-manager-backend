import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Category from '../models/Category.js';
import ActivityLog from '../models/ActivityLog.js';

// Get all users
export async function getAllUsers(req, res) {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
}

// Get user by ID
export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
}

// Update user role
export async function updateUserRole(req, res) {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'member', 'viewer'];
    
    if (!validRoles.includes(role)) {
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
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
}

// Update user status
export async function updateUserStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'suspended'];
    
    if (!validStatuses.includes(status)) {
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
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status', error: error.message });
  }
}

// Get system statistics
export async function getSystemStats(req, res) {
  try {
    const [
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      newUsersToday,
      activeUsersToday
    ] = await Promise.all([
      User.countDocuments(),
      Subscription.countDocuments({ status: 'Active' }),
      Subscription.aggregate([
        { $match: { status: 'Active' } },
        { $group: { _id: null, total: { $sum: '$cost' } } }
      ]).then(result => result[0]?.total || 0),
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      User.countDocuments({
        lastLogin: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    res.json({
      totalUsers,
      activeSubscriptions,
      revenue: totalRevenue,
      newUsers: newUsersToday,
      activeUsers: activeUsersToday,
      systemHealth: 'Operational'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
}

// Get all categories
export async function getAllCategories(req, res) {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
}

// Create category
export async function createCategory(req, res) {
  try {
    const { name, color, icon } = req.body;
    
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return res.status(409).json({ message: 'Category already exists' });
    }
    
    const category = await Category.create({
      name,
      color,
      icon
    });
    
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
}

// Update category
export async function updateCategory(req, res) {
  try {
    const { name, color, icon } = req.body;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, color, icon },
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
}

// Delete category
export async function deleteCategory(req, res) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
}

// Get recent activity
export async function getRecentActivity(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const activities = await ActivityLog.find()
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ActivityLog.countDocuments();
    
    res.json({
      activities,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity', error: error.message });
  }
}