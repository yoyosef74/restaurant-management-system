module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Reservation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customer_id: DataTypes.UUID,
    table_id: DataTypes.INTEGER,
    party_size: { type: DataTypes.INTEGER, allowNull: false },
    reservation_date: { type: DataTypes.DATEONLY, allowNull: false },
    reservation_time: { type: DataTypes.TIME, allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER, defaultValue: 90 },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'confirmed',
      validate: { isIn: [['pending','confirmed','seated','completed','cancelled','no-show']] }
    },
    special_requests: DataTypes.TEXT,
    notes: DataTypes.TEXT,
    confirmed_by: DataTypes.UUID,
  }, { tableName: 'reservations' });
};
