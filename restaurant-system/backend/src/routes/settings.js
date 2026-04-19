const router = require('express').Router();
const ctrl = require('../controllers/settingController');
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);
router.get('/', ctrl.getSettings);
router.put('/bulk', authorize('admin','manager'), ctrl.updateSettings);
router.put('/:key', authorize('admin','manager'), ctrl.updateSetting);
module.exports = router;
