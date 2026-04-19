const { Op } = require('sequelize');
const { Order, OrderItem, Table, User, MenuItem, Customer, sequelize } = require('../models');
const { successResponse, errorResponse, paginatedResponse, generateOrderNumber, calculateOrderTotals } = require('../utils/helpers');
const { emitNewOrder, emitOrderUpdate, emitTableUpdate } = require('../socket');
const logger = require('../utils/logger');

const orderInclude = [
  { model: Table, as: 'table', attributes: ['id','table_number','status'] },
  { model: User, as: 'waiter', attributes: ['id','first_name','last_name'] },
  { model: Customer, as: 'customer', attributes: ['id','first_name','last_name','email','phone'] },
  { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem', attributes: ['id','name','image_url'] }] },
];

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, order_type, date_from, date_to, table_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status.includes(',') ? { [Op.in]: status.split(',') } : status;
    if (order_type) where.order_type = order_type;
    if (table_id) where.table_id = table_id;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }
    const { count, rows } = await Order.findAndCountAll({
      where, include: orderInclude,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return paginatedResponse(res, rows, count, page, limit);
  } catch (error) {
    logger.error('Get orders error:', error);
    return errorResponse(res, 'Failed to fetch orders', 500);
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, { include: orderInclude });
    if (!order) return errorResponse(res, 'Order not found', 404);
    return successResponse(res, { order });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch order', 500);
  }
};

exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { table_id, customer_id, order_type = 'dine-in', items, notes, kitchen_notes } = req.body;
    if (!items || items.length === 0) return errorResponse(res, 'Order must have at least one item', 400);

    // Validate menu items
    const menuItemIds = items.map(i => i.menu_item_id);
    const menuItems = await MenuItem.findAll({ where: { id: menuItemIds, is_available: true } });
    if (menuItems.length !== menuItemIds.length) return errorResponse(res, 'One or more menu items are unavailable', 400);

    const menuItemMap = {};
    menuItems.forEach(m => { menuItemMap[m.id] = m; });

    const enrichedItems = items.map(item => ({
      ...item,
      price: parseFloat(menuItemMap[item.menu_item_id].price),
      name: menuItemMap[item.menu_item_id].name,
    }));

    const totals = calculateOrderTotals(enrichedItems, 0.08);
    const order_number = generateOrderNumber();

    const order = await Order.create({
      order_number,
      table_id, customer_id,
      waiter_id: req.userId,
      order_type, notes, kitchen_notes,
      status: 'confirmed',
      ordered_at: new Date(),
      seated_at: table_id ? new Date() : null,
      ...totals,
    }, { transaction: t });

    const orderItemsData = enrichedItems.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1,
      modifiers: item.modifiers || [],
      special_instructions: item.special_instructions || null,
      status: 'pending',
    }));

    await OrderItem.bulkCreate(orderItemsData, { transaction: t });

    // Mark table as occupied
    if (table_id) {
      await Table.update({ status: 'occupied' }, { where: { id: table_id }, transaction: t });
    }

    // Update customer stats
    if (customer_id) {
      await Customer.increment({ total_visits: 1 }, { where: { id: customer_id }, transaction: t });
    }

    await t.commit();

    const fullOrder = await Order.findByPk(order.id, { include: orderInclude });
    emitNewOrder(fullOrder);
    if (table_id) emitTableUpdate({ id: table_id, status: 'occupied' });

    return successResponse(res, { order: fullOrder }, 'Order created', 201);
  } catch (error) {
    await t.rollback();
    logger.error('Create order error:', error);
    return errorResponse(res, 'Failed to create order', 500);
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id, { include: orderInclude });
    if (!order) return errorResponse(res, 'Order not found', 404);

    const updates = { status };
    if (status === 'served') updates.served_at = new Date();
    if (status === 'paid') {
      updates.paid_at = new Date();
      if (order.table_id) await Table.update({ status: 'cleaning' }, { where: { id: order.table_id } });
    }

    await order.update(updates);
    const updated = await Order.findByPk(order.id, { include: orderInclude });
    emitOrderUpdate(updated);
    if (status === 'paid' && order.table_id) emitTableUpdate({ id: order.table_id, status: 'cleaning' });

    return successResponse(res, { order: updated }, 'Order status updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update order status', 500);
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return errorResponse(res, 'Order not found', 404);
    const { notes, kitchen_notes, tip_amount, discount_amount, discount_type, discount_reason } = req.body;

    const items = await OrderItem.findAll({ where: { order_id: order.id } });
    const itemsData = items.map(i => ({ price: i.price, quantity: i.quantity, modifiers: i.modifiers || [] }));
    const totals = calculateOrderTotals(itemsData, order.tax_rate, discount_amount || order.discount_amount, tip_amount || order.tip_amount);

    await order.update({ notes, kitchen_notes, discount_type, discount_reason, ...totals });
    const updated = await Order.findByPk(order.id, { include: orderInclude });
    emitOrderUpdate(updated);
    return successResponse(res, { order: updated }, 'Order updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update order', 500);
  }
};

exports.addOrderItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, { transaction: t });
    if (!order) { await t.rollback(); return errorResponse(res, 'Order not found', 404); }
    if (['paid','cancelled'].includes(order.status)) { await t.rollback(); return errorResponse(res, 'Cannot modify a completed order', 400); }

    const { menu_item_id, quantity = 1, modifiers = [], special_instructions } = req.body;
    const menuItem = await MenuItem.findByPk(menu_item_id);
    if (!menuItem || !menuItem.is_available) { await t.rollback(); return errorResponse(res, 'Menu item unavailable', 400); }

    const newItem = await OrderItem.create({
      order_id: order.id, menu_item_id,
      name: menuItem.name, price: menuItem.price,
      quantity, modifiers, special_instructions, status: 'pending',
    }, { transaction: t });

    // Recalculate totals
    const allItems = await OrderItem.findAll({ where: { order_id: order.id, status: { [Op.ne]: 'cancelled' } }, transaction: t });
    const totals = calculateOrderTotals(allItems.map(i => ({ price: i.price, quantity: i.quantity, modifiers: i.modifiers || [] })), order.tax_rate, order.discount_amount, order.tip_amount);
    await order.update(totals, { transaction: t });

    await t.commit();
    const updated = await Order.findByPk(order.id, { include: orderInclude });
    emitOrderUpdate(updated);
    return successResponse(res, { order: updated }, 'Item added to order', 201);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 'Failed to add item', 500);
  }
};

exports.cancelOrderItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await OrderItem.findByPk(itemId);
    if (!item) return errorResponse(res, 'Item not found', 404);
    if (item.status !== 'pending') return errorResponse(res, 'Only pending items can be cancelled', 400);

    await item.update({ status: 'cancelled' });
    const order = await Order.findByPk(item.order_id);
    const allItems = await OrderItem.findAll({ where: { order_id: order.id, status: { [Op.ne]: 'cancelled' } } });
    const totals = calculateOrderTotals(allItems.map(i => ({ price: i.price, quantity: i.quantity, modifiers: i.modifiers || [] })), order.tax_rate, order.discount_amount, order.tip_amount);
    await order.update(totals);

    const updated = await Order.findByPk(order.id, { include: orderInclude });
    emitOrderUpdate(updated);
    return successResponse(res, { order: updated }, 'Item cancelled');
  } catch (error) {
    return errorResponse(res, 'Failed to cancel item', 500);
  }
};

exports.getActiveOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { status: { [Op.in]: ['confirmed','preparing','ready','served'] } },
      include: orderInclude,
      order: [['ordered_at', 'ASC']],
    });
    return successResponse(res, { orders });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch active orders', 500);
  }
};
