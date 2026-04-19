module.exports = (sequelize, DataTypes) => {
  return sequelize.define('MenuCategory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: DataTypes.TEXT,
    image_url: DataTypes.STRING(500),
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'menu_categories' });
};
