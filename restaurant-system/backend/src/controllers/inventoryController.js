const { Op } = require('sequelize');
const { InventoryItem, InventoryCategory, InventoryTransaction, Supplier, sequelize } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/helpers');
const { emitInventoryAlert } = require('../socket');
const logger = require('../utils/logger');

const itemInclude = [
  { model: InventoryCategory, as: 'category', attributes: ['id','name'] },
  { model: Supplier, as: 'supplier', attributes: ['id','name','phone'] },
];

exports.getItems = async (req, res) => {
  try {
    const { page = 1, limit = 50, category_id, search, low_stock } = req.query;
    const offset = (page - 1) * limit;
    const where = { is_active: true };
    if (category_id) where.category_id = category_id;
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (low_stock === 'true') where[Op.and] = [
      sequelize.where(sequelize.col('current_stock'), Op.lte, sequelize.col('reorder_point'))
    ];
    const { count, rows } = await InventoryItem.findAndCountAll({
      where, include: itemInclude,
      order: [['name','ASC']], limit: parseInt(limit), offset: parseInt(offset),
    });
    return paginatedResponse(res, rows, count, page, limit);
  } catch (error) {
    logger.error('Get inventory items error:', error);
    return errorResponse(res, 'Failed to fetch inventory items', 500);
  }
};

exports.getItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id, { include: itemInclude });
    if (!item) return errorResponse(res, 'Item not found', 404);
    return successResponse(res, { item });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch item', 500);
  }
};

exports.createItem = async (req, res) => {
  try {
    const item = await InventoryItem.create(req.body);
    const full = await InventoryItem.findByPk(item.id, { include: itemInclude });
    return successResponse(res, { item: full }, 'Inventory item created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create inventory item', 500);
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) return errorResponse(res, 'Item not found', 404);
    await item.update(req.body);
    const full = await InventoryItem.findByPk(item.id, { include: itemInclude });
    return successResponse(res, { item: full }, 'Item updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update item', 500);
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) return errorResponse(res, 'Item not found', 404);
    await item.update({ is_active: false });
    return successResponse(res, null, 'Item deactivated');
  } catch (error) {
    return errorResponse(res, 'Failed to delete item', 500);
  }
};

exports.adjustStock = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { item_id, transaction_type, quantity, unit_cost, notes, reference_id } = req.body;
    const item = await InventoryItem.findByPk(item_id, { transaction: t });
    if (!item) { await t.rollback(); return errorResponse(res, 'Item not found', 404); }

    const qty = parseFloat(quantity);
    const isDeduction = ['consumption','waste'].includes(transaction_type);
    const newStock = isDeduction
      ? Math.max(0, parseFloat(item.current_stock) - qty)
      : parseFloat(item.current_stock) + qty;

    await item.update({ current_stock: newStock }, { transaction: t });

    const tx = await InventoryTransaction.create({
      item_id,
      transaction_type,
      quantity: qty,
      unit_cost: unit_cost || item.cost_per_unit,
      total_cost: unit_cost ? qty * parseFloat(unit_cost) : qty * parseFloat(item.cost_per_unit),
      reference_id,
      notes,
      performed_by: req.userId,
    }, { transaction: t });

    await t.commit();

    // Alert if low stock
    if (newStock <= parseFloat(item.reorder_point)) {
      emitInventoryAlert({ ...item.toJSON(), current_stock: newStock });
    }

    return successResponse(res, { item: { ...item.toJSON(), current_stock: newStock }, transaction: tx }, 'Stock adjusted');
  } catch (error) {
    await t.rollback();
    logger.error('Adjust stock error:', error);
    return errorResponse(res, 'Failed to adjust stock', 500);
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { item_id, transaction_type, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (item_id) where.item_id = item_id;
    if (transaction_type) where.transaction_type = transaction_type;
    const { count, rows } = await InventoryTransaction.findAndCountAll({
      where,
      include: [{ model: InventoryItem, as: 'item', attributes: ['id','name','unit'] }],
      order: [['created_at','DESC']], limit: parseInt(limit), offset: parseInt(offset),
    });
    return paginatedResponse(res, rows, count, page, limit);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch transactions', 500);
  }
};

exports.getLowStockItems = async (req, res) => {
  try {
    const items = await InventoryItem.findAll({
      where: {
        is_active: true,
        [Op.and]: sequelize.literal('"InventoryItem"."current_stock" <= "InventoryItem"."reorder_point"'),
      },
      include: itemInclude,
      order: [['current_stock','ASC']],
    });
    return successResponse(res, { items, count: items.length });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch low stock items', 500);
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await InventoryCategory.findAll({ order: [['name','ASC']] });
    return successResponse(res, { categories });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch categories', 500);
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({ where: { is_active: true }, order: [['name','ASC']] });
    return successResponse(res, { suppliers });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch suppliers', 500);
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    return successResponse(res, { supplier }, 'Supplier created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create supplier', 500);
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return errorResponse(res, 'Supplier not found', 404);
    await supplier.update(req.body);
    return successResponse(res, { supplier }, 'Supplier updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update supplier', 500);
  }
};
