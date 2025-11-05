# EncryptedNotes Frontend

Privacy-preserving note storage frontend using Fully Homomorphic Encryption (FHE) via Zama's FHEVM.

## Features

- **FHE-Encrypted Storage**: Note content is encrypted using FHE and stored on-chain
- **Privacy-Preserving**: Only the note owner can decrypt their content
- **Complete Workflow**: Store notes → View list → Decrypt content
- **Local & Sepolia Support**: Works on both local Hardhat network and Sepolia testnet
- **Modern UI**: Beautiful cyber-themed interface with hologram effects

## Tech Stack

- **React** + **TypeScript** + **Vite**
- **Wagmi** + **RainbowKit** for wallet connection
- **FHE SDK** from Zama for encryption/decryption
- **Ethers.js** for contract interaction
- **Tailwind CSS** for styling

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate contract ABI:**
   ```bash
   npm run genabi
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

Create a `.env` file in the `ui` directory:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Network Support

The frontend automatically detects and supports:
- **Hardhat Local Network** (Chain ID: 31337) - Uses FHEVM mock mode
- **Sepolia Testnet** (Chain ID: 11155111) - Uses real FHE SDK

## Usage

1. **Connect Wallet**: Click "Connect Wallet" in the header
2. **Store Note**: 
   - Enter a title and content (as a number)
   - Click "Save Encrypted Note"
   - Confirm the transaction in MetaMask
3. **View Notes**: 
   - Switch to "My Notes" tab
   - See all your encrypted notes
   - Click "Decrypt Note" to decrypt and view content

## Project Structure

```
ui/
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # UI primitives (Button, Card, etc.)
│   │   ├── NotesApp.tsx
│   │   ├── NoteSubmit.tsx
│   │   └── NoteList.tsx
│   ├── config/         # Configuration files
│   │   ├── contracts.ts
│   │   └── wagmi.ts
│   ├── fhevm/          # FHE SDK integration
│   │   ├── useFhevm.tsx
│   │   └── internal/   # FHE SDK internal logic
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
└── scripts/
    └── genabi.mjs      # ABI generation script
```

## Development

- **Dev server**: `npm run dev` (runs on http://localhost:5173)
- **Build**: `npm run build`
- **Lint**: `npm run lint`

## Notes

- Content is stored as numbers (0-4294967295) for FHE compatibility
- In production, you would use a more sophisticated encoding scheme
- FHE encryption requires Sepolia testnet for full functionality
- Local Hardhat network uses mock FHEVM for testing
