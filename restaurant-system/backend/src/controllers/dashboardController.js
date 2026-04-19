const { Op, fn, col } = require('sequelize');
const { Order, Table, InventoryItem, Customer, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);

    const [todayRev, yesterdayRev, todayOrders, activeOrders, totalTables, occupiedTables] = await Promise.all([
      Order.sum('total_amount', { where: { status:'paid', paid_at:{ [Op.between]:[today,tomorrow] } } }),
      Order.sum('total_amount', { where: { status:'paid', paid_at:{ [Op.between]:[yesterday,today] } } }),
      Order.count({ where: { created_at:{ [Op.between]:[today,tomorrow] } } }),
      Order.count({ where: { status:{ [Op.in]:['confirmed','preparing','ready','served'] } } }),
      Table.count(),
      Table.count({ where:{ status:'occupied' } }),
    ]);

    const revenueChange = yesterdayRev > 0 ? (((todayRev||0) - yesterdayRev) / yesterdayRev * 100).toFixed(1) : 0;

    const last30 = await sequelize.query(`
      SELECT DATE(paid_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders
      FROM orders WHERE status='paid' AND paid_at >= NOW()-INTERVAL '30 days'
      GROUP BY DATE(paid_at) ORDER BY date
    `, { type: sequelize.QueryTypes.SELECT });

    const lowStock = await InventoryItem.count({ where: { is_active:true, [Op.and]: sequelize.literal('"InventoryItem"."current_stock" <= "InventoryItem"."reorder_point"') } });
    const newCustomers = await Customer.count({ where: { created_at:{ [Op.between]:[today,tomorrow] } } });

    return successResponse(res, {
      revenue: { today: parseFloat(todayRev||0).toFixed(2), change: revenueChange },
      orders: { today: todayOrders, active: activeOrders },
      tables: { total: totalTables, occupied: occupiedTables, occupancy: totalTables > 0 ? ((occupiedTables/totalTables)*100).toFixed(0) : 0 },
      alerts: { low_stock: lowStock, new_customers: newCustomers },
      chart: last30,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch stats', 500);
  }
};
