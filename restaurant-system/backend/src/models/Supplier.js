module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Supplier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    contact_person: DataTypes.STRING(100),
    email: DataTypes.STRING(255),
    phone: DataTypes.STRING(20),
    address: DataTypes.TEXT,
    tax_id: DataTypes.STRING(50),
    payment_terms: { type: DataTypes.INTEGER, defaultValue: 30 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    notes: DataTypes.TEXT,
  }, { tableName: 'suppliers' });
};
