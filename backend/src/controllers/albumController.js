import bcrypt from 'bcryptjs';
import Album from '../models/Album.js';
import asyncHandler from '../utils/asyncHandler.js';
import cloudinary from '../config/cloudinary.js';
import {
  signAlbumUnlockToken,
  verifyAlbumUnlockToken,
} from '../utils/albumTokens.js';

// Best-effort destroy — never throws so a missing/orphan asset doesn't fail a delete request
const destroyAsset = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Cloudinary destroy failed for ${publicId}:`, err.message);
  }
};

// PINs are couple-shared and short, so we accept 4–6 digits. We hash them
// with bcrypt so they can't be brute-forced from a database leak.
const PIN_REGEX = /^\d{4,6}$/;

const isValidPin = (pin) => typeof pin === 'string' && PIN_REGEX.test(pin);

const hashPin = async (pin) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
};

// Strip server-only fields before responding to the client. In particular
// pinHash must never reach the network even though `select: false` already
// hides it from default queries — defence in depth in case a future
// controller forgets and adds `+pinHash` to a populate.
const sanitize = (album) => {
  if (!album) return album;
  const obj = album.toObject ? album.toObject({ virtuals: true }) : album;
  delete obj.pinHash;
  return obj;
};

// Strips the `photos` array AND description so a private-album listing
// only reveals title/cover/count/dates while still locked. The cover image
// is intentionally kept so the user can recognise the album in the vault.
const stripPrivateContent = (album) => {
  const safe = sanitize(album);
  return {
    ...safe,
    description: '',
    photos: [],
    count: (album.photos || []).length,
  };
};

// Reads the X-Album-Unlock-Token header and verifies it matches the
// requested album. Sends a 401 + `code` on any mismatch and returns false
// so the caller can `return` early; the response is already finished.
const ensureAlbumUnlock = (req, res, album) => {
  const token = req.headers['x-album-unlock-token'];
  if (!token) {
    res.status(401).json({ message: 'Album is locked', code: 'ALBUM_LOCKED' });
    return false;
  }
  try {
    verifyAlbumUnlockToken(token, req.user._id, album._id);
    return true;
  } catch (e) {
    const expired = e.name === 'TokenExpiredError';
    res.status(401).json({
      message: expired ? 'Unlock expired' : 'Invalid unlock',
      code: expired ? 'ALBUM_UNLOCK_EXPIRED' : 'ALBUM_UNLOCK_INVALID',
    });
    return false;
  }
};

// ── Public album list ───────────────────────────────────────────────────
// Excludes anything marked private. Private albums only surface inside
// the vault via getPrivateAlbums().
export const getAlbums = asyncHandler(async (req, res) => {
  const albums = await Album.find({
    coupleId: req.coupleId,
    isPrivate: { $ne: true },
  })
    .sort({ date: -1 })
    .populate('createdBy', 'name avatar');
  res.json(albums.map(sanitize));
});

// ── Private album list (vault) ──────────────────────────────────────────
// Caller must already have a valid X-Vault-Token (enforced by the
// requireVaultToken route guard before this runs). We deliberately strip
// `photos` and `description` so the contents stay sealed until the user
// also unlocks the individual album with its PIN.
export const getPrivateAlbums = asyncHandler(async (req, res) => {
  const albums = await Album.find({
    coupleId: req.coupleId,
    isPrivate: true,
  })
    .sort({ date: -1 })
    .populate('createdBy', 'name avatar');
  res.json(albums.map(stripPrivateContent));
});

export const getAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId })
    .populate('createdBy', 'name avatar');
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;
  res.json(sanitize(album));
});

// ── Create ──────────────────────────────────────────────────────────────
// Creating a *private* album also requires the vault token (route-level
// guard) AND a 4–6 digit PIN, hashed before persistence.
export const createAlbum = asyncHandler(async (req, res) => {
  const { isPrivate, pin, ...rest } = req.body;

  if (isPrivate && !isValidPin(pin)) {
    res.status(400);
    throw new Error('PIN must be 4–6 digits');
  }

  const doc = {
    ...rest,
    createdBy: req.user._id,
    coupleId: req.coupleId,
    isPrivate: !!isPrivate,
  };

  if (isPrivate) {
    doc.pinHash = await hashPin(pin);
  }

  const album = await Album.create(doc);
  res.status(201).json(sanitize(album));
});

// ── Update metadata ─────────────────────────────────────────────────────
// We never let a client flip privacy here because that has security
// implications either direction (revealing a previously sealed album, or
// orphaning content into the vault). Use dedicated endpoints for that
// kind of state change if/when needed.
export const updateAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  const { isPrivate, pin, pinHash, ...allowed } = req.body;
  Object.assign(album, allowed);
  await album.save();
  res.json(sanitize(album));
});

// ── Delete ──────────────────────────────────────────────────────────────
// Private albums require the unlock token to delete, so a casual visitor
// with a stolen vault token can't wipe sealed content without also
// knowing the PIN.
export const deleteAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  await album.deleteOne();
  await destroyAsset(album.coverPublicId);
  await Promise.all((album.photos || []).map((p) => destroyAsset(p.publicId)));

  res.json({ message: 'Album deleted' });
});

export const addPhoto = asyncHandler(async (req, res) => {
  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  album.photos.push(req.body);
  await album.save();
  res.status(201).json(sanitize(album));
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  const removed = album.photos.find(p => p._id.toString() === req.params.photoId);
  album.photos = album.photos.filter(p => p._id.toString() !== req.params.photoId);
  await album.save();

  if (removed) await destroyAsset(removed.publicId);

  res.json(sanitize(album));
});

export const deletePhotos = asyncHandler(async (req, res) => {
  const { photoIds } = req.body;
  if (!Array.isArray(photoIds)) {
    res.status(400); throw new Error('photoIds must be an array');
  }

  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  const removedPhotos = album.photos.filter(p => photoIds.includes(p._id.toString()));
  album.photos = album.photos.filter(p => !photoIds.includes(p._id.toString()));
  await album.save();

  removedPhotos.forEach(p => destroyAsset(p.publicId));

  res.json(sanitize(album));
});

export const movePhotos = asyncHandler(async (req, res) => {
  const { targetAlbumId, photoIds } = req.body;
  if (!targetAlbumId || !Array.isArray(photoIds)) {
    res.status(400); throw new Error('Missing targetAlbumId or photoIds');
  }

  const sourceAlbum = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId });
  const targetAlbum = await Album.findOne({ _id: targetAlbumId, coupleId: req.coupleId });

  if (!sourceAlbum || !targetAlbum) {
    res.status(404); throw new Error('Source or target album not found');
  }

  if (sourceAlbum.isPrivate && !ensureAlbumUnlock(req, res, sourceAlbum)) return;

  if (targetAlbum.isPrivate) {
    const targetToken = req.headers['x-target-album-unlock-token'];
    if (!targetToken) {
       res.status(401).json({ message: 'Target album is locked', code: 'TARGET_ALBUM_LOCKED' });
       return;
    }
    try {
      verifyAlbumUnlockToken(targetToken, req.user._id, targetAlbum._id);
    } catch (e) {
      res.status(401).json({ message: 'Invalid target unlock', code: 'TARGET_ALBUM_UNLOCK_INVALID' });
      return;
    }
  }

  const movingPhotos = sourceAlbum.photos.filter(p => photoIds.includes(p._id.toString()));
  sourceAlbum.photos = sourceAlbum.photos.filter(p => !photoIds.includes(p._id.toString()));
  
  const newPhotos = movingPhotos.map(p => ({
    img: p.img,
    publicId: p.publicId,
    mediaType: p.mediaType
  }));
  
  targetAlbum.photos.push(...newPhotos);

  await sourceAlbum.save();
  await targetAlbum.save();

  res.json(sanitize(sourceAlbum));
});

// ── Unlock (PIN check) ──────────────────────────────────────────────────
// Verifies the user-supplied PIN against the stored bcrypt hash and, on
// success, mints a 15-minute album-unlock JWT scoped to (userId, albumId).
// We deliberately use the same generic error on success/failure timing
// for missing-album vs wrong-PIN to make enumeration harder.
export const unlockAlbum = asyncHandler(async (req, res) => {
  const { pin } = req.body || {};
  if (!isValidPin(pin)) {
    res.status(400);
    throw new Error('PIN must be 4–6 digits');
  }

  const album = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    isPrivate: true,
  }).select('+pinHash');

  // Run bcrypt regardless of whether the album exists, so a "not found"
  // and a "wrong PIN" take the same wall-clock time.
  const ok = album && album.pinHash
    ? await bcrypt.compare(pin, album.pinHash)
    : await bcrypt.compare(pin, '$2a$10$invalidsaltinvalidsaltinvalidsaltsaltsaltsaltsa');

  if (!album || !ok) {
    res.status(401);
    throw new Error('Incorrect PIN');
  }

  const unlockToken = signAlbumUnlockToken(req.user._id, album._id);
  res.json({ unlockToken });
});

// ── Reset PIN ───────────────────────────────────────────────────────────
// Available only inside the vault (vault token already verified by the
// route guard) — that's the "I forgot my PIN, but I still know my account
// password" recovery path the user opted in to.
export const resetAlbumPin = asyncHandler(async (req, res) => {
  const { pin } = req.body || {};
  if (!isValidPin(pin)) {
    res.status(400);
    throw new Error('PIN must be 4–6 digits');
  }

  const album = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    isPrivate: true,
  });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  album.pinHash = await hashPin(pin);
  await album.save();

  // Mint a fresh unlock token so the user can immediately enter the album
  // without re-typing the PIN they just set.
  const unlockToken = signAlbumUnlockToken(req.user._id, album._id);
  res.json({ unlockToken });
});
