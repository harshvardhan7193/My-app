import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes — requires valid JWT.
// Performance: trusts the JWT payload for id/role/coupleId so we skip the
// per-request User.findById round-trip. Token rotation/expiry (15m) caps
// staleness for things like role changes.
export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized — no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Build a lightweight user proxy from JWT claims. Controllers that need the
    // full document should call req.loadUser() (cached for the request).
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      role: decoded.role,
      coupleId: decoded.coupleId,
      name: decoded.name,
    };

    let cachedUser = null;
    req.loadUser = async () => {
      if (cachedUser) return cachedUser;
      cachedUser = await User.findById(decoded.id).select('-password').lean();
      if (!cachedUser) {
        const err = new Error('User not found');
        err.statusCode = 401;
        throw err;
      }
      // Merge convenience fields onto req.user so existing call-sites keep working.
      Object.assign(req.user, cachedUser);
      return cachedUser;
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (error.statusCode === 401) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(401).json({ message: 'Not authorized — invalid token' });
  }
};

// Inject coupleId from the authenticated user. coupleId comes from the JWT
// payload set in protect(); no DB call needed.
export const injectCoupleId = (req, res, next) => {
  if (!req.user?.coupleId) {
    return res.status(403).json({ message: 'User is not part of a couple' });
  }
  req.coupleId = req.user.coupleId;
  next();
};
