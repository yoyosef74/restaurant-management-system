const router = require('express').Router();
const ctrl = require('../controllers/tableController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getTables);
router.get('/sections', ctrl.getSections);
router.get('/:id', ctrl.getTable);
router.post('/', authorize('admin','manager'), ctrl.createTable);
router.put('/:id', authorize('admin','manager'), ctrl.updateTable);
router.patch('/:id/status', authorize('admin','manager','waiter'), ctrl.updateTableStatus);
router.delete('/:id', authorize('admin'), ctrl.deleteTable);
router.post('/sections', authorize('admin','manager'), ctrl.createSection);

module.exports = router;
