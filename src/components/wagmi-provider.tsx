"use client";

import { wagmiConfig } from "../../lib/wagmi.config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";
import { WagmiProvider as WagmiProviderBase } from "wagmi";

const queryClient = new QueryClient();

export const WagmiProvider = ({ children }: PropsWithChildren) => {
  return (
    <WagmiProviderBase config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProviderBase>
  );
}; 