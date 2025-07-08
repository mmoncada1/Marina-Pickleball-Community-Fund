# ZKP2P V2 USDC Onramp Integration

This integration allows users to contribute to the Marina Pickleball Community Fund using various payment methods (Venmo, Cash App, Revolut, etc.) through ZKP2P v2's redirect onramp flow.

## How It Works

1. **User Experience**:
   - User selects "Get USDC" payment method
   - Chooses USD amount to contribute ($10, $25, $50, $100, or custom)
   - Clicks "Get $X USDC" button
   - Redirected to ZKP2P in a new tab with pre-filled parameters
   - Completes payment using their preferred method (Venmo, Cash App, etc.)
   - Receives USDC directly in their Privy wallet
   - Returns to the campaign to contribute

2. **Technical Flow**:
   - Frontend generates ZKP2P redirect URL with specific parameters
   - User is redirected to `https://zkp2p.xyz/swap` with query parameters
   - ZKP2P handles the entire onramp process
   - User completes payment on ZKP2P platform
   - USDC is sent directly to user's wallet address
   - User returns to campaign site via callback URL

## Components

### `USDCOnramp.tsx`
Simple component that generates ZKP2P redirect URLs:
- Amount selection (preset buttons + custom input)
- Generates redirect URL with proper parameters
- Opens ZKP2P in new tab
- Explains the process to users

## Redirect URL Parameters

The integration uses these ZKP2P URL parameters:

- `referrer`: "Marina+Pickleball+Community+Fund"
- `referrerLogo`: Your logo URL
- `callbackUrl`: Your site URL (where users return after completion)
- `amountUsdc`: Exact USDC amount in 6-decimal format
- `recipientAddress`: User's wallet address
- `paymentPlatform`: "Venmo" (default, but users can change)

## Example Redirect URL

```
https://zkp2p.xyz/swap?
referrer=Marina+Pickleball+Community+Fund
&referrerLogo=https://your-site.com/logo.png
&callbackUrl=https://your-site.com
&amountUsdc=25000000
&recipientAddress=0x84e113087C97Cd80eA9D78983D4B8Ff61ECa1929
&paymentPlatform=Venmo
```

## Configuration

No API keys required! The redirect flow is completely client-side.

Optional: Update the logo URL in `USDCOnramp.tsx`:
```typescript
referrerLogo: 'https://your-logo-url.com/logo.png'
```

## Supported Payment Methods

ZKP2P supports multiple payment platforms:
- **Venmo** (US)
- **Cash App** (US)
- **Revolut** (EU/UK)
- **Wise** (Global)
- **Bank Transfer** (Various regions)

Users can choose their preferred method on the ZKP2P interface.

## Benefits

- **No Backend Required**: Pure redirect flow, no API integration needed
- **No API Keys**: No authentication or rate limiting concerns
- **Fully Managed**: ZKP2P handles all payment processing and compliance
- **Multiple Payment Methods**: Users can choose from various platforms
- **Exact Amounts**: Users receive exactly the USDC amount they request
- **Mobile Optimized**: Works seamlessly on mobile devices
- **Secure**: All payment processing handled by ZKP2P's audited infrastructure

## Integration with Contribution Flow

1. User selects "Get USDC" in `ContributionSection`
2. `USDCOnramp` component handles the redirect process
3. User completes onramp on ZKP2P platform
4. User returns with USDC in their wallet
5. User can now contribute using their newly received USDC

## User Journey

1. **Select Amount**: Choose or enter USD amount
2. **Click Button**: "Get $X USDC" opens ZKP2P in new tab
3. **Choose Platform**: Select Venmo, Cash App, etc. on ZKP2P
4. **Complete Payment**: Follow ZKP2P's guided payment process
5. **Receive USDC**: Funds arrive in wallet automatically
6. **Return to Site**: Use USDC to contribute to campaign

## Advantages Over Custom API Integration

- **Simpler Implementation**: No backend APIs to maintain
- **Better UX**: ZKP2P's optimized payment flow
- **More Payment Methods**: Access to ZKP2P's full platform support
- **Lower Maintenance**: No need to handle payment processing updates
- **Better Compliance**: ZKP2P handles all regulatory requirements
- **Faster Setup**: No API keys or complex configuration needed

This redirect-based integration provides the smoothest possible onramp experience while requiring minimal technical implementation!
