const { sequelize, Sequelize } = require('../config/database');

// Import all models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Role = require('./Role')(sequelize, Sequelize.DataTypes);
const Section = require('./Section')(sequelize, Sequelize.DataTypes);
const Table = require('./Table')(sequelize, Sequelize.DataTypes);
const MenuCategory = require('./MenuCategory')(sequelize, Sequelize.DataTypes);
const MenuItem = require('./MenuItem')(sequelize, Sequelize.DataTypes);
const MenuItemModifier = require('./MenuItemModifier')(sequelize, Sequelize.DataTypes);
const Customer = require('./Customer')(sequelize, Sequelize.DataTypes);
const Order = require('./Order')(sequelize, Sequelize.DataTypes);
const OrderItem = require('./OrderItem')(sequelize, Sequelize.DataTypes);
const Payment = require('./Payment')(sequelize, Sequelize.DataTypes);
const InventoryCategory = require('./InventoryCategory')(sequelize, Sequelize.DataTypes);
const InventoryItem = require('./InventoryItem')(sequelize, Sequelize.DataTypes);
const InventoryTransaction = require('./InventoryTransaction')(sequelize, Sequelize.DataTypes);
const Supplier = require('./Supplier')(sequelize, Sequelize.DataTypes);
const Reservation = require('./Reservation')(sequelize, Sequelize.DataTypes);
const Setting = require('./Setting')(sequelize, Sequelize.DataTypes);
const AuditLog = require('./AuditLog')(sequelize, Sequelize.DataTypes);

const db = {
  sequelize,
  Sequelize,
  User, Role, Section, Table,
  MenuCategory, MenuItem, MenuItemModifier,
  Customer, Order, OrderItem, Payment,
  InventoryCategory, InventoryItem, InventoryTransaction, Supplier,
  Reservation, Setting, AuditLog,
};

// ---- Associations ----
// Role <-> User
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// Section <-> Table
Section.hasMany(Table, { foreignKey: 'section_id', as: 'tables' });
Table.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });

// MenuCategory <-> MenuItem
MenuCategory.hasMany(MenuItem, { foreignKey: 'category_id', as: 'items' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'category_id', as: 'category' });

// MenuItem <-> MenuItemModifier
MenuItem.hasMany(MenuItemModifier, { foreignKey: 'menu_item_id', as: 'modifiers' });
MenuItemModifier.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });

// Order associations
Table.hasMany(Order, { foreignKey: 'table_id', as: 'orders' });
Order.belongsTo(Table, { foreignKey: 'table_id', as: 'table' });

Customer.hasMany(Order, { foreignKey: 'customer_id', as: 'orders' });
Order.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

User.hasMany(Order, { foreignKey: 'waiter_id', as: 'waitedOrders' });
Order.belongsTo(User, { foreignKey: 'waiter_id', as: 'waiter' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

MenuItem.hasMany(OrderItem, { foreignKey: 'menu_item_id', as: 'orderItems' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });

Order.hasMany(Payment, { foreignKey: 'order_id', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

User.hasMany(Payment, { foreignKey: 'processed_by', as: 'processedPayments' });
Payment.belongsTo(User, { foreignKey: 'processed_by', as: 'processor' });

// Inventory
InventoryCategory.hasMany(InventoryItem, { foreignKey: 'category_id', as: 'items' });
InventoryItem.belongsTo(InventoryCategory, { foreignKey: 'category_id', as: 'category' });

Supplier.hasMany(InventoryItem, { foreignKey: 'supplier_id', as: 'inventoryItems' });
InventoryItem.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

InventoryItem.hasMany(InventoryTransaction, { foreignKey: 'item_id', as: 'transactions' });
InventoryTransaction.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });

User.hasMany(InventoryTransaction, { foreignKey: 'performed_by', as: 'inventoryActions' });
InventoryTransaction.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });

// Reservations
Customer.hasMany(Reservation, { foreignKey: 'customer_id', as: 'reservations' });
Reservation.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Table.hasMany(Reservation, { foreignKey: 'table_id', as: 'reservations' });
Reservation.belongsTo(Table, { foreignKey: 'table_id', as: 'table' });

// Audit logs
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = db;
