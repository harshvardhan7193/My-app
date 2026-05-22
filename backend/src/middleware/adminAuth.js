// Admin-only route protection
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied — admin only' });
  }
  next();
};
