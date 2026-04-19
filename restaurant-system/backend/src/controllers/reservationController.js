const { Op } = require('sequelize');
const { Reservation, Customer, Table, User } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/helpers');

const include = [
  { model: Customer, as: 'customer', attributes: ['id','first_name','last_name','email','phone'] },
  { model: Table, as: 'table', attributes: ['id','table_number','capacity'] },
];

exports.getReservations = async (req, res) => {
  try {
    const { date, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (date) where.reservation_date = date;
    else {
      const today = new Date().toISOString().split('T')[0];
      where.reservation_date = { [Op.gte]: today };
    }
    const { count, rows } = await Reservation.findAndCountAll({
      where, include,
      order: [['reservation_date','ASC'],['reservation_time','ASC']],
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return paginatedResponse(res, rows, count, page, limit);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch reservations', 500);
  }
};

exports.createReservation = async (req, res) => {
  try {
    const { customer_id, table_id, party_size, reservation_date, reservation_time, special_requests, duration_minutes } = req.body;

    // Check for conflicts
    const conflict = await Reservation.findOne({
      where: {
        table_id, reservation_date,
        status: { [Op.in]: ['pending','confirmed','seated'] },
        reservation_time: {
          [Op.between]: [
            new Date(`${reservation_date} ${reservation_time}`).getTime() - (duration_minutes || 90) * 60000,
            new Date(`${reservation_date} ${reservation_time}`).getTime() + (duration_minutes || 90) * 60000,
          ],
        },
      },
    });
    if (conflict) return errorResponse(res, 'Table is already reserved at this time', 409);

    const reservation = await Reservation.create({
      customer_id, table_id, party_size, reservation_date, reservation_time,
      special_requests, duration_minutes: duration_minutes || 90,
      confirmed_by: req.userId, status: 'confirmed',
    });
    const full = await Reservation.findByPk(reservation.id, { include });
    return successResponse(res, { reservation: full }, 'Reservation created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create reservation', 500);
  }
};

exports.updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    await reservation.update(req.body);
    const full = await Reservation.findByPk(reservation.id, { include });
    return successResponse(res, { reservation: full }, 'Reservation updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update reservation', 500);
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    await reservation.update({ status: 'cancelled' });
    return successResponse(res, null, 'Reservation cancelled');
  } catch (error) {
    return errorResponse(res, 'Failed to cancel reservation', 500);
  }
};
