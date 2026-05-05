type OptimizeImageOptions = {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill';
};

const CLOUDINARY_UPLOAD_SEGMENT = '/upload/';

export function optimizeImageUrl(
  url?: string | null,
  options: OptimizeImageOptions = {}
): string | undefined {
  if (!url) {
    return undefined;
  }

  if (!url.includes(CLOUDINARY_UPLOAD_SEGMENT)) {
    return url;
  }

  const transformations = [
    'f_auto',
    'q_auto',
    options.width ? `w_${Math.round(options.width)}` : null,
    options.height ? `h_${Math.round(options.height)}` : null,
    options.fit ? `c_${mapFit(options.fit)}` : null,
    'dpr_auto',
  ].filter(Boolean);

  if (transformations.length === 0) {
    return url;
  }

  return url.replace(CLOUDINARY_UPLOAD_SEGMENT, `/upload/${transformations.join(',')}/`);
}

function mapFit(fit: NonNullable<OptimizeImageOptions['fit']>) {
  switch (fit) {
    case 'contain':
      return 'fit';
    case 'fill':
      return 'fill';
    default:
      return 'fill';
  }
}
