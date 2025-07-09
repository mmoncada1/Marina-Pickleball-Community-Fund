"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAccount, useBalance } from "wagmi";
import { base } from "viem/chains";
import { formatEther, parseEther } from "viem";
import { usePayProject } from "@/hooks/use-pay-project";
import { ETH_ADDRESS } from "@/lib/chains";
import { DollarSign, Zap, Wallet, ArrowRight, RefreshCw, TrendingUp } from "lucide-react";
import { ConnectButton } from "./connect-button";
import { useFundWallet } from "@privy-io/react-auth";

// Marina Pickleball Community Fund Project ID
const PROJECT_ID = BigInt(107);
const CHAIN_ID = base.id;

interface Props {
  totalRaised: number;
  fundingGoal: number;
}

export function SimplifiedPayment({ totalRaised, fundingGoal }: Props) {
  const [usdAmount, setUsdAmount] = useState("");
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWaitingForFunds, setIsWaitingForFunds] = useState(false);
  const [previousBalance, setPreviousBalance] = useState<bigint | null>(null);
  const [balanceIncreased, setBalanceIncreased] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBalance({ 
    chainId: CHAIN_ID, 
    address,
    query: {
      refetchInterval: isWaitingForFunds ? 2000 : 30000, // More frequent updates when waiting for funds
    }
  });
  const { payProject, status, errorMessage, reset } = usePayProject(CHAIN_ID, PROJECT_ID);
  const { fundWallet } = useFundWallet();

  // Track balance changes
  useEffect(() => {
    if (balance?.value && previousBalance !== null) {
      if (balance.value > previousBalance) {
        setBalanceIncreased(true);
        setIsWaitingForFunds(false);
        // Show the increase animation for 3 seconds
        setTimeout(() => setBalanceIncreased(false), 3000);
      }
    }
    if (balance?.value) {
      setPreviousBalance(balance.value);
    }
  }, [balance?.value, previousBalance]);

  // Fetch ETH price
  useEffect(() => {
    async function fetchEthPrice() {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        setEthPrice(data.ethereum.usd);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(3500); // Fallback price
      }
    }
    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate ETH amount needed
  const ethAmount = useMemo(() => {
    if (!usdAmount || !ethPrice) return "";
    const usd = parseFloat(usdAmount);
    if (isNaN(usd) || usd <= 0) return "";
    return (usd / ethPrice).toFixed(6);
  }, [usdAmount, ethPrice]);

  // Check if user has enough ETH
  const hasEnoughEth = useMemo(() => {
    if (!balance || !ethAmount) return false;
    const requiredWei = parseEther(ethAmount);
    return balance.value >= requiredWei;
  }, [balance, ethAmount]);

  // Calculate remaining amount needed for goal
  const remainingForGoal = Math.max(fundingGoal - totalRaised, 0);

  const handleContribute = async () => {
    if (!address || !ethAmount) return;
    
    setIsProcessing(true);
    
    try {
      await payProject({
        projectId: PROJECT_ID,
        token: ETH_ADDRESS,
        amount: ethAmount,
        beneficiary: address,
      });
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnramp = () => {
    // Trigger Coinbase onramp through Privy with the specific ETH amount
    // The amount guidance is provided in the UI instead
    if (address && usdAmount && ethAmount) {
      setIsWaitingForFunds(true);
      fundWallet(address, { 
        chain: base,
        amount: ethAmount // Pass the calculated ETH amount as string
      });
    }
  };

  const handleQuickAmount = (amount: number) => {
    setUsdAmount(amount.toString());
  };

  const progress = Math.min((totalRaised / fundingGoal) * 100, 100);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Goal Progress */}
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold text-primary-600">
          ${totalRaised.toLocaleString()} raised
        </div>
        <div className="text-sm text-gray-600">
          of ${fundingGoal.toLocaleString()} goal
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-primary-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {remainingForGoal > 0 && (
          <div className="text-sm text-gray-500">
            ${remainingForGoal.toLocaleString()} remaining
          </div>
        )}
      </div>

      {/* Payment Form */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Contribute to Marina Pickleball</h3>
            <p className="text-sm text-gray-600">
              Help us buy two new nets for Moscone Park
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Quick amounts
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[25, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  variant={usdAmount === amount.toString() ? "default" : "outline"}
                  onClick={() => handleQuickAmount(amount)}
                  className="h-10"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* USD Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Or enter custom amount (USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                placeholder="Enter amount"
                value={usdAmount}
                onChange={(e) => setUsdAmount(e.target.value)}
                className="pl-10 text-lg h-12"
                min="1"
                step="1"
              />
            </div>
          </div>

          {/* ETH Conversion Display */}
          {ethAmount && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ETH needed:</span>
                <span className="font-medium">{ethAmount} ETH</span>
              </div>
              {ethPrice && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>ETH Price:</span>
                  <span>${ethPrice.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Balance Display */}
          {isConnected && (
            <div className={`rounded-lg p-3 transition-all duration-500 ${
              balanceIncreased 
                ? "bg-green-50 border-2 border-green-200 animate-pulse" 
                : "bg-blue-50 border border-blue-200"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${balanceIncreased ? "text-green-700" : "text-blue-700"}`}>
                    Your ETH Balance:
                  </span>
                  {balanceIncreased && (
                    <TrendingUp className="w-4 h-4 text-green-600 animate-bounce" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${balanceIncreased ? "text-green-800" : "text-blue-800"}`}>
                    {balance ? Number(formatEther(balance.value)).toFixed(4) : "0.0000"} ETH
                  </span>
                  {isWaitingForFunds && (
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  )}
                </div>
              </div>
              {balance && ethPrice && (
                <div className="text-xs text-gray-500 mt-1">
                  ≈ ${(Number(formatEther(balance.value)) * ethPrice).toFixed(2)} USD
                </div>
              )}
            </div>
          )}

          {/* Waiting for Funds Animation */}
          {isWaitingForFunds && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <div>
                  <p className="text-yellow-800 text-sm font-medium">
                    Waiting for funds to arrive...
                  </p>
                  <p className="text-yellow-700 text-xs">
                    This usually takes 1-2 minutes. Your balance will update automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!isConnected ? (
            <ConnectButton className="w-full h-12 text-lg" />
          ) : !ethAmount || parseFloat(ethAmount) <= 0 ? (
            <Button disabled className="w-full h-12 text-lg">
              Select or enter amount to contribute
            </Button>
          ) : !hasEnoughEth ? (
            <div className="space-y-2">
              <Button 
                onClick={handleOnramp}
                disabled={isWaitingForFunds}
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              >
                <Wallet className="w-5 h-5 mr-2" />
                {isWaitingForFunds ? "Adding funds..." : `Add ${ethAmount} ETH ($${usdAmount})`}
              </Button>
              <p className="text-xs text-center text-gray-500">
                This will open Coinbase onramp with the exact amount pre-filled
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleContribute}
              disabled={isProcessing || status === 'pending' || status === 'confirming'}
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
            >
              {isProcessing || status === 'pending' || status === 'confirming' ? (
                <>
                  <Zap className="w-5 h-5 mr-2 animate-spin" />
                  {status === 'pending' ? 'Confirm in Wallet' : 'Processing...'}
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Contribute ${usdAmount}
                </>
              )}
            </Button>
          )}

          {/* Status Messages */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm font-medium">
                🎉 Contribution successful! Thank you for supporting Marina Pickleball!
              </p>
            </div>
          )}

          {status === 'error' && errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                ❌ {errorMessage}
              </p>
              <Button 
                onClick={reset}
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 