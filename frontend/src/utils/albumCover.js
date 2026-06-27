/** Cloudinary frame grab for video thumbnails in grids. */
export function videoPosterUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return url || '';
  return url
    .replace(/\.[^/.]+$/, '.jpg')
    .replace('/video/upload/', '/video/upload/w_400,h_500,c_fill,so_0/');
}

const isStockCover = (url) =>
  !url || url.includes('picsum.photos');

/** Best thumbnail for an album card — prefers real album media over stock covers. */
export function getAlbumThumbnail(album) {
  if (!album) return null;

  const photos = (album.photos || []).filter((p) => !p.deletedAt && p.img);
  const pick = photos.find((p) => p.mediaType !== 'video') || photos[0];

  if (pick) {
    return pick.mediaType === 'video' ? videoPosterUrl(pick.img) : pick.img;
  }

  if (!isStockCover(album.cover)) {
    return album.cover.includes('/video/upload/')
      ? videoPosterUrl(album.cover)
      : album.cover;
  }

  return null;
}
