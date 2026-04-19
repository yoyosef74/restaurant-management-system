const router = require('express').Router();
const ctrl = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/categories', ctrl.getCategories);
router.get('/suppliers', ctrl.getSuppliers);
router.post('/suppliers', authorize('admin','manager'), ctrl.createSupplier);
router.put('/suppliers/:id', authorize('admin','manager'), ctrl.updateSupplier);
router.get('/low-stock', ctrl.getLowStockItems);
router.get('/transactions', ctrl.getTransactions);
router.post('/adjust', authorize('admin','manager'), ctrl.adjustStock);
router.get('/', ctrl.getItems);
router.get('/:id', ctrl.getItem);
router.post('/', authorize('admin','manager'), ctrl.createItem);
router.put('/:id', authorize('admin','manager'), ctrl.updateItem);
router.delete('/:id', authorize('admin','manager'), ctrl.deleteItem);

module.exports = router;
