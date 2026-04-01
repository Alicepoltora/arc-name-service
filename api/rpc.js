const RPC_URLS = [
  "https://rpc.testnet.arc.network",
  "https://rpc.blockdaemon.testnet.arc.network",
  "https://rpc.drpc.testnet.arc.network",
  "https://rpc.quicknode.testnet.arc.network"
];

function isRateLimited(status, message = "") {
  const text = String(message).toLowerCase();
  return status === 429 || text.includes("rate limit") || text.includes("too many requests");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { method, params } = req.body || {};
  if (!method || !Array.isArray(params)) {
    res.status(400).json({ error: "Invalid JSON-RPC payload" });
    return;
  }

  const attempts = RPC_URLS.length * 2;
  const errors = [];

  for (let attempt = 0; attempt < attempts; attempt++) {
    const rpcUrl = RPC_URLS[attempt % RPC_URLS.length];

    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method,
          params,
          id: Date.now() + attempt
        })
      });

      const text = await response.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (_) {}

      if (!response.ok) {
        const message = payload?.error?.message || text || `RPC ${method} failed with HTTP ${response.status}`;
        errors.push({ status: response.status, message });
        if (attempt < attempts - 1 && isRateLimited(response.status, message)) {
          await delay(200 * (attempt + 1));
          continue;
        }
        throw new Error(message);
      }

      if (payload?.error) {
        const message = payload.error.message || `RPC ${method} failed`;
        errors.push({ status: 200, message });
        throw new Error(message);
      }

      res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=30");
      res.status(200).json({ result: payload?.result ?? null });
      return;
    } catch (error) {
      if (attempt < attempts - 1 && isRateLimited(error.status, error.message)) {
        await delay(200 * (attempt + 1));
        continue;
      }
    }
  }

  const allRateLimited = errors.length > 0 && errors.every(err => isRateLimited(err.status, err.message));
  res.status(allRateLimited ? 429 : 502).json({
    error: allRateLimited
      ? "Request is being rate limited. Please retry in a few seconds."
      : (errors[errors.length - 1]?.message || "RPC proxy failed")
  });
};
