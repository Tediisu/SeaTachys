import { apiFetch } from './api';

type UploadKind = 'product' | 'category' | 'promo';

type UploadAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

type CloudinarySignatureResponse = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
};

function inferMimeType(uri: string) {
  const lower = uri.toLowerCase();

  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';

  return 'image/jpeg';
}

function getFileName(asset: UploadAsset, kind: UploadKind) {
  if (asset.fileName) {
    return asset.fileName;
  }

  const lastSegment = asset.uri.split('/').pop()?.split('?')[0];
  if (lastSegment && lastSegment.includes('.')) return lastSegment;

  const extension = (asset.mimeType || inferMimeType(asset.uri)).split('/')[1] ?? 'jpg';
  return `${kind}-${Date.now()}.${extension}`;
}

export const imageUploadService = {
  uploadToCloudinary: async (input: string | UploadAsset, kind: UploadKind) => {
    const asset = typeof input === 'string' ? { uri: input } : input;
    if (!asset?.uri) return null;
    if (asset.uri.startsWith('http://') || asset.uri.startsWith('https://')) return asset.uri;

    const signature = (await apiFetch(
      '/api/admin/uploads/cloudinary-signature',
      'POST',
      { kind }
    )) as CloudinarySignatureResponse;

    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      type: asset.mimeType || inferMimeType(asset.uri),
      name: getFileName(asset, kind),
    } as any);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: { message: text || 'Cloudinary upload failed.' } };
    }

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Unable to upload image.');
    }

    return data?.secure_url as string;
  },
};
