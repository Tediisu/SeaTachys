import { apiFetch } from './api';

type UploadKind = 'product' | 'category';

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

function getFileName(uri: string, kind: UploadKind) {
  const lastSegment = uri.split('/').pop()?.split('?')[0];
  if (lastSegment && lastSegment.includes('.')) return lastSegment;

  const extension = inferMimeType(uri).split('/')[1] ?? 'jpg';
  return `${kind}-${Date.now()}.${extension}`;
}

export const imageUploadService = {
  uploadToCloudinary: async (uri: string, kind: UploadKind) => {
    if (!uri) return null;
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

    const signature = (await apiFetch(
      '/api/admin/uploads/cloudinary-signature',
      'POST',
      { kind }
    )) as CloudinarySignatureResponse;

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: inferMimeType(uri),
      name: getFileName(uri, kind),
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
