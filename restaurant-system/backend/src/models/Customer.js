module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Customer', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: DataTypes.STRING(100),
    email: { type: DataTypes.STRING(255), unique: true },
    phone: DataTypes.STRING(20),
    loyalty_points: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_visits: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_spent: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
    notes: DataTypes.TEXT,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'customers' });
};
