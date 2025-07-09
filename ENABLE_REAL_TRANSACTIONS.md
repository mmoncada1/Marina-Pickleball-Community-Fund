# How to Enable Real Transactions - Relayer Funding Guide

## Current Status: Simulated Transactions Only

Your gasless swap system is currently in **simulation mode** because the relayer wallet is unfunded. Here's how to enable real transactions on Base mainnet.

## 🔍 Check Current Relayer Address

The relayer wallet address is derived from the private key. To see the current address:

1. Check the console logs when attempting a swap
2. Look for: `⚠️ Relayer wallet (0x...) has no ETH balance`
3. The address shown is where you need to send ETH

## 💰 Funding the Relayer Wallet

### Step 1: Get ETH on Base Mainnet
You need ETH on Base (not Ethereum mainnet). Options:
- **Bridge from Ethereum**: Use [Base Bridge](https://bridge.base.org)
- **Buy directly**: Use exchanges that support Base network
- **Receive from another Base wallet**

### Step 2: Send ETH to Relayer Address
- **Minimum amount**: 0.001 ETH (for testing)
- **Recommended**: 0.1 ETH (for multiple transactions)
- **Network**: Base Mainnet (Chain ID: 8453)

### Step 3: Verify Funding
After sending ETH:
1. Try a gasless swap again
2. Check console logs for: `✅ Real transaction submitted: 0x...`
3. The transaction hash should be a real Base transaction

## 🔧 Production Setup (Advanced)

For production deployment:

### Generate Secure Private Key
```bash
# Generate new wallet (keep this secret!)
openssl rand -hex 32

# Or use a hardware wallet for maximum security
```

### Set Environment Variable
```bash
# In your .env.production file
RELAYER_PRIVATE_KEY=0x[your_secure_private_key_here]
```

### Fund with Sufficient ETH
- Monitor balance regularly
- Set up auto-refill when balance drops below threshold
- Keep enough for 100+ transactions

## 🧪 Testing Real Transactions

### Test Transaction Flow
1. **Fund relayer** with 0.01+ ETH on Base
2. **Attempt swap** through the UI
3. **Check logs** for real transaction hash
4. **Verify on BaseScan**: Transaction should appear within 10-30 seconds

### Expected Console Output (Real Transaction)
```
Relayer balance: 0.1 ETH
Attempting real transaction execution...
✅ Real transaction submitted: 0x1234567890abcdef...
✅ Transaction confirmed: { blockNumber: 123456, status: 'success' }
```

### Expected Console Output (Still Simulated)
```
Relayer balance: 0 ETH
⚠️ Insufficient relayer balance for real transaction, using simulation
```

## 🚨 Security Considerations

### Private Key Security
- **Never commit** private keys to code repositories
- **Use environment variables** for all secrets
- **Consider hardware wallets** for production
- **Rotate keys regularly** in production

### Monitoring & Alerts
- **Set up balance alerts** when ETH drops below threshold
- **Monitor transaction failures** and gas price spikes
- **Log all transactions** for audit purposes
- **Rate limit** to prevent abuse

## 🎯 Quick Start: Enable Real Transactions

1. **Get the relayer address** from console logs
2. **Send 0.01 ETH** to that address on Base mainnet
3. **Try a swap** - it should now show real transaction hash
4. **Verify on BaseScan** - link will work and show actual transaction

Once funded, your gasless swaps will execute real transactions on Base! 🚀

## 📞 Support

If you encounter issues:
- Check Base network status
- Verify relayer has sufficient ETH balance  
- Check console logs for detailed error messages
- Ensure you're using Base mainnet (not testnet)
