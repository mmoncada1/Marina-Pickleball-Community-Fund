"use client";

import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Button } from "@/components/ui/button";
import { ComponentProps } from "react";
import { Wallet } from "lucide-react";

export function ConnectButton(props: ComponentProps<typeof Button>) {
  const { connect } = useConnect();

  return (
    <Button onClick={() => connect({ connector: injected() })} {...props}>
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
