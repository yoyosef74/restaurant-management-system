const { Op } = require('sequelize');
const { Order, OrderItem, Table, User, MenuItem, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { emitKitchenUpdate, emitOrderUpdate } = require('../socket');

const kitchenInclude = [
  { model: Table, as: 'table', attributes: ['id','table_number'] },
  { model: User, as: 'waiter', attributes: ['id','first_name','last_name'] },
  { model: OrderItem, as: 'items', where: { status: { [Op.in]: ['pending','preparing','ready'] } }, required: false },
];

exports.getKitchenOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { status: { [Op.in]: ['confirmed','preparing','ready'] } },
      include: kitchenInclude,
      order: [['ordered_at','ASC']],
    });
    return successResponse(res, { orders });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch kitchen orders', 500);
  }
};

exports.updateItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { itemId } = req.params;
    const item = await OrderItem.findByPk(itemId, {
      include: [{ model: MenuItem, as: 'menuItem', attributes: ['id','name'] }]
    });
    if (!item) return errorResponse(res, 'Item not found', 404);

    const updates = { status };
    if (status === 'preparing') updates.prepared_at = null;
    if (status === 'ready') updates.prepared_at = new Date();
    if (status === 'served') updates.served_at = new Date();

    await item.update(updates);

    // Check if all items in order are ready -> update order to 'ready'
    const order = await Order.findByPk(item.order_id, { include: kitchenInclude });
    const allItems = await OrderItem.findAll({ where: { order_id: item.order_id, status: { [Op.ne]: 'cancelled' } } });
    const allReady = allItems.every(i => ['ready','served'].includes(i.status));
    const anyPreparing = allItems.some(i => i.status === 'preparing');

    let newOrderStatus = order.status;
    if (status === 'preparing' && order.status === 'confirmed') {
      newOrderStatus = 'preparing';
    } else if (allReady && order.status !== 'served') {
      newOrderStatus = 'ready';
    }

    if (newOrderStatus !== order.status) {
      await order.update({ status: newOrderStatus });
    }

    const updatedOrder = await Order.findByPk(item.order_id, { include: kitchenInclude });
    emitKitchenUpdate({ item: item.toJSON(), order: updatedOrder });
    emitOrderUpdate(updatedOrder);

    return successResponse(res, { item, order: updatedOrder }, 'Item status updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update item status', 500);
  }
};

exports.markOrderReady = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, { include: kitchenInclude });
    if (!order) return errorResponse(res, 'Order not found', 404);

    await OrderItem.update(
      { status: 'ready', prepared_at: new Date() },
      { where: { order_id: order.id, status: { [Op.in]: ['pending','preparing'] } } }
    );
    await order.update({ status: 'ready' });

    const updated = await Order.findByPk(order.id, { include: kitchenInclude });
    emitOrderUpdate(updated);
    return successResponse(res, { order: updated }, 'Order marked ready');
  } catch (error) {
    return errorResponse(res, 'Failed to mark order ready', 500);
  }
};

exports.getKitchenStats = async (req, res) => {
  try {
    const [pendingCount, preparingCount, readyCount, avgPrepTime] = await Promise.all([
      OrderItem.count({ where: { status: 'pending' } }),
      OrderItem.count({ where: { status: 'preparing' } }),
      OrderItem.count({ where: { status: 'ready' } }),
      sequelize.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (prepared_at - created_at))/60) as avg_minutes
        FROM order_items WHERE status = 'ready' AND prepared_at IS NOT NULL AND created_at > NOW() - INTERVAL '4 hours'
      `, { type: sequelize.QueryTypes.SELECT }),
    ]);
    return successResponse(res, {
      pending: pendingCount,
      preparing: preparingCount,
      ready: readyCount,
      avg_prep_time: parseFloat(avgPrepTime[0]?.avg_minutes || 0).toFixed(1),
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch kitchen stats', 500);
  }
};
