const path = require('path');
const { handleUpload } = require('@vercel/blob/client');
const { getAvatarPrefix, normalizeAddress, normalizeName, verifyIdentityProof } = require('./_identity');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = typeof clientPayload === 'string' ? JSON.parse(clientPayload) : (clientPayload || {});
        payload.action = 'upload-avatar';

        const verified = await verifyIdentityProof(payload);
        const prefix = getAvatarPrefix(verified.address, verified.name);
        const normalizedPath = String(pathname || '');

        if (!normalizedPath.startsWith(prefix)) {
          throw new Error('Upload path is not allowed for this profile');
        }

        const ext = path.extname(normalizedPath).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
          throw new Error('Unsupported image type');
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          maximumSizeInBytes: 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            address: normalizeAddress(verified.address),
            name: normalizeName(verified.name)
          })
        };
      },
      onUploadCompleted: async () => {}
    });

    res.status(200).json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Could not upload avatar' });
  }
};
