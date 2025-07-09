"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionConfirmationModal } from "@/components/confirm-transaction";
import { ConnectButton } from "@/components/connect-button";
import { SelectChain } from "@/components/select-chain";
import { useProjects } from "@/hooks/use-projects";
import { jbChains } from "@/lib/chains";
import { calculateTokensFromEth } from "@/lib/quote";
import { formatProjectInput, parseProjectInput } from "@/lib/chains";
import { useEffect, useMemo, useState } from "react";
import { Chain, formatEther } from "viem";
import { mainnet, base } from "viem/chains";
import { useAccount, useBalance } from "wagmi";
import { Crown } from "lucide-react";

// Optional environment variables
const HARDCODED_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;
const DEFAULT_CHAIN_ID = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;

export function PayProjectForm() {
  // Find the default chain or use the first available chain
  const defaultChain = useMemo(() => {
    if (DEFAULT_CHAIN_ID) {
      const chainId = Number(DEFAULT_CHAIN_ID);
      const foundChain = jbChains.find((chain) => chain.id === chainId);
      if (foundChain) return foundChain;
    }
    return base; // Default to base
  }, []);

  // Initialize states
  const [projectId, setProjectId] = useState(HARDCODED_PROJECT_ID || "3");
  const [selectedChain, setSelectedChain] = useState<Chain>(defaultChain);
  const [amount, setAmount] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showChainPopover, setShowChainPopover] = useState(false);
  const [showConnectButton, setShowConnectButton] = useState(true);

  // Track the input value separately to allow free editing
  const [inputValue, setInputValue] = useState(() =>
    formatProjectInput(selectedChain, projectId)
  );

  // Handle project input changes
  const handleProjectInputChange = (value: string) => {
    setInputValue(value);
    const { chain, projectId: parsedProjectId } = parseProjectInput(value);

    // Only update if we have a valid chain and projectId
    if (chain && parsedProjectId) {
      setSelectedChain(chain);
      setProjectId(parsedProjectId);
    }
  };

  // Update input when chain changes from dropdown
  useEffect(() => {
    if (projectId) {
      const formatted = formatProjectInput(selectedChain, projectId);
      setInputValue(formatted);
    }
  }, [selectedChain, projectId]);

  const { isConnected, address } = useAccount();
  const { data: balance } = useBalance({ chainId: selectedChain.id, address });

  // Fetch projects - only fires if both chainId and projectId are set
  const { data: projects } = useProjects({
    chainId: selectedChain.id,
    projectId,
  });

  // Get the project for the selected chain
  const project = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return projects.find((p) => p.chainId === selectedChain.id) || null;
  }, [projects, selectedChain.id]);

  // Get available chains based on the projects returned from API
  const availableChains = useMemo(() => {
    if (!projects || projects.length === 0) return jbChains;

    const projectChainIds = projects.map((p) => p.chainId);
    return jbChains.filter((chain) => projectChainIds.includes(chain.id));
  }, [projects]);

  useEffect(() => {
    setShowConnectButton(!isConnected);
  }, [isConnected]);

  // Update selected chain if current chain is not available
  useEffect(() => {
    if (
      availableChains.length > 0 &&
      !availableChains.find((chain) => chain.id === selectedChain.id)
    ) {
      setSelectedChain(availableChains[0]);
    }
  }, [availableChains, selectedChain]);

  return (
    <>
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6">
          {!HARDCODED_PROJECT_ID && (
            <div className="space-y-2">
              <div className="flex justify-between space-x-2.5">
                <Label htmlFor="projectId" className="text-sm font-medium">
                  Project
                </Label>
                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {project?.name}
                  {project?.isRevnet && (
                    <Crown className="w-4 h-4 inline-block text-yellow-500" />
                  )}
                </span>
              </div>
              <Input
                id="projectId"
                placeholder="chain:projectId (e.g. base:3)"
                value={inputValue}
                onChange={(e) => handleProjectInputChange(e.target.value)}
                className="h-12"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              You Pay
            </Label>
            <div className="border border-border rounded-lg p-2 space-y-3">
              <SelectChain
                selectedChain={selectedChain}
                onSelect={(chain) => {
                  setSelectedChain(chain);
                  setShowChainPopover(false);
                }}
                isOpen={showChainPopover}
                onOpenChange={setShowChainPopover}
                availableChains={availableChains}
              />

              <div className="relative">
                <Input
                  id="amount"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 pr-16 md:text-2xl border-0 bg-transparent pl-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  type="number"
                  step="0.001"
                  min={0}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const amount = Number(formatEther(balance?.value ?? 0n));
                    const gasBuffer =
                      selectedChain.id === mainnet.id ? 0.001 : 0.000025;
                    setAmount(Math.max(amount - gasBuffer, 0).toFixed(5));
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs font-medium text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20"
                >
                  Max
                </Button>
              </div>
            </div>
          </div>

          {showConnectButton ? (
            <ConnectButton
              className="w-full h-12 text-lg font-medium"
              size="lg"
            />
          ) : (
            <Button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={Number(amount) <= 0 || !project}
              className="w-full h-12 text-lg font-medium"
              size="lg"
            >
              Pay {amount || "0"} {selectedChain.nativeCurrency.symbol}
            </Button>
          )}

          <div
            className={`text-center text-sm text-muted-foreground transition-opacity duration-300 -mt-2.5 ${
              project && amount && Number.parseFloat(amount) > 0
                ? "opacity-100"
                : "opacity-0"
            }`}
          >
            You'll receive ~
            {calculateTokensFromEth(amount, project?.token.price || "0")}{" "}
            {project?.token.symbol}
          </div>
        </CardContent>
      </Card>

      {project && (
        <TransactionConfirmationModal
          isOpen={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          amount={amount}
          chain={selectedChain}
          project={project}
        />
      )}
    </>
  );
}
