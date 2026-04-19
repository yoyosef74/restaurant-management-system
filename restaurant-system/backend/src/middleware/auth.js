const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { errorResponse } = require('../utils/helpers');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }],
    });
    if (!user || !user.is_active) {
      return errorResponse(res, 'User not found or inactive', 401);
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return errorResponse(res, 'Not authenticated', 401);
    const userRole = req.user.role?.name;
    if (userRole === 'admin') return next();
    if (!allowedRoles.includes(userRole)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) return errorResponse(res, 'Not authenticated', 401);
    const permissions = req.user.role?.permissions || [];
    if (permissions.includes('all') || permissions.includes(permission)) return next();
    return errorResponse(res, 'Insufficient permissions', 403);
  };
};

module.exports = { authenticate, authorize, hasPermission };
