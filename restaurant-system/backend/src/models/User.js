const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), unique: true, allowNull: false, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role_id: { type: DataTypes.INTEGER },
    phone: DataTypes.STRING(20),
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_login: DataTypes.DATE,
  }, {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['password_hash'] } },
    scopes: { withPassword: { attributes: {} } }
  });

  User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
  };

  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
  };

  User.hashPassword = async (password) => {
    return bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  };

  return User;
};
