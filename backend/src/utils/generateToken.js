import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
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
