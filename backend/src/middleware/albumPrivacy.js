import { verifyVaultToken } from '../utils/albumTokens.js';

// Gate for any operation that reveals the existence of, lists, or mutates
// private-album metadata (creation, listing, PIN reset). Requires the
// caller to have re-confirmed their account password recently via
// POST /auth/verify-password.
export const requireVaultToken = (req, res, next) => {
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
