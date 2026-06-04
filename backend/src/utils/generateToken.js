import jwt from 'jsonwebtoken';

// Accepts either a userId string (legacy) or a user-like object containing
// _id, role, and coupleId. The richer payload lets protect() avoid a DB
// lookup on every request.
const buildAccessPayload = (userOrId) => {
  if (userOrId && typeof userOrId === 'object') {
    return {
      id: String(userOrId._id || userOrId.id),
      role: userOrId.role,
      coupleId: userOrId.coupleId ? String(userOrId.coupleId) : undefined,
      name: userOrId.name,
    };
  }
  return { id: String(userOrId) };
};

export const generateAccessToken = (userOrId) => {
  return jwt.sign(buildAccessPayload(userOrId), process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
};

export const generateRefreshToken = (userOrId) => {
  const id = userOrId && typeof userOrId === 'object' ? String(userOrId._id || userOrId.id) : String(userOrId);
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });
};

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax');
  const secure = process.env.COOKIE_SECURE === 'true' || isProd;
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge,
    expires: new Date(Date.now() + maxAge),
  };
};

// Set refresh token as httpOnly cookie
export const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, getCookieOptions());
};

export const clearRefreshCookie = (res) => {
  const options = getCookieOptions();
  res.cookie('refreshToken', '', {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
};
