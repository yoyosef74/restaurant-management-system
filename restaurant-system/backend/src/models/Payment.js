module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Payment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_id: DataTypes.UUID,
    payment_method: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: { isIn: [['cash','card','mobile','voucher','split']] }
    },
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    tip_amount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    change_amount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      validate: { isIn: [['pending','completed','failed','refunded']] }
    },
    transaction_id: DataTypes.STRING(100),
    card_last_four: DataTypes.STRING(4),
    card_type: DataTypes.STRING(20),
    notes: DataTypes.TEXT,
    processed_by: DataTypes.UUID,
    processed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'payments', updatedAt: false });
};
