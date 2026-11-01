import { authFetch } from './apiClient'

/**
 * Upload a base64 DataURL image to the server (Cloudinary) and return the hosted URL.
 */
export async function uploadAvatar(base64DataUrl: string): Promise<string> {
  const res = await authFetch('/api/uploads/avatar', {
    method: 'POST',
    data: { image: base64DataUrl }
  })
  return res.url
}

