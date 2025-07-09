import { arbitrum, base, mainnet, optimism } from "viem/chains";
import { createConfig, fallback, http, injected, Transport } from "wagmi";

const INFURA_ID = process.env.NEXT_PUBLIC_INFURA_ID;

const jbChains = [mainnet, base, optimism, arbitrum] as const;

export const transports: Record<number, Transport> = {
  [mainnet.id]: fallback([
    ...(INFURA_ID ? [http(`https://mainnet.infura.io/v3/${INFURA_ID}`)] : []),
    http(),
  ]),
  [optimism.id]: fallback([
    ...(INFURA_ID ? [http(`https://optimism-mainnet.infura.io/v3/${INFURA_ID}`)] : []),
    http(),
  ]),
  [base.id]: fallback([
    ...(INFURA_ID ? [http(`https://base-mainnet.infura.io/v3/${INFURA_ID}`)] : []),
    http(),
  ]),
  [arbitrum.id]: fallback([
    ...(INFURA_ID ? [http(`https://arbitrum-mainnet.infura.io/v3/${INFURA_ID}`)] : []),
    http(),
  ]),
};

export const wagmiConfig = createConfig({
  chains: jbChains,
  connectors: [injected()],
  transports,
}); 