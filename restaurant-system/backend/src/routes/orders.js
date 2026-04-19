const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getOrders);
router.get('/active', ctrl.getActiveOrders);
router.get('/:id', ctrl.getOrder);
router.post('/', authorize('admin','manager','waiter','cashier'), ctrl.createOrder);
router.put('/:id', authorize('admin','manager','waiter'), ctrl.updateOrder);
router.patch('/:id/status', authorize('admin','manager','waiter','kitchen','cashier'), ctrl.updateOrderStatus);
router.post('/:id/items', authorize('admin','manager','waiter'), ctrl.addOrderItem);
router.delete('/:id/items/:itemId', authorize('admin','manager','waiter'), ctrl.cancelOrderItem);

module.exports = router;
