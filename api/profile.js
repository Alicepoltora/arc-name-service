const { del, list, put } = require('@vercel/blob');
const {
  getAvatarPrefix,
  getProfilePath,
  normalizeAddress,
  normalizeName,
  verifyIdentityProof
} = require('./_identity');

async function findBlobByPathname(pathname) {
  const result = await list({ prefix: pathname, limit: 10 });
  return (result.blobs || []).find((blob) => blob.pathname === pathname) || null;
}

async function readProfile(address, name) {
  const blob = await findBlobByPathname(getProfilePath(address, name));
  if (!blob) return null;

  const response = await fetch(blob.url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not fetch saved profile');
  }

  return await response.json();
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const address = normalizeAddress(req.query.address);
      const name = normalizeName(req.query.name);

      if (!address || !name) {
        res.status(400).json({ error: 'address and name are required' });
        return;
      }

      const profile = await readProfile(address, name);
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
      res.status(200).json(profile || {
        address,
        name,
        avatar: '',
        avatarPathname: '',
        twitter: '',
        updatedAt: null
      });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = req.body || {};
    body.action = 'update-profile';

    const verified = await verifyIdentityProof(body);
    const existingProfile = await readProfile(verified.address, verified.name).catch(() => null);
    const nextProfile = {
      address: verified.address,
      name: verified.name,
      avatar: verified.avatarUrl || '',
      avatarPathname: verified.avatarPathname || '',
      twitter: verified.twitter || '',
      updatedAt: new Date().toISOString()
    };

    await put(getProfilePath(verified.address, verified.name), JSON.stringify(nextProfile, null, 2), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
      cacheControlMaxAge: 60
    });

    const oldAvatarPath = existingProfile?.avatarPathname || '';
    const newAvatarPath = nextProfile.avatarPathname || '';
    const avatarPrefix = getAvatarPrefix(verified.address, verified.name);
    if (oldAvatarPath && oldAvatarPath !== newAvatarPath && oldAvatarPath.startsWith(avatarPrefix)) {
      await del(oldAvatarPath).catch(() => {});
    }

    res.status(200).json(nextProfile);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Could not save profile' });
  }
};
