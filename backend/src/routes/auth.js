import { Router } from 'express';
import { body } from 'express-validator';
import { login, refresh, logout, verifyAccountPassword, changePassword } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/login', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, login);

router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.post('/verify-password', protect, verifyAccountPassword);
router.post('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], validate, changePassword);

export default router;
