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

const getBaseCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax');
  const secure = process.env.COOKIE_SECURE === 'true' || isProd;
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
};

const FALLBACK_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Set refresh token as httpOnly cookie. The cookie's maxAge is read back off
// the token's own `exp` claim so it always matches JWT_REFRESH_EXPIRES —
// previously it was hard-coded to 7 days regardless of that env var, so the
// cookie could expire well before (or after) the token did.
export const setRefreshCookie = (res, token) => {
  const decoded = jwt.decode(token);
  const maxAge = decoded?.exp ? decoded.exp * 1000 - Date.now() : FALLBACK_MAX_AGE;
  res.cookie('refreshToken', token, {
    ...getBaseCookieOptions(),
    maxAge,
    expires: new Date(Date.now() + maxAge),
  });
};

export const clearRefreshCookie = (res) => {
  res.cookie('refreshToken', '', {
    ...getBaseCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
};
