import { formatEther, parseEther } from "viem";

export function calculateTokensFromEth(ethAmount: string, price: string): string {
  if (!price || !ethAmount || ethAmount === "") return "";

  try {
    const payAmountWei = parseEther(ethAmount);
    const priceWei = BigInt(price);

    if (priceWei === 0n) return "0";

    const tokens = (payAmountWei * BigInt(1e18)) / priceWei;
    const tokensFormatted = formatEther(tokens);

    const rounded = Number.parseFloat(tokensFormatted).toFixed(2);
    return Number.parseFloat(rounded).toString();
  } catch (error) {
    return "";
  }
}
