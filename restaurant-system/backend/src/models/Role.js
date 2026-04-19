// Role Model
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), unique: true, allowNull: false },
    description: DataTypes.TEXT,
    permissions: { type: DataTypes.JSONB, defaultValue: [] },
  }, { tableName: 'roles' });
};
