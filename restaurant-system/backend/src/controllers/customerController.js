const { Op } = require('sequelize');
const { Customer, Order, Payment } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/helpers');

exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    const where = { is_active: true };
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await Customer.findAndCountAll({
      where, order: [['created_at','DESC']], limit: parseInt(limit), offset: parseInt(offset),
    });
    return paginatedResponse(res, rows, count, page, limit);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch customers', 500);
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: Order, as: 'orders', limit: 10, order: [['created_at','DESC']] }],
    });
    if (!customer) return errorResponse(res, 'Customer not found', 404);
    return successResponse(res, { customer });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch customer', 500);
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, notes } = req.body;
    if (email) {
      const existing = await Customer.findOne({ where: { email } });
      if (existing) return errorResponse(res, 'Customer with this email already exists', 409);
    }
    const customer = await Customer.create({ first_name, last_name, email, phone, notes });
    return successResponse(res, { customer }, 'Customer created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create customer', 500);
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return errorResponse(res, 'Customer not found', 404);
    const { first_name, last_name, email, phone, notes } = req.body;
    await customer.update({ first_name, last_name, email, phone, notes });
    return successResponse(res, { customer }, 'Customer updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update customer', 500);
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return errorResponse(res, 'Customer not found', 404);
    await customer.update({ is_active: false });
    return successResponse(res, null, 'Customer deactivated');
  } catch (error) {
    return errorResponse(res, 'Failed to delete customer', 500);
  }
};

exports.adjustLoyaltyPoints = async (req, res) => {
  try {
    const { points, reason } = req.body;
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return errorResponse(res, 'Customer not found', 404);
    const newPoints = Math.max(0, customer.loyalty_points + parseInt(points));
    await customer.update({ loyalty_points: newPoints });
    return successResponse(res, { customer }, 'Loyalty points updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update loyalty points', 500);
  }
};

exports.searchCustomer = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return successResponse(res, { customers: [] });
    const customers = await Customer.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { first_name: { [Op.iLike]: `%${q}%` } },
          { last_name: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%${q}%` } },
          { phone: { [Op.iLike]: `%${q}%` } },
        ],
      },
      limit: 10,
    });
    return successResponse(res, { customers });
  } catch (error) {
    return errorResponse(res, 'Search failed', 500);
  }
};
