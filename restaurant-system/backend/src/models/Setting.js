module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Setting', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    value: DataTypes.TEXT,
    type: { type: DataTypes.STRING(20), defaultValue: 'string' },
    category: DataTypes.STRING(50),
    description: DataTypes.TEXT,
    updated_by: DataTypes.UUID,
  }, { tableName: 'settings', createdAt: false });
};
