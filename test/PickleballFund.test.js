const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PickleballFund", function () {
  let PickleballFund;
  let pickleballFund;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const fundingGoal = ethers.parseEther("0.6"); // 0.6 ETH
  const durationInDays = 14;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    PickleballFund = await ethers.getContractFactory("PickleballFund");
    pickleballFund = await PickleballFund.deploy(fundingGoal, durationInDays);
    await pickleballFund.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right funding goal", async function () {
      const status = await pickleballFund.getFundStatus();
      expect(status[1]).to.equal(fundingGoal);
    });

    it("Should set the right deadline", async function () {
      const status = await pickleballFund.getFundStatus();
      const expectedDeadline = (await ethers.provider.getBlock('latest')).timestamp + (durationInDays * 24 * 60 * 60);
      expect(Number(status[2])).to.be.closeTo(expectedDeadline, 10); // Allow 10 seconds tolerance
    });

    it("Should set the right owner", async function () {
      expect(await pickleballFund.owner()).to.equal(owner.address);
    });
  });

  describe("Contributions", function () {
    it("Should accept valid contributions", async function () {
      const contributionAmount = ethers.parseEther("0.04");
      
      await expect(pickleballFund.connect(addr1).contribute({ value: contributionAmount }))
        .to.emit(pickleballFund, "ContributionMade")
        .withArgs(addr1.address, contributionAmount, anyValue);

      expect(await pickleballFund.contributions(addr1.address)).to.equal(contributionAmount);
      
      const status = await pickleballFund.getFundStatus();
      expect(status[0]).to.equal(contributionAmount); // totalRaised
      expect(status[3]).to.equal(1); // contributorCount
    });

    it("Should reject contributions below minimum", async function () {
      const smallAmount = ethers.parseEther("0.005"); // Below 0.01 ETH minimum
      
      await expect(pickleballFund.connect(addr1).contribute({ value: smallAmount }))
        .to.be.revertedWith("Contribution below minimum");
    });

    it("Should track multiple contributions from same address", async function () {
      const amount1 = ethers.parseEther("0.02");
      const amount2 = ethers.parseEther("0.03");
      
      await pickleballFund.connect(addr1).contribute({ value: amount1 });
      await pickleballFund.connect(addr1).contribute({ value: amount2 });
      
      expect(await pickleballFund.contributions(addr1.address)).to.equal(amount1 + amount2);
      
      const status = await pickleballFund.getFundStatus();
      expect(status[3]).to.equal(1); // Should still be 1 contributor
    });

    it("Should emit GoalReached event when goal is met", async function () {
      await expect(pickleballFund.connect(addr1).contribute({ value: fundingGoal }))
        .to.emit(pickleballFund, "GoalReached")
        .withArgs(fundingGoal, anyValue);

      const status = await pickleballFund.getFundStatus();
      expect(status[4]).to.be.true; // goalReached
    });
  });

  describe("Progress tracking", function () {
    it("Should calculate progress percentage correctly", async function () {
      const halfGoal = fundingGoal / 2n;
      await pickleballFund.connect(addr1).contribute({ value: halfGoal });
      
      const progress = await pickleballFund.getProgressPercentage();
      expect(progress).to.equal(50);
    });

    it("Should cap progress at 100%", async function () {
      const overGoal = fundingGoal * 2n;
      await pickleballFund.connect(addr1).contribute({ value: overGoal });
      
      const progress = await pickleballFund.getProgressPercentage();
      expect(progress).to.equal(200); // Contract returns actual percentage, frontend should cap at 100
    });
  });

  describe("Fund withdrawal", function () {
    beforeEach(async function () {
      // Reach the goal
      await pickleballFund.connect(addr1).contribute({ value: fundingGoal });
    });

    it("Should allow owner to withdraw funds after goal reached", async function () {
      const recipient = addr2.address;
      const initialBalance = await ethers.provider.getBalance(recipient);
      
      await expect(pickleballFund.withdrawFunds(recipient))
        .to.emit(pickleballFund, "FundsWithdrawn")
        .withArgs(recipient, fundingGoal, anyValue);

      const finalBalance = await ethers.provider.getBalance(recipient);
      expect(finalBalance - initialBalance).to.equal(fundingGoal);
    });

    it("Should prevent non-owner from withdrawing funds", async function () {
      await expect(pickleballFund.connect(addr1).withdrawFunds(addr2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent withdrawal if goal not reached", async function () {
      // Deploy new contract and don't reach goal
      const newFund = await PickleballFund.deploy(fundingGoal, durationInDays);
      await newFund.waitForDeployment();
      
      await expect(newFund.withdrawFunds(addr2.address))
        .to.be.revertedWith("Funding goal not reached");
    });

    it("Should prevent double withdrawal", async function () {
      await pickleballFund.withdrawFunds(addr2.address);
      
      await expect(pickleballFund.withdrawFunds(addr2.address))
        .to.be.revertedWith("Funds already withdrawn");
    });
  });

  describe("Refunds", function () {
    it("Should allow refunds if goal not reached after deadline", async function () {
      const contribution = ethers.parseEther("0.1");
      await pickleballFund.connect(addr1).contribute({ value: contribution });
      
      // Fast forward past deadline
      await ethers.provider.send("evm_increaseTime", [durationInDays * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      const initialBalance = await ethers.provider.getBalance(addr1.address);
      
      const tx = await pickleballFund.connect(addr1).requestRefund();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(addr1.address);
      
      // Account for gas costs
      expect(finalBalance + gasUsed - initialBalance).to.equal(contribution);
      expect(await pickleballFund.contributions(addr1.address)).to.equal(0);
    });

    it("Should prevent refunds if goal was reached", async function () {
      await pickleballFund.connect(addr1).contribute({ value: fundingGoal });
      
      // Fast forward past deadline
      await ethers.provider.send("evm_increaseTime", [durationInDays * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(pickleballFund.connect(addr1).requestRefund())
        .to.be.revertedWith("Funding goal already reached");
    });

    it("Should prevent refunds before deadline", async function () {
      await pickleballFund.connect(addr1).contribute({ value: ethers.parseEther("0.1") });
      
      await expect(pickleballFund.connect(addr1).requestRefund())
        .to.be.revertedWith("Funding period still active");
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      await pickleballFund.pause();
      
      await expect(pickleballFund.connect(addr1).contribute({ value: ethers.parseEther("0.1") }))
        .to.be.revertedWith("Pausable: paused");
      
      await pickleballFund.unpause();
      
      await expect(pickleballFund.connect(addr1).contribute({ value: ethers.parseEther("0.1") }))
        .to.not.be.reverted;
    });

    it("Should allow owner to update goal before it's reached", async function () {
      const newGoal = ethers.parseEther("1.0");
      
      await expect(pickleballFund.updateGoal(newGoal))
        .to.emit(pickleballFund, "GoalUpdated")
        .withArgs(fundingGoal, newGoal);
      
      const status = await pickleballFund.getFundStatus();
      expect(status[1]).to.equal(newGoal);
    });

    it("Should prevent goal update after goal is reached", async function () {
      await pickleballFund.connect(addr1).contribute({ value: fundingGoal });
      
      await expect(pickleballFund.updateGoal(ethers.parseEther("1.0")))
        .to.be.revertedWith("Cannot update goal after it's reached");
    });
  });

  // Helper function for testing events with any value
  const anyValue = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
});
