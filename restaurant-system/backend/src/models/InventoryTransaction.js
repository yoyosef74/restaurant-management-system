module.exports = (sequelize, DataTypes) => {
  return sequelize.define('InventoryTransaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    item_id: DataTypes.INTEGER,
    transaction_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: { isIn: [['purchase','consumption','waste','adjustment','transfer']] }
    },
    quantity: { type: DataTypes.DECIMAL(10,3), allowNull: false },
    unit_cost: DataTypes.DECIMAL(10,4),
    total_cost: DataTypes.DECIMAL(10,2),
    reference_id: DataTypes.STRING(100),
    notes: DataTypes.TEXT,
    performed_by: DataTypes.UUID,
  }, { tableName: 'inventory_transactions', updatedAt: false });
};
