import { arbitrum, base, Chain, mainnet, optimism } from "viem/chains";

export const jbChains = [
  base,
  mainnet,
  optimism,
  arbitrum,
] as const satisfies Chain[];

export const JBMULTITERMINAL_ADDRESS =
  "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc" as const;

export const JBDIRECTORY_ADDRESS =
  "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41" as const;

export const ETH_ADDRESS =
  "0x000000000000000000000000000000000000EEEe" as const;

// Format project input as "chain:projectId"
export function formatProjectInput(chain: Chain, projectId: string): string {
  const chainName = chain.name.toLowerCase().replace(/\s+/g, '');
  return `${chainName}:${projectId}`;
}

// Parse project input from "chain:projectId" format
export function parseProjectInput(input: string): { chain: Chain | null; projectId: string | null } {
  const parts = input.split(':');
  if (parts.length !== 2) {
    return { chain: null, projectId: null };
  }
  
  const [chainName, projectId] = parts;
  const chain = jbChains.find(c => 
    c.name.toLowerCase().replace(/\s+/g, '') === chainName.toLowerCase()
  );
  
  return { chain: chain || null, projectId: projectId || null };
}
