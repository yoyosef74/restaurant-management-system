// routes/auth.js
const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

router.post('/login', [body('email').isEmail(), body('password').notEmpty(), validate], ctrl.login);
router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, ctrl.updateProfile);
router.put('/change-password', authenticate, [body('current_password').notEmpty(), body('new_password').isLength({ min: 6 }), validate], ctrl.changePassword);

module.exports = router;
