module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Table', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    table_number: { type: DataTypes.STRING(20), unique: true, allowNull: false },
    section_id: DataTypes.INTEGER,
    capacity: { type: DataTypes.INTEGER, defaultValue: 4 },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'available',
      validate: { isIn: [['available','occupied','reserved','cleaning']] }
    },
    qr_code: DataTypes.STRING(255),
    x_position: { type: DataTypes.FLOAT, defaultValue: 0 },
    y_position: { type: DataTypes.FLOAT, defaultValue: 0 },
    shape: { type: DataTypes.STRING(20), defaultValue: 'rectangle' },
  }, { tableName: 'tables' });
};
