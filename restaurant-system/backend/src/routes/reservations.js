const router = require('express').Router();
const ctrl = require('../controllers/reservationController');
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);
router.get('/', ctrl.getReservations);
router.post('/', ctrl.createReservation);
router.put('/:id', ctrl.updateReservation);
router.delete('/:id', ctrl.cancelReservation);
module.exports = router;
