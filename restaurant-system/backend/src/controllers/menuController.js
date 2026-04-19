const { MenuCategory, MenuItem, MenuItemModifier } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

const itemInclude = [
  { model: MenuCategory, as: 'category', attributes: ['id','name'] },
  { model: MenuItemModifier, as: 'modifiers' },
];

exports.getCategories = async (req, res) => {
  try {
    const where = {};
    if (req.query.active !== 'false') where.is_active = true;
    const categories = await MenuCategory.findAll({
      where,
      include: [{ model: MenuItem, as: 'items', where: { is_available: true }, required: false }],
      order: [['sort_order','ASC'],['name','ASC']],
    });
    return successResponse(res, { categories });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch categories', 500);
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, sort_order, image_url } = req.body;
    const category = await MenuCategory.create({ name, description, sort_order, image_url });
    return successResponse(res, { category }, 'Category created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create category', 500);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await MenuCategory.findByPk(req.params.id);
    if (!category) return errorResponse(res, 'Category not found', 404);
    await category.update(req.body);
    return successResponse(res, { category }, 'Category updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update category', 500);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await MenuCategory.findByPk(req.params.id);
    if (!category) return errorResponse(res, 'Category not found', 404);
    await category.update({ is_active: false });
    return successResponse(res, null, 'Category deactivated');
  } catch (error) {
    return errorResponse(res, 'Failed to delete category', 500);
  }
};

exports.getMenuItems = async (req, res) => {
  try {
    const where = {};
    if (req.query.category_id) where.category_id = req.query.category_id;
    if (req.query.available === 'true') where.is_available = true;
    if (req.query.featured === 'true') where.is_featured = true;
    if (req.query.search) {
      const { Op } = require('sequelize');
      where.name = { [Op.iLike]: `%${req.query.search}%` };
    }
    const items = await MenuItem.findAll({
      where, include: itemInclude,
      order: [['sort_order','ASC'],['name','ASC']],
    });
    return successResponse(res, { items });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch menu items', 500);
  }
};

exports.getMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id, { include: itemInclude });
    if (!item) return errorResponse(res, 'Item not found', 404);
    return successResponse(res, { item });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch item', 500);
  }
};

exports.createMenuItem = async (req, res) => {
  try {
    const { modifiers, ...itemData } = req.body;
    const item = await MenuItem.create(itemData);
    if (modifiers && modifiers.length > 0) {
      await MenuItemModifier.bulkCreate(modifiers.map(m => ({ ...m, menu_item_id: item.id })));
    }
    const full = await MenuItem.findByPk(item.id, { include: itemInclude });
    return successResponse(res, { item: full }, 'Menu item created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create menu item', 500);
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return errorResponse(res, 'Item not found', 404);
    const { modifiers, ...itemData } = req.body;
    await item.update(itemData);
    if (modifiers !== undefined) {
      await MenuItemModifier.destroy({ where: { menu_item_id: item.id } });
      if (modifiers.length > 0) {
        await MenuItemModifier.bulkCreate(modifiers.map(m => ({ ...m, menu_item_id: item.id })));
      }
    }
    const full = await MenuItem.findByPk(item.id, { include: itemInclude });
    return successResponse(res, { item: full }, 'Menu item updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update menu item', 500);
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return errorResponse(res, 'Item not found', 404);
    await item.update({ is_available: false });
    return successResponse(res, null, 'Item deactivated');
  } catch (error) {
    return errorResponse(res, 'Failed to delete item', 500);
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return errorResponse(res, 'Item not found', 404);
    await item.update({ is_available: !item.is_available });
    return successResponse(res, { item }, `Item ${item.is_available ? 'enabled' : 'disabled'}`);
  } catch (error) {
    return errorResponse(res, 'Failed to toggle availability', 500);
  }
};
