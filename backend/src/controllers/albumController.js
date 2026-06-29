import bcrypt from 'bcryptjs';
import Album from '../models/Album.js';
import asyncHandler from '../utils/asyncHandler.js';
import cloudinary from '../config/cloudinary.js';
import {
  signAlbumUnlockToken,
  verifyAlbumUnlockToken,
} from '../utils/albumTokens.js';
import { isAdmin, notDeletedFilter, visiblePhotos } from '../utils/accessControl.js';

const isStockCover = (url) => !url || url.includes('picsum.photos');

/** Keep album.cover aligned with the first visible image in the album. */
const syncAlbumCover = (album) => {
  const visible = (album.photos || []).filter((p) => !p.deletedAt && p.img);
  const pick = visible.find((p) => p.mediaType !== 'video') || visible[0];
  if (pick) {
    album.cover = pick.img;
    album.coverPublicId = pick.publicId || '';
    return;
  }
  if (isStockCover(album.cover)) {
    album.cover = '';
    album.coverPublicId = '';
  }
};

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
const sanitize = (album, req) => {
  if (!album) return album;
  const obj = album.toObject ? album.toObject({ virtuals: true }) : { ...album };
  delete obj.pinHash;
  delete obj.pinPlain;
  if (req) {
    obj.photos = visiblePhotos(obj.photos || [], req);
    obj.count = obj.photos.length;
  }
  return obj;
};

// Strips the `photos` array AND description so a private-album listing
// only reveals title/cover/count/dates while still locked. The cover image
// is intentionally kept so the user can recognise the album in the vault.
const stripPrivateContent = (album, req) => {
  const safe = sanitize(album, req);
  if (isStockCover(safe.cover)) {
    const visible = visiblePhotos(album.photos || [], req);
    const pick = visible.find((p) => p.mediaType !== 'video' && p.img) || visible.find((p) => p.img);
    if (pick) safe.cover = pick.img;
  }
  return {
    ...safe,
    description: '',
    photos: [],
    count: visiblePhotos(album.photos || [], req).length,
  };
};

// Reads the X-Album-Unlock-Token header and verifies it matches the
// requested album. Sends a 401 + `code` on any mismatch and returns false
// so the caller can `return` early; the response is already finished.
const ensureAlbumUnlock = (req, res, album) => {
  if (isAdmin(req)) return true;
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
  const query = {
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  };
  if (!isAdmin(req)) {
    query.isPrivate = { $ne: true };
  }

  const albums = await Album.find(query)
    .sort({ date: -1 })
    .populate('createdBy', 'name avatar');

  if (isAdmin(req)) {
    const withPins = await Album.find(query).select('+pinPlain').sort({ date: -1 });
    const pinMap = new Map(withPins.map((a) => [String(a._id), a.pinPlain]));
    return res.json(albums.map((a) => ({
      ...sanitize(a, req),
      pinPlain: pinMap.get(String(a._id)) || '',
      isPrivate: !!a.isPrivate,
      deletedAt: a.deletedAt,
    })));
  }

  res.json(albums.map((a) => sanitize(a, req)));
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
    ...notDeletedFilter(req),
  })
    .sort({ date: -1 })
    .populate('createdBy', 'name avatar');

  if (isAdmin(req)) {
    const withPins = await Album.find({
      coupleId: req.coupleId,
      isPrivate: true,
      ...notDeletedFilter(req),
    }).select('+pinPlain');
    const pinMap = new Map(withPins.map((a) => [String(a._id), a.pinPlain]));
    return res.json(albums.map((a) => ({
      ...sanitize(a, req),
      pinPlain: pinMap.get(String(a._id)) || '',
    })));
  }

  res.json(albums.map((a) => stripPrivateContent(a, req)));
});

export const getAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  }).populate('createdBy', 'name avatar');
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  if (isAdmin(req)) {
    const withPin = await Album.findById(album._id).select('+pinPlain');
    const payload = sanitize(album, req);
    payload.pinPlain = withPin?.pinPlain || '';
    return res.json(payload);
  }

  res.json(sanitize(album, req));
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
    doc.pinPlain = pin;
  }

  const album = await Album.create(doc);
  res.status(201).json(sanitize(album, req));
});

