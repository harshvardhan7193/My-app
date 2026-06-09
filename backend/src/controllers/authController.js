import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateAccessToken, generateRefreshToken, setRefreshCookie, clearRefreshCookie } from '../utils/generateToken.js';
import { signVaultToken } from '../utils/albumTokens.js';

// Escape regex metacharacters in user input before embedding in a $regex query
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Login user
// @route   POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    res.status(400);
    throw new Error('User ID and password are required');
  }

  // Find user by email (exact, case-insensitive) or name (exact, case-insensitive)
  const id = userId.trim().toLowerCase();
  const user = await User.findOne({
    $or: [
      { email: id },
      { name: { $regex: `^${escapeRegExp(id)}$`, $options: 'i' } },
    ],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Generate tokens — embed role + coupleId in the access token so route
  // protection can skip a per-request DB lookup.
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user._id);

  setRefreshCookie(res, refreshToken);

  // Best-effort presence update — don't block the login response on it.
  User.updateOne({ _id: user._id }, { isOnline: true, lastSeen: new Date() }).catch(() => {});

  res.json({
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      coupleId: user.coupleId,
    },
  });
});

// @desc    Refresh access token (with refresh-token rotation)
// @route   POST /api/auth/refresh
//
// "No session" is the routine boot state for unauthenticated visitors — App.jsx pings this
// endpoint on every page load. We return a clean 401 directly (no thrown Error, no stack
// in the response body, no error-handler log spam) so an absent / expired cookie is treated
// as a normal status rather than a server-side error.
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ message: 'No refresh token', code: 'NO_SESSION' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH' });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ message: 'User not found', code: 'USER_NOT_FOUND' });
  }

  // Rotate: issue a brand-new refresh token and overwrite the cookie.
  // This shrinks the stolen-cookie window to a single refresh cycle.
  const newRefreshToken = generateRefreshToken(user._id);
  setRefreshCookie(res, newRefreshToken);

  const accessToken = generateAccessToken(user);
  res.json({ accessToken });
});

// @desc    Re-verify the user's account password and issue a short-lived
//          "vault token" used to enter the private-album vault. Does NOT
//          rotate the refresh cookie or change the access token — it only
//          mints an auxiliary token that other endpoints look for via the
//          X-Vault-Token header.
// @route   POST /api/auth/verify-password
export const verifyAccountPassword = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    res.status(400);
    throw new Error('Password is required');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    res.status(401);
    throw new Error('Incorrect password');
  }

  const vaultToken = signVaultToken(user._id);
  res.json({ vaultToken });
});

// @desc    Logout user
// @route   POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  // Update online status if user is authenticated
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
    });
  }

  clearRefreshCookie(res);

  res.json({ message: 'Logged out successfully' });
});
