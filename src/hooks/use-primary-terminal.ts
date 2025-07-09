"use client";

import { useReadContract } from "wagmi";
import { JBDIRECTORY_ADDRESS, JBMULTITERMINAL_ADDRESS } from "@/lib/chains";
import { jbDirectoryAbi } from "@/lib/abis";

export function usePrimaryNativeTerminal(chainId: number, projectId: bigint) {
  // Try to get the primary terminal from the JB Directory
  const { data: primaryTerminal } = useReadContract({
    address: JBDIRECTORY_ADDRESS,
    abi: jbDirectoryAbi,
    functionName: "primaryTerminalOf",
    args: [projectId, "0x000000000000000000000000000000000000EEEe"], // ETH address
    chainId,
  });

  // Return the primary terminal or fallback to the multi-terminal
  return {
    data: primaryTerminal || JBMULTITERMINAL_ADDRESS,
    isLoading: false,
    error: null,
  };
} 