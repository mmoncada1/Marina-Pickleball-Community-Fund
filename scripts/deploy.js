const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Marina Pickleball Community Fund contract...");

  // Contract parameters
  const fundingGoal = ethers.parseEther("0.6"); // ~$1500 at $2500 ETH
  const durationInDays = 14; // 2 weeks

  // Deploy the contract
  const PickleballFund = await hre.ethers.getContractFactory("PickleballFund");
  const pickleballFund = await PickleballFund.deploy(fundingGoal, durationInDays);

  await pickleballFund.waitForDeployment();

  const contractAddress = await pickleballFund.getAddress();
  console.log("PickleballFund deployed to:", contractAddress);

  // Get deployment info
  const [deployer] = await ethers.getSigners();
  console.log("Deployed by:", deployer.address);
  console.log("Funding goal:", ethers.formatEther(fundingGoal), "ETH");
  console.log("Duration:", durationInDays, "days");

  // Get fund status
  const status = await pickleballFund.getFundStatus();
  console.log("\nInitial Fund Status:");
  console.log("- Total Raised:", ethers.formatEther(status[0]), "ETH");
  console.log("- Funding Goal:", ethers.formatEther(status[1]), "ETH");
  console.log("- Deadline:", new Date(Number(status[2]) * 1000).toLocaleString());
  console.log("- Contributors:", status[3].toString());
  console.log("- Goal Reached:", status[4]);

  // Verify contract on Etherscan (if not on localhost)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await pickleballFund.deploymentTransaction().wait(6);

    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [fundingGoal, durationInDays],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    fundingGoal: ethers.formatEther(fundingGoal),
    durationInDays,
    deployedAt: new Date().toISOString(),
    blockNumber: await pickleballFund.deploymentTransaction().then(tx => tx.blockNumber),
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("\nUpdate your .env file with:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${hre.network.config.chainId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