// ── Update metadata ─────────────────────────────────────────────────────
// We never let a client flip privacy here because that has security
// implications either direction (revealing a previously sealed album, or
// orphaning content into the vault). Use dedicated endpoints for that
// kind of state change if/when needed.
export const updateAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  const { isPrivate, pin, pinHash, ...allowed } = req.body;
  Object.assign(album, allowed);
  await album.save();
  res.json(sanitize(album, req));
});

// ── Delete ──────────────────────────────────────────────────────────────
// Private albums require the unlock token to delete, so a casual visitor
// with a stolen vault token can't wipe sealed content without also
// knowing the PIN.
export const deleteAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  if (isAdmin(req) && req.query.permanent === 'true') {
    await destroyAsset(album.coverPublicId);
    await Promise.all((album.photos || []).map((p) => destroyAsset(p.publicId)));
    await album.deleteOne();
    return res.json({ message: 'Album permanently deleted' });
  }

  album.deletedAt = new Date();
  album.deletedBy = req.user._id;
  await album.save();
  res.json({ message: 'Album deleted', softDeleted: true });
});

export const addPhoto = asyncHandler(async (req, res) => {
  const album = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  album.photos.push(req.body);
  syncAlbumCover(album);
  await album.save();
  res.status(201).json(sanitize(album, req));
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const album = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  const photo = album.photos.id(req.params.photoId);
  if (!photo) { res.status(404); throw new Error('Photo not found'); }
  if (!isAdmin(req) && photo.deletedAt) {
    res.status(404);
    throw new Error('Photo not found');
  }

  if (isAdmin(req) && req.query.permanent === 'true') {
    album.photos.pull(req.params.photoId);
    await album.save();
    await destroyAsset(photo.publicId);
    return res.json(sanitize(album, req));
  }

  photo.deletedAt = new Date();
  photo.deletedBy = req.user._id;
  syncAlbumCover(album);
  await album.save();
  res.json(sanitize(album, req));
});

export const deletePhotos = asyncHandler(async (req, res) => {
  const { photoIds } = req.body;
  if (!Array.isArray(photoIds)) {
    res.status(400); throw new Error('photoIds must be an array');
  }

  const album = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  if (album.isPrivate && !ensureAlbumUnlock(req, res, album)) return;

  const now = new Date();
  album.photos.forEach((p) => {
    if (photoIds.includes(p._id.toString()) && !p.deletedAt) {
      if (isAdmin(req) && req.query.permanent === 'true') {
        destroyAsset(p.publicId);
      } else {
        p.deletedAt = now;
        p.deletedBy = req.user._id;
      }
    }
  });

  if (isAdmin(req) && req.query.permanent === 'true') {
    album.photos = album.photos.filter((p) => !photoIds.includes(p._id.toString()));
  }

  syncAlbumCover(album);
  await album.save();
  res.json(sanitize(album, req));
});

export const movePhotos = asyncHandler(async (req, res) => {
  const { targetAlbumId, photoIds } = req.body;
  if (!targetAlbumId || !Array.isArray(photoIds)) {
    res.status(400); throw new Error('Missing targetAlbumId or photoIds');
  }

  const sourceAlbum = await Album.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  const targetAlbum = await Album.findOne({
    _id: targetAlbumId,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });

  if (!sourceAlbum || !targetAlbum) {
    res.status(404); throw new Error('Source or target album not found');
  }

  if (sourceAlbum.isPrivate && !ensureAlbumUnlock(req, res, sourceAlbum)) return;

  if (targetAlbum.isPrivate && !isAdmin(req)) {
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

  const movingPhotos = sourceAlbum.photos.filter(
    (p) => photoIds.includes(p._id.toString()) && !p.deletedAt,
  );
  sourceAlbum.photos = sourceAlbum.photos.filter(p => !photoIds.includes(p._id.toString()));
  
  const newPhotos = movingPhotos.map(p => ({
    img: p.img,
    publicId: p.publicId,
    mediaType: p.mediaType
  }));
  
  targetAlbum.photos.push(...newPhotos);

  syncAlbumCover(sourceAlbum);
  syncAlbumCover(targetAlbum);

  await sourceAlbum.save();
  await targetAlbum.save();

  res.json(sanitize(sourceAlbum, req));
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
  album.pinPlain = pin;
  await album.save();

  // Mint a fresh unlock token so the user can immediately enter the album
  // without re-typing the PIN they just set.
  const unlockToken = signAlbumUnlockToken(req.user._id, album._id);
  res.json({ unlockToken });
});
