/** True when the authenticated user is the couple admin. */
export const isAdmin = (req) => req.user?.role === 'admin';

/** Mongo filter: hide soft-deleted docs from regular users. */
export const notDeletedFilter = (req) => (
  isAdmin(req) ? {} : { deletedAt: null }
);

/** Keep only non-deleted photos for regular users. */
export const visiblePhotos = (photos = [], req) => {
  if (isAdmin(req)) return photos;
  return photos.filter((p) => !p.deletedAt);
};
