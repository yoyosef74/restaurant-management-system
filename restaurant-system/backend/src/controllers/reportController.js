const { Op, fn, col, literal } = require('sequelize');
const { Order, OrderItem, Payment, MenuItem, MenuCategory, Table, User, Customer, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayOrders, todayRevenue, activeOrders, totalCustomers, lowStockCount] = await Promise.all([
      Order.count({ where: { created_at: { [Op.between]: [today, tomorrow] } } }),
      Order.sum('total_amount', { where: { status: 'paid', paid_at: { [Op.between]: [today, tomorrow] } } }),
      Order.count({ where: { status: { [Op.in]: ['confirmed','preparing','ready','served'] } } }),
      Customer.count({ where: { is_active: true } }),
      sequelize.query(`SELECT COUNT(*) as count FROM inventory_items WHERE is_active = true AND current_stock <= reorder_point`, { type: sequelize.QueryTypes.SELECT }),
    ]);

    // Last 7 days revenue
    const last7Days = await sequelize.query(`
      SELECT DATE(paid_at) as date, 
             COUNT(*) as orders,
             COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      WHERE status = 'paid' 
        AND paid_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(paid_at) 
      ORDER BY date ASC
    `, { type: sequelize.QueryTypes.SELECT });

    // Top selling items today
    const topItems = await sequelize.query(`
      SELECT mi.name, SUM(oi.quantity) as quantity, SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'paid' AND DATE(o.paid_at) = CURRENT_DATE AND oi.status != 'cancelled'
      GROUP BY mi.name
      ORDER BY quantity DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    // Payment method breakdown today
    const paymentBreakdown = await Payment.findAll({
      attributes: ['payment_method', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount')), 'total']],
      where: { status: 'completed', processed_at: { [Op.between]: [today, tomorrow] } },
      group: ['payment_method'],
    });

    // Table occupancy
    const tableStats = await sequelize.query(`
      SELECT status, COUNT(*) as count FROM tables GROUP BY status
    `, { type: sequelize.QueryTypes.SELECT });

    return successResponse(res, {
      today: {
        orders: todayOrders,
        revenue: parseFloat(todayRevenue || 0).toFixed(2),
        active_orders: activeOrders,
      },
      customers: totalCustomers,
      low_stock_alerts: parseInt(lowStockCount[0]?.count || 0),
      revenue_trend: last7Days,
      top_items: topItems,
      payment_breakdown: paymentBreakdown,
      table_stats: tableStats,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch dashboard stats', 500);
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const { date_from, date_to, group_by = 'day' } = req.query;
    const start = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 86400000);
    const end = date_to ? new Date(date_to + 'T23:59:59') : new Date();

    const groupFormat = group_by === 'month' ? 'YYYY-MM' : group_by === 'week' ? 'IYYY-IW' : 'YYYY-MM-DD';
    const sales = await sequelize.query(`
      SELECT 
        TO_CHAR(paid_at, '${groupFormat}') as period,
        COUNT(*) as order_count,
        SUM(subtotal) as subtotal,
        SUM(discount_amount) as discounts,
        SUM(tax_amount) as tax,
        SUM(tip_amount) as tips,
        SUM(total_amount) as total,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE status = 'paid' AND paid_at BETWEEN :start AND :end
      GROUP BY TO_CHAR(paid_at, '${groupFormat}')
      ORDER BY period ASC
    `, { replacements: { start, end }, type: sequelize.QueryTypes.SELECT });

    const summary = await Order.findAll({
      attributes: [
        [fn('COUNT', col('id')), 'total_orders'],
        [fn('SUM', col('total_amount')), 'total_revenue'],
        [fn('AVG', col('total_amount')), 'avg_order'],
        [fn('SUM', col('tip_amount')), 'total_tips'],
        [fn('SUM', col('discount_amount')), 'total_discounts'],
        [fn('SUM', col('tax_amount')), 'total_tax'],
      ],
      where: { status: 'paid', paid_at: { [Op.between]: [start, end] } },
      raw: true,
    });

    return successResponse(res, { sales, summary: summary[0], period: { from: start, to: end } });
  } catch (error) {
    return errorResponse(res, 'Failed to generate sales report', 500);
  }
};

exports.getItemReport = async (req, res) => {
  try {
    const { date_from, date_to, limit = 20 } = req.query;
    const start = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 86400000);
    const end = date_to ? new Date(date_to + 'T23:59:59') : new Date();

    const items = await sequelize.query(`
      SELECT 
        mi.id, mi.name, mc.name as category,
        SUM(oi.quantity) as total_qty,
        SUM(oi.price * oi.quantity) as total_revenue,
        AVG(oi.price) as avg_price,
        COUNT(DISTINCT o.id) as order_count
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN menu_categories mc ON mi.category_id = mc.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'paid' AND o.paid_at BETWEEN :start AND :end AND oi.status != 'cancelled'
      GROUP BY mi.id, mi.name, mc.name
      ORDER BY total_revenue DESC
      LIMIT :limit
    `, { replacements: { start, end, limit: parseInt(limit) }, type: sequelize.QueryTypes.SELECT });

    return successResponse(res, { items, period: { from: start, to: end } });
  } catch (error) {
    return errorResponse(res, 'Failed to generate item report', 500);
  }
};

exports.getStaffReport = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const start = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 86400000);
    const end = date_to ? new Date(date_to + 'T23:59:59') : new Date();

    const staffStats = await sequelize.query(`
      SELECT 
        u.id, u.first_name, u.last_name,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order,
        SUM(o.tip_amount) as total_tips,
        COUNT(DISTINCT DATE(o.paid_at)) as days_worked
      FROM orders o
      JOIN users u ON o.waiter_id = u.id
      WHERE o.status = 'paid' AND o.paid_at BETWEEN :start AND :end
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_revenue DESC
    `, { replacements: { start, end }, type: sequelize.QueryTypes.SELECT });

    return successResponse(res, { staff: staffStats, period: { from: start, to: end } });
  } catch (error) {
    return errorResponse(res, 'Failed to generate staff report', 500);
  }
};

exports.getHourlyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const hourly = await sequelize.query(`
      SELECT 
        EXTRACT(HOUR FROM paid_at) as hour,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders
      WHERE status = 'paid' AND paid_at BETWEEN :start AND :end
      GROUP BY EXTRACT(HOUR FROM paid_at)
      ORDER BY hour ASC
    `, { replacements: { start, end }, type: sequelize.QueryTypes.SELECT });

    return successResponse(res, { hourly });
  } catch (error) {
    return errorResponse(res, 'Failed to generate hourly report', 500);
  }
};
