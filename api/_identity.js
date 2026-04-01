const { verifyMessage } = require('ethers');

const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000;

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/\.arc$/i, '');
}

function normalizeTwitter(value) {
  const normalized = String(value || '').trim().replace(/^@+/, '');
  if (!normalized) return '';
  if (!/^[A-Za-z0-9_]{1,15}$/.test(normalized)) {
    throw new Error('Twitter handle must be 1-15 characters and use only letters, numbers, or underscores.');
  }
  return normalized;
}

function buildIdentityProofMessage({ action, address, name, timestamp, avatarUrl = '', avatarPathname = '', twitter = '' }) {
  return [
    'ANS Identity Proof',
    `Action: ${String(action || '').trim()}`,
    `Wallet: ${normalizeAddress(address)}`,
    `Name: ${normalizeName(name)}.arc`,
    `Timestamp: ${String(timestamp || '').trim()}`,
    `Avatar URL: ${String(avatarUrl || '').trim() || '-'}`,
    `Avatar Path: ${String(avatarPathname || '').trim() || '-'}`,
    `Twitter: ${String(twitter || '').trim() || '-'}`
  ].join('\n');
}

function validateTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value)) throw new Error('Invalid timestamp');
  if (Math.abs(Date.now() - value) > SIGNATURE_MAX_AGE_MS) {
    throw new Error('Signature expired. Please try again.');
  }
  return value;
}

async function verifyIdentityProof(payload) {
  const address = normalizeAddress(payload.address);
  const name = normalizeName(payload.name);
  const twitter = normalizeTwitter(payload.twitter || '');
  const avatarUrl = String(payload.avatarUrl || '').trim();
  const avatarPathname = String(payload.avatarPathname || '').trim();

  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    throw new Error('Invalid wallet address');
  }
  if (!name || !/^[a-z0-9-]{3,32}$/.test(name)) {
    throw new Error('Invalid ARC name');
  }

  validateTimestamp(payload.timestamp);

  const message = buildIdentityProofMessage({
    action: payload.action,
    address,
    name,
    timestamp: payload.timestamp,
    avatarUrl,
    avatarPathname,
    twitter
  });

  const recovered = verifyMessage(message, String(payload.signature || ''));
  if (normalizeAddress(recovered) !== address) {
    throw new Error('Invalid wallet signature');
  }

  return {
    address,
    name,
    twitter,
    avatarUrl,
    avatarPathname,
    timestamp: Number(payload.timestamp)
  };
}

function getProfilePath(address, name) {
  return `profiles/${normalizeAddress(address)}/${normalizeName(name)}.json`;
}

function getAvatarPrefix(address, name) {
  return `avatars/${normalizeAddress(address)}/${normalizeName(name)}/`;
}

module.exports = {
  buildIdentityProofMessage,
  getAvatarPrefix,
  getProfilePath,
  normalizeAddress,
  normalizeName,
  normalizeTwitter,
  verifyIdentityProof
};
