const { v4: uuidv4 } = require('uuid');
const { Payment, Order, OrderItem, Customer, Table, User, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { emitOrderUpdate, emitTableUpdate } = require('../socket');
const logger = require('../utils/logger');

exports.processPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { order_id, payment_method, amount, tip_amount = 0, cash_tendered, split_payments } = req.body;

    const order = await Order.findByPk(order_id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Customer, as: 'customer' },
        { model: Table, as: 'table' },
      ],
      transaction: t,
    });

    if (!order) { await t.rollback(); return errorResponse(res, 'Order not found', 404); }
    if (order.status === 'paid') { await t.rollback(); return errorResponse(res, 'Order already paid', 400); }

    const finalAmount = parseFloat(amount);
    const finalTip = parseFloat(tip_amount);
    const changeAmount = payment_method === 'cash' ? Math.max(0, parseFloat(cash_tendered || 0) - finalAmount) : 0;

    // Simulate card/mobile payment
    const transaction_id = payment_method !== 'cash' ? `TXN-${uuidv4().split('-')[0].toUpperCase()}` : null;
    const card_last_four = payment_method === 'card' ? req.body.card_last_four || '4242' : null;
    const card_type = payment_method === 'card' ? req.body.card_type || 'Visa' : null;

    const payment = await Payment.create({
      order_id,
      payment_method,
      amount: finalAmount,
      tip_amount: finalTip,
      change_amount: changeAmount,
      status: 'completed',
      transaction_id,
      card_last_four,
      card_type,
      processed_by: req.userId,
      processed_at: new Date(),
    }, { transaction: t });

    // Update order totals with tip and mark paid
    const newTotal = parseFloat(order.total_amount) + finalTip - parseFloat(order.tip_amount);
    await order.update({
      status: 'paid',
      tip_amount: finalTip,
      total_amount: newTotal,
      paid_at: new Date(),
    }, { transaction: t });

    // Free the table
    if (order.table_id) {
      await Table.update({ status: 'available' }, { where: { id: order.table_id }, transaction: t });
    }

    // Update customer loyalty
    if (order.customer_id) {
      const pointsEarned = Math.floor(finalAmount);
      await Customer.increment(
        { loyalty_points: pointsEarned, total_spent: finalAmount },
        { where: { id: order.customer_id }, transaction: t }
      );
    }

    await t.commit();

    const updatedOrder = await Order.findByPk(order_id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Customer, as: 'customer' },
        { model: Table, as: 'table' },
        { model: Payment, as: 'payments' },
        { model: User, as: 'waiter' },
      ]
    });

    emitOrderUpdate(updatedOrder);
    if (order.table_id) emitTableUpdate({ id: order.table_id, status: 'available' });

    return successResponse(res, {
      payment,
      order: updatedOrder,
      receipt: generateReceipt(updatedOrder, payment, changeAmount),
    }, 'Payment processed successfully');
  } catch (error) {
    await t.rollback();
    logger.error('Payment error:', error);
    return errorResponse(res, 'Payment processing failed', 500);
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { order_id } = req.query;
    const where = {};
    if (order_id) where.order_id = order_id;
    const payments = await Payment.findAll({
      where,
      include: [{ model: User, as: 'processor', attributes: ['id','first_name','last_name'] }],
      order: [['processed_at', 'DESC']],
    });
    return successResponse(res, { payments });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch payments', 500);
  }
};

exports.refundPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason } = req.body;
    const payment = await Payment.findByPk(req.params.id, { transaction: t });
    if (!payment) { await t.rollback(); return errorResponse(res, 'Payment not found', 404); }
    if (payment.status === 'refunded') { await t.rollback(); return errorResponse(res, 'Payment already refunded', 400); }

    await payment.update({ status: 'refunded', notes: reason }, { transaction: t });
    await Order.update({ status: 'refunded' }, { where: { id: payment.order_id }, transaction: t });

    await t.commit();
    return successResponse(res, { payment }, 'Payment refunded successfully');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 'Failed to process refund', 500);
  }
};

function generateReceipt(order, payment, changeAmount) {
  const items = order.items || [];
  return {
    receipt_number: `RCP-${Date.now()}`,
    restaurant_name: process.env.RESTAURANT_NAME || 'Restaurant',
    restaurant_address: process.env.RESTAURANT_ADDRESS || '',
    restaurant_phone: process.env.RESTAURANT_PHONE || '',
    order_number: order.order_number,
    table: order.table?.table_number,
    waiter: order.waiter ? `${order.waiter.first_name} ${order.waiter.last_name}` : '',
    date: new Date().toISOString(),
    items: items.filter(i => i.status !== 'cancelled').map(i => ({
      name: i.name,
      qty: i.quantity,
      price: parseFloat(i.price),
      total: parseFloat(i.price) * i.quantity,
    })),
    subtotal: parseFloat(order.subtotal),
    discount: parseFloat(order.discount_amount),
    tax: parseFloat(order.tax_amount),
    tip: parseFloat(order.tip_amount),
    total: parseFloat(order.total_amount),
    payment_method: payment.payment_method,
    amount_paid: parseFloat(payment.amount),
    change: changeAmount,
    transaction_id: payment.transaction_id,
    footer: process.env.RECEIPT_FOOTER || 'Thank you for dining with us!',
  };
}
