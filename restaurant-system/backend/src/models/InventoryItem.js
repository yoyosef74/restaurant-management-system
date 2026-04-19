module.exports = (sequelize, DataTypes) => {
  return sequelize.define('InventoryItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_id: DataTypes.INTEGER,
    name: { type: DataTypes.STRING(200), allowNull: false },
    sku: { type: DataTypes.STRING(50), unique: true },
    description: DataTypes.TEXT,
    unit: { type: DataTypes.STRING(30), allowNull: false },
    current_stock: { type: DataTypes.DECIMAL(10,3), defaultValue: 0 },
    minimum_stock: { type: DataTypes.DECIMAL(10,3), defaultValue: 0 },
    maximum_stock: { type: DataTypes.DECIMAL(10,3), defaultValue: 1000 },
    reorder_point: { type: DataTypes.DECIMAL(10,3), defaultValue: 10 },
    cost_per_unit: { type: DataTypes.DECIMAL(10,4), defaultValue: 0 },
    supplier_id: DataTypes.INTEGER,
    location: DataTypes.STRING(100),
    expiry_date: DataTypes.DATEONLY,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'inventory_items' });
};
