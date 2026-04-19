module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Order', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_number: { type: DataTypes.STRING(20), unique: true, allowNull: false },
    table_id: DataTypes.INTEGER,
    customer_id: DataTypes.UUID,
    waiter_id: DataTypes.UUID,
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'pending',
      validate: { isIn: [['pending','confirmed','preparing','ready','served','paid','cancelled','refunded']] }
    },
    order_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'dine-in',
      validate: { isIn: [['dine-in','takeaway','delivery','online']] }
    },
    subtotal: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    discount_type: DataTypes.STRING(20),
    discount_reason: DataTypes.TEXT,
    tax_amount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    tax_rate: { type: DataTypes.DECIMAL(5,4), defaultValue: 0.08 },
    tip_amount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    notes: DataTypes.TEXT,
    kitchen_notes: DataTypes.TEXT,
    estimated_time: DataTypes.INTEGER,
    seated_at: DataTypes.DATE,
    ordered_at: DataTypes.DATE,
    served_at: DataTypes.DATE,
    paid_at: DataTypes.DATE,
  }, { tableName: 'orders' });
};
