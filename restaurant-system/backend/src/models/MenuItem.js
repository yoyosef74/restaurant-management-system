module.exports = (sequelize, DataTypes) => {
  return sequelize.define('MenuItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_id: DataTypes.INTEGER,
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: DataTypes.TEXT,
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    cost: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    image_url: DataTypes.STRING(500),
    sku: { type: DataTypes.STRING(50), unique: true },
    is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
    preparation_time: { type: DataTypes.INTEGER, defaultValue: 15 },
    calories: DataTypes.INTEGER,
    allergens: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    tags: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, { tableName: 'menu_items' });
};
