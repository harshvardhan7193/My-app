import jwt from 'jsonwebtoken';

// Short-lived auxiliary tokens used by the "private album vault" feature.
// They piggyback on the same JWT secret as the regular access token so we
// don't have to provision new key material, but their `kind` claim makes
// sure they can never be confused with a normal session token.

const VAULT_TTL = '30m';
const ALBUM_UNLOCK_TTL = '15m';

const SECRET = () => process.env.JWT_ACCESS_SECRET;

// Issued by POST /auth/verify-password — proves the holder re-typed their
// account password recently and is allowed to see/manage the list of
// private albums for the next 30 minutes.
export const signVaultToken = (userId) =>
  jwt.sign({ sub: String(userId), kind: 'vault' }, SECRET(), { expiresIn: VAULT_TTL });

export const verifyVaultToken = (token, userId) => {
  const decoded = jwt.verify(token, SECRET());
  if (decoded.kind !== 'vault') throw new Error('Wrong token kind');
  if (decoded.sub !== String(userId)) throw new Error('Token belongs to another user');
  return decoded;
};

// Issued by POST /albums/:id/unlock — proves the holder typed the correct
// PIN for that specific album. Required to read/write its private contents.
export const signAlbumUnlockToken = (userId, albumId) =>
  jwt.sign(
    { sub: String(userId), albumId: String(albumId), kind: 'album-unlock' },
    SECRET(),
    { expiresIn: ALBUM_UNLOCK_TTL },
  );

export const verifyAlbumUnlockToken = (token, userId, albumId) => {
  const decoded = jwt.verify(token, SECRET());
  if (decoded.kind !== 'album-unlock') throw new Error('Wrong token kind');
  if (decoded.sub !== String(userId)) throw new Error('Token belongs to another user');
  if (decoded.albumId !== String(albumId)) throw new Error('Token is for a different album');
  return decoded;
};
