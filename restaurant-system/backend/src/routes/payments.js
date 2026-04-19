const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getPayments);
router.post('/', authorize('admin','manager','cashier','waiter'), ctrl.processPayment);
router.post('/:id/refund', authorize('admin','manager'), ctrl.refundPayment);

module.exports = router;
