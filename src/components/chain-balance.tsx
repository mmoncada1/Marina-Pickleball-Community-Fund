"use client";

import { formatEther } from "viem";
import { useAccount, useBalance } from "wagmi";

interface Props {
  chainId: number;
}

export function ChainBalance(props: Props) {
  const { chainId } = props;

  const { address } = useAccount();
  const { data: balance, isLoading } = useBalance({ chainId, address });

  if (isLoading) return "?.????";
  if (!address || !balance) return "0.0000";

  return Number(formatEther(balance.value)).toFixed(4);
}
