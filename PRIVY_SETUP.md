# Privy Wallet Integration Setup

This guide helps you set up Privy wallet integration for the Marina Pickleball Community Fund.

## Quick Start

1. **Get a Privy App ID**:
   - Go to [Privy Dashboard](https://dashboard.privy.io/)
   - Create a new app or use existing one
   - Copy your App ID

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Add your Privy App ID to `.env.local`:
   ```bash
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here
   ```

3. **Install Dependencies** (already done):
   ```bash
   npm install @privy-io/react-auth @privy-io/wagmi --legacy-peer-deps
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Features

The integration provides:

- **Easy Wallet Connection**: Users can connect via email, SMS, or existing wallets
- **Embedded Wallets**: Users without wallets get one automatically created
- **Multiple Wallet Support**: MetaMask, Coinbase Wallet, WalletConnect
- **Seamless Onboarding**: Email/SMS authentication for web2 users
- **Smart Contract Integration**: Direct contribution to the funding contract
- **USDC Onramp**: Pay with Venmo to receive USDC (via ZKP2P v2)

## Components Added

1. **`PrivyProvider`** (`src/providers/PrivyProvider.tsx`):
   - Wraps the app with Privy authentication
   - Configures supported chains and login methods
   - Integrates with Wagmi for contract interactions

2. **`WalletButton`** (`src/components/WalletButton.tsx`):
   - Shows connection status
   - Handles login/logout
   - Displays user address with copy functionality

3. **`ContributionSection`** (`src/components/ContributionSection.tsx`):
   - Interactive contribution interface
   - Preset and custom amounts
   - Direct smart contract integration
   - Transaction status tracking
   - Payment method selection (ETH or Venmo → USDC)

4. **`USDCOnramp`** (`src/components/USDCOnramp.tsx`):
   - Venmo to USDC onramp flow
   - Integration with ZKP2P v2
   - Real-time order status tracking
   - Mobile-friendly Venmo app integration

## Configuration Options

In `PrivyProvider.tsx`, you can customize:

- **Login Methods**: `['email', 'wallet', 'sms']`
- **Theme**: `'light'` or `'dark'`
- **Embedded Wallets**: Auto-create for users without wallets
- **External Wallets**: Configure which wallets to support

## Smart Contract Integration

To enable contributions, set your contract address:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=1  # or your target chain ID
```

The contract must have a payable `contribute()` function.

## Next Steps

1. Get your Privy App ID and add it to `.env.local`
2. Deploy your smart contract and add the address to env vars
3. Test the wallet connection and contribution flow
4. Customize the UI/UX to match your brand

For production, remember to:
- Use environment-specific Privy apps
- Set up proper chain configurations
- Configure rate limiting and security features in Privy dashboard
