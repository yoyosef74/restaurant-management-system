const router = require('express').Router();
const ctrl = require('../controllers/menuController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/categories', ctrl.getCategories);
router.get('/items', ctrl.getMenuItems);
router.get('/items/:id', ctrl.getMenuItem);

router.use(authenticate);
router.post('/categories', authorize('admin','manager'), ctrl.createCategory);
router.put('/categories/:id', authorize('admin','manager'), ctrl.updateCategory);
router.delete('/categories/:id', authorize('admin','manager'), ctrl.deleteCategory);
router.post('/items', authorize('admin','manager'), ctrl.createMenuItem);
router.put('/items/:id', authorize('admin','manager'), ctrl.updateMenuItem);
router.delete('/items/:id', authorize('admin','manager'), ctrl.deleteMenuItem);
router.patch('/items/:id/toggle', authorize('admin','manager'), ctrl.toggleAvailability);

module.exports = router;
