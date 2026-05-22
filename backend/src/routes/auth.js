import { Router } from 'express';
import { body } from 'express-validator';
import { login, refresh, logout } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/login', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, login);

router.post('/refresh', refresh);
router.post('/logout', protect, logout);

export default router;
