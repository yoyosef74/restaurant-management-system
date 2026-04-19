module.exports = (sequelize, DataTypes) => {
  return sequelize.define('InventoryCategory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: DataTypes.TEXT,
  }, { tableName: 'inventory_categories', updatedAt: false });
};
