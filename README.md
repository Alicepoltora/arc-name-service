# ARC Name Service

ENS-like name registration dApp on [ARC Testnet](https://docs.arc.network).  
Register human-readable names (e.g. `alice.arc`) and link them to your ARC blockchain address — on-chain, forever.

## Live Contract

| | |
|---|---|
| **Network** | ARC Testnet (Chain ID: 5042002) |
| **Contract** | [`0xEDcd3636584074cBCa4B685Cc5FE5080E70CC080`](https://testnet.arcscan.app/address/0xEDcd3636584074cBCa4B685Cc5FE5080E70CC080) |
| **Explorer** | [testnet.arcscan.app](https://testnet.arcscan.app) |
| **RPC** | `https://rpc.testnet.arc.network` |

## Usage

1. Open `arc-ens.html` in your browser
2. Click **Connect Wallet** — MetaMask will auto-add ARC Testnet
3. Get testnet USDC for gas at [faucet.circle.com](https://faucet.circle.com)
4. Enter a name → Check → Register → sign the transaction

## Contract Functions

```solidity
register(string name)           // Register a name to msg.sender
resolve(string name) → address  // Resolve name to address
isAvailable(string name) → bool // Check if name is free
getNames(address) → string[]    // List all names of an address
reverseResolve(address) → string // Get primary name of address
```

## Name Rules

- 3–32 characters
- Lowercase letters `a-z`, digits `0-9`, hyphens `-`
- First-come, first-served — no expiry

## Project Structure

```
arc-name-service/
├── NameRegistry.sol   — Solidity smart contract
├── arc-ens.html       — Frontend (single file, ethers.js)
├── deployment.txt     — Contract address & TX hashes
└── README.md
```

## Tech Stack

- **Blockchain:** ARC (EVM-compatible, Prague fork)
- **Smart Contract:** Solidity ^0.8.20, deployed with Foundry
- **Frontend:** Vanilla HTML + ethers.js v6 (no build step)
- **Wallet:** MetaMask (any EIP-1193 wallet)

## Deploy Your Own

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Deploy
forge create NameRegistry.sol:NameRegistry \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key YOUR_PRIVATE_KEY \
  --broadcast
```

---

Built on [ARC Network](https://arc.network) · Testnet
