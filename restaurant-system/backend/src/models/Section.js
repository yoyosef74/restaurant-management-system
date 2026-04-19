// Section Model
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Section', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: DataTypes.TEXT,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'sections' });
};
