const { Table, Section, Order, OrderItem } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { emitTableUpdate } = require('../socket');

exports.getTables = async (req, res) => {
  try {
    const where = {};
    if (req.query.section_id) where.section_id = req.query.section_id;
    if (req.query.status) where.status = req.query.status;
    const tables = await Table.findAll({
      where,
      include: [
        { model: Section, as: 'section', attributes: ['id','name'] },
        { model: Order, as: 'orders', where: { status: { [require('sequelize').Op.in]: ['confirmed','preparing','ready','served'] } }, required: false, include: [{ model: OrderItem, as: 'items' }] },
      ],
      order: [['table_number','ASC']],
    });
    return successResponse(res, { tables });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch tables', 500);
  }
};

exports.getTable = async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id, {
      include: [
        { model: Section, as: 'section' },
        { model: Order, as: 'orders', where: { status: { [require('sequelize').Op.notIn]: ['paid','cancelled'] } }, required: false, include: [{ model: OrderItem, as: 'items' }] },
      ],
    });
    if (!table) return errorResponse(res, 'Table not found', 404);
    return successResponse(res, { table });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch table', 500);
  }
};

exports.createTable = async (req, res) => {
  try {
    const table = await Table.create(req.body);
    return successResponse(res, { table }, 'Table created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create table', 500);
  }
};

exports.updateTable = async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id);
    if (!table) return errorResponse(res, 'Table not found', 404);
    const oldStatus = table.status;
    await table.update(req.body);
    if (req.body.status && req.body.status !== oldStatus) {
      emitTableUpdate({ id: table.id, status: table.status, table_number: table.table_number });
    }
    return successResponse(res, { table }, 'Table updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update table', 500);
  }
};

exports.updateTableStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const table = await Table.findByPk(req.params.id);
    if (!table) return errorResponse(res, 'Table not found', 404);
    await table.update({ status });
    emitTableUpdate({ id: table.id, status, table_number: table.table_number });
    return successResponse(res, { table }, 'Table status updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update table status', 500);
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id);
    if (!table) return errorResponse(res, 'Table not found', 404);
    await table.destroy();
    return successResponse(res, null, 'Table deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete table', 500);
  }
};

exports.getSections = async (req, res) => {
  try {
    const sections = await Section.findAll({
      include: [{ model: Table, as: 'tables' }],
      order: [['name','ASC']],
    });
    return successResponse(res, { sections });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch sections', 500);
  }
};

exports.createSection = async (req, res) => {
  try {
    const section = await Section.create(req.body);
    return successResponse(res, { section }, 'Section created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create section', 500);
  }
};
