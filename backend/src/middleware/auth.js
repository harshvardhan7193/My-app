import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes — requires valid JWT
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header first, then cookies
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized — no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized — user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Not authorized — invalid token' });
  }
};

// Inject coupleId from the authenticated user
export const injectCoupleId = (req, res, next) => {
  if (!req.user?.coupleId) {
    return res.status(403).json({ message: 'User is not part of a couple' });
  }
  req.coupleId = req.user.coupleId;
  next();
};
