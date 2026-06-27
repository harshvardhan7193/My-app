import { verifyVaultToken } from '../utils/albumTokens.js';
import { isAdmin } from '../utils/accessControl.js';

export const requireVaultToken = (req, res, next) => {
  if (isAdmin(req)) return next();
  const token = req.headers['x-vault-token'];
  if (!token) {
    return res.status(401).json({ message: 'Vault is locked', code: 'VAULT_LOCKED' });
  }

  try {
    verifyVaultToken(token, req.user._id);
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    res.status(401).json({
      message: expired ? 'Vault session expired' : 'Vault token invalid',
      code: expired ? 'VAULT_EXPIRED' : 'VAULT_INVALID',
    });
  }
};
