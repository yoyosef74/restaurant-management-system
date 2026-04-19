const router = require('express').Router();
const ctrl = require('../controllers/kitchenController');
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);
router.get('/', ctrl.getKitchenOrders);
router.get('/stats', ctrl.getKitchenStats);
router.patch('/items/:itemId', ctrl.updateItemStatus);
router.patch('/:id/ready', ctrl.markOrderReady);
module.exports = router;
