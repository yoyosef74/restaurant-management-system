module.exports = (sequelize, DataTypes) => {
  return sequelize.define('OrderItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_id: DataTypes.UUID,
    menu_item_id: DataTypes.INTEGER,
    name: { type: DataTypes.STRING(200), allowNull: false },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    modifiers: { type: DataTypes.JSONB, defaultValue: [] },
    special_instructions: DataTypes.TEXT,
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      validate: { isIn: [['pending','preparing','ready','served','cancelled']] }
    },
    kitchen_station: DataTypes.STRING(50),
    prepared_at: DataTypes.DATE,
    served_at: DataTypes.DATE,
  }, { tableName: 'order_items' });
};
