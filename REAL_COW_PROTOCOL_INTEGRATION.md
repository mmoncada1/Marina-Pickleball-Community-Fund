# Real CoW Protocol Integration

This document explains the implementation of real CoW Protocol integration for gasless USDC-to-ETH swaps, replacing the previous simulation-only system.

## What Changed

### Previous Implementation
- Generated fake transaction hashes prefixed with `0xSIMULATED` or `0xREADY`
- No actual communication with CoW Protocol API
- No real swap execution

### New Implementation
- **Real CoW Protocol API integration** via `/src/services/cowProtocol.ts`
- **Actual order submission** to CoW Protocol when relayer is funded
- **Real transaction hash monitoring** from executed orders
- **Order status tracking** and automatic updates

## How It Works

### 1. Quote Generation
When a user initiates a swap, the system:
1. Calls CoW Protocol API to get a real quote for USDC → ETH
2. Calculates fees and slippage
3. Shows user the exact amounts they'll receive

### 2. Order Submission
If the relayer wallet has sufficient ETH:
1. Uses the permit signature for gasless approval
2. Submits the order to CoW Protocol
3. Returns a real order UID (not a fake transaction hash)

### 3. Order Monitoring
After order submission:
1. The frontend automatically monitors the order status
2. Polls CoW Protocol API every 10 seconds
3. When executed by a solver, displays the **real transaction hash**
4. Provides a working BaseScan link to the actual transaction

## Transaction Hash Types

| Hash Prefix | Meaning | Action |
|-------------|---------|---------|
| `0xCOW...` | CoW Protocol order submitted | Monitor for execution |
| `0x[0-9a-f]{64}` | Real transaction hash | View on BaseScan |
| `0xSIMULATED...` | Relayer unfunded | Fund relayer wallet |
| `0xNOPERMIT...` | Missing permit signature | Sign permit |
| `0xCOWFAILED...` | CoW API error | Check API status |

## Files Modified

### New Files
- `/src/services/cowProtocol.ts` - CoW Protocol API integration
- `/src/pages/api/cow-order-status.ts` - Order status endpoint

### Updated Files
- `/src/pages/api/gasless-swap.ts` - Real CoW Protocol order submission
- `/src/components/GaslessCowswap.tsx` - Order monitoring and UI updates
- `/src/services/gaslessSwap.ts` - Added orderUid support

## Environment Variables

Add to your `.env` file:

```bash
# CoW Protocol API Configuration
COW_API_BASE_URL=https://api.cow.fi/base/api/v1
COW_SETTLEMENT_CONTRACT=0x9008D19f58AAbD9eD0D60971565AA8510560ab41
```

## User Experience

### With Funded Relayer
1. User sees real CoW Protocol quote
2. Signs permit for gasless approval
3. Order submitted to CoW Protocol (shows order UID)
4. UI automatically monitors execution
5. When solver executes: **shows real transaction hash**
6. Working BaseScan link to view actual swap

### Without Funded Relayer
1. Shows simulation with clear messaging
2. Displays relayer address for funding
3. Once funded, real swaps work immediately

## Testing Real Swaps

1. **Fund the relayer wallet** with ETH on Base:
   ```bash
   # The relayer address is logged in the API console
   # Send ETH to enable real transactions
   ```

2. **Verify CoW Protocol API** is accessible:
   ```bash
   curl https://api.cow.fi/base/api/v1/quote \
     -H "Content-Type: application/json" \
     -d '{"sellToken":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","buyToken":"0x4200000000000000000000000000000000000006","sellAmount":"1000000","kind":"sell"}'
   ```

3. **Monitor order execution**:
   - Check console logs for order UID
   - Watch UI for automatic status updates
   - Verify transaction hash works on BaseScan

## Debugging

### Common Issues

1. **"0xCOWFAILED" hash**: CoW Protocol API error
   - Check network connectivity
   - Verify API endpoint is correct
   - Check USDC/WETH contract addresses

2. **Order never executes**: 
   - Slippage may be too low
   - Insufficient liquidity
   - Check order status in CoW Protocol explorer

3. **No permit signature**:
   - User must sign the permit
   - Wallet must support EIP-712

### Monitoring Tools

- **CoW Protocol Explorer**: View orders and execution status
- **BaseScan**: View actual transaction details
- **Console logs**: Detailed API interactions

## Next Steps

The system now provides **real CoW Protocol integration** with:
- ✅ Real quotes and order submission
- ✅ Actual transaction hash display
- ✅ Working BaseScan links
- ✅ Order status monitoring

For production deployment, ensure:
1. Relayer wallet is funded with sufficient ETH
2. Environment variables are set correctly
3. CoW Protocol API is accessible from your server
