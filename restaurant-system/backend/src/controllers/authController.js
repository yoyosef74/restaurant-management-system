const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role?.name };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  return { accessToken };
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.scope('withPassword').findOne({
      where: { email: email.toLowerCase(), is_active: true },
      include: [{ model: Role, as: 'role' }],
    });
    if (!user) return errorResponse(res, 'Invalid credentials', 401);

    const valid = await user.validatePassword(password);
    if (!valid) return errorResponse(res, 'Invalid credentials', 401);

    await user.update({ last_login: new Date() });
    const { accessToken } = generateTokens(user);

    logger.info(`User logged in: ${user.email}`);
    return successResponse(res, {
      token: accessToken,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role?.name,
        permissions: user.role?.permissions || [],
        phone: user.phone,
      }
    }, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [{ model: Role, as: 'role' }],
    });
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user });
  } catch (error) {
    return errorResponse(res, 'Failed to get profile', 500);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) return errorResponse(res, 'User not found', 404);
    await user.update({ first_name, last_name, phone });
    return successResponse(res, { user }, 'Profile updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update profile', 500);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.scope('withPassword').findByPk(req.userId);
    if (!user) return errorResponse(res, 'User not found', 404);

    const valid = await user.validatePassword(current_password);
    if (!valid) return errorResponse(res, 'Current password is incorrect', 400);

    const newHash = await User.hashPassword(new_password);
    await user.update({ password_hash: newHash });
    return successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to change password', 500);
  }
};
