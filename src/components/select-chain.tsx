"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChainBalance } from "@/components/chain-balance";
import { jbChains } from "@/lib/chains";
import { Chain } from "viem";
import { ChevronDown } from "lucide-react";

interface Props {
  selectedChain: Chain;
  onSelect: (chain: Chain) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableChains?: Chain[];
}

export function SelectChain(props: Props) {
  const {
    selectedChain,
    onSelect,
    isOpen,
    onOpenChange,
    availableChains = jbChains,
  } = props;
  const { name, nativeCurrency, id } = selectedChain;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-auto p-2 justify-between text-left font-normal hover:bg-transparent cursor-pointer"
        >
          <span className="text-sm text-muted-foreground">on {name}</span>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">{nativeCurrency.symbol}</div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-1">
          {availableChains.map((chain) => (
            <button
              type="button"
              key={chain.id}
              onClick={() => onSelect(chain)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                {
                  "bg-accent": id === chain.id,
                  "hover:bg-accent/75": id !== chain.id,
                }
              )}
            >
              <div className="font-medium text-sm">{chain.name}</div>
              <div className="text-xs text-muted-foreground">
                <ChainBalance chainId={chain.id} /> {nativeCurrency.symbol}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
