# Wallet Balance and CoW Swap Integration

This document describes the wallet balance display and USDC-to-ETH conversion features integrated into the Marina Pickleball Community Fund app.

## Features Implemented

### 1. Wallet Balance Display (`WalletBalance.tsx`)

**Features:**
- Real-time display of ETH and USDC balances
- Automatic balance fetching and refresh functionality
- Clean UI with balance cards showing token icons and amounts
- Support for Base chain assets

**Integration:**
- Uses the `useTokenBalances` hook to fetch balances
- Shows ETH balance in standard format (4 decimal places)
- Shows USDC balance in USD format with 6 decimal precision
- Includes refresh button with loading state

### 2. Token Balance Hook (`useTokenBalances.ts`)

**Functionality:**
- Fetches ETH balance using wagmi's `getBalance`
- Fetches USDC balance using contract reading (Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- Handles different chains gracefully (falls back when not on Base)
- Returns formatted balances, loading state, and error handling
- Auto-refreshes when wallet connection changes

### 3. CoW Swap Integration (`CowswapIntegration.tsx`)

**Features:**
- USDC to ETH conversion using CoW Protocol
- Opens CoW Swap in a new window with pre-filled parameters
- Supports Base chain swaps
- User-friendly interface with swap preview
- Educational content explaining the process

**Parameters:**
- Chain: Base (`base`)
- Sell Token: USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- Buy Token: ETH (native token)
- Amount: User-specified USDC amount
- Recipient: User's wallet address

## User Experience Flow

### Complete Integration Flow:
1. **User connects wallet** → Wallet balances automatically load
2. **User uses ZKP2P** → Gets USDC from Venmo/Cash App via redirect flow
3. **User sees USDC balance** → Wallet Balance component shows their USDC
4. **User converts USDC to ETH** → CoW Swap integration opens in new window
5. **User completes swap** → Returns to app with ETH balance updated
6. **User contributes ETH** → Uses ETH to contribute to the campaign

### Wallet Balance Interface:
```
┌─────────────────────────────────┐
│ 💼 Wallet Balance            🔄 │
├─────────────────────────────────┤
│ ETH  [icon]              0.1234 │
│ USDC [icon]            $25.00   │
├─────────────────────────────────┤
│ [Convert USDC to ETH]           │
└─────────────────────────────────┘
```

### USDC Conversion Interface:
```
┌─────────────────────────────────┐
│ Convert USDC to ETH via CoW     │
├─────────────────────────────────┤
│ Amount: [25.00] [MAX]           │
│ Available: $25.00 USDC          │
├─────────────────────────────────┤
│ [Cancel] [Convert to ETH]       │
└─────────────────────────────────┘
```

## Technical Details

### Chain Configuration
- Added Base and Base Sepolia to wagmi configuration
- USDC contract address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- CoW Swap URL: `https://swap.cow.fi/`

### Error Handling
- Graceful fallback when USDC contract is not available
- Network detection for Base chain features
- Loading states and error messages for better UX

### Integration Points
- Automatically refreshes balances after successful swaps
- Integrates with existing wallet connection flow
- Works alongside ZKP2P onramp integration

## Benefits

### For Users:
- **Visibility**: See exactly what tokens they have
- **Flexibility**: Convert USDC to ETH when needed
- **Convenience**: Integrated swap experience
- **Choice**: Multiple ways to contribute (direct ETH or USDC→ETH)

### For Project:
- **Complete Flow**: ZKP2P → USDC → ETH → Contribution
- **MEV Protection**: CoW Swap provides optimal pricing
- **Base Ecosystem**: Leverages Base chain's low fees
- **User Retention**: Keep users in your app ecosystem

## Future Enhancements

1. **Price Preview**: Show estimated ETH amount before swap
2. **Slippage Settings**: Allow users to set slippage tolerance
3. **Transaction History**: Show past swaps and contributions
4. **Multi-Token Support**: Support other tokens (WETH, etc.)
5. **Swap Status**: Track swap completion automatically
6. **Gas Estimation**: Show estimated gas costs

## Usage

The wallet balance component is automatically shown when users connect their wallet. If they have USDC, they'll see the conversion option. The integration handles the entire flow seamlessly.

```tsx
// Usage in main component
<WalletBalance />
```

The component handles all state management internally and provides a complete USDC-to-ETH conversion experience using CoW Protocol's proven swap infrastructure.
