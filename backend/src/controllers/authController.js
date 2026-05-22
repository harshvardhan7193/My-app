import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateAccessToken, generateRefreshToken, setRefreshCookie, clearRefreshCookie } from '../utils/generateToken.js';

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

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Set refresh token as httpOnly cookie
  setRefreshCookie(res, refreshToken);

  // Update last seen
  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

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

  const accessToken = generateAccessToken(user._id);
  res.json({ accessToken });
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
