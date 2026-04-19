module.exports = (sequelize, DataTypes) => {
  return sequelize.define('MenuItemModifier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    menu_item_id: DataTypes.INTEGER,
    name: { type: DataTypes.STRING(100), allowNull: false },
    options: { type: DataTypes.JSONB, defaultValue: [] },
    is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
    max_selections: { type: DataTypes.INTEGER, defaultValue: 1 },
  }, { tableName: 'menu_item_modifiers', updatedAt: false });
};
