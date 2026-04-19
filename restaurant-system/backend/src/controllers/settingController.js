// settingController.js
const { Setting } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const where = {};
    if (category) where.category = category;
    const settings = await Setting.findAll({ where, order: [['category','ASC'],['key','ASC']] });
    const map = {};
    settings.forEach(s => { map[s.key] = s.type === 'json' ? JSON.parse(s.value || '{}') : s.value; });
    return successResponse(res, { settings, map });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch settings', 500);
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const [setting, created] = await Setting.upsert({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value), updated_by: req.userId, updated_at: new Date() }, { returning: true });
    return successResponse(res, { setting }, 'Setting updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update setting', 500);
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await Setting.upsert({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value), updated_by: req.userId, updated_at: new Date() });
    }
    return successResponse(res, null, 'Settings updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update settings', 500);
  }
};
