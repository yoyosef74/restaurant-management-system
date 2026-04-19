const { User, Role } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/helpers');

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      include: [{ model: Role, as: 'role' }],
      order: [['created_at','DESC']], limit: parseInt(limit), offset: parseInt(offset),
    });
    return paginatedResponse(res, rows, count, page, limit);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch users', 500);
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { include: [{ model: Role, as: 'role' }] });
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch user', 500);
  }
};

exports.createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role_id, phone } = req.body;
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return errorResponse(res, 'Email already in use', 409);
    const password_hash = await User.hashPassword(password);
    const user = await User.create({ first_name, last_name, email: email.toLowerCase(), password_hash, role_id, phone });
    const full = await User.findByPk(user.id, { include: [{ model: Role, as: 'role' }] });
    return successResponse(res, { user: full }, 'User created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create user', 500);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    const { first_name, last_name, phone, role_id, is_active } = req.body;
    await user.update({ first_name, last_name, phone, role_id, is_active });
    const full = await User.findByPk(user.id, { include: [{ model: Role, as: 'role' }] });
    return successResponse(res, { user: full }, 'User updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update user', 500);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.userId) return errorResponse(res, 'Cannot delete your own account', 400);
    const user = await User.findByPk(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    await user.update({ is_active: false });
    return successResponse(res, null, 'User deactivated');
  } catch (error) {
    return errorResponse(res, 'Failed to delete user', 500);
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [['name','ASC']] });
    return successResponse(res, { roles });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch roles', 500);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { new_password } = req.body;
    const user = await User.scope('withPassword').findByPk(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    const password_hash = await User.hashPassword(new_password);
    await user.update({ password_hash });
    return successResponse(res, null, 'Password reset successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to reset password', 500);
  }
};
