module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AuditLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: DataTypes.UUID,
    action: { type: DataTypes.STRING(100), allowNull: false },
    entity_type: DataTypes.STRING(50),
    entity_id: DataTypes.STRING(100),
    old_values: DataTypes.JSONB,
    new_values: DataTypes.JSONB,
    ip_address: DataTypes.STRING(45),
  }, { tableName: 'audit_logs', updatedAt: false });
};
