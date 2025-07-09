"use client";

import { useLogin } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { ComponentProps } from "react";
import { Wallet } from "lucide-react";

export function ConnectButton(props: ComponentProps<typeof Button>) {
  const { login } = useLogin();

  return (
    <Button onClick={login} {...props}>
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
