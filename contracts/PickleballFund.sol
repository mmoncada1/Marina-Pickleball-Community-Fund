// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title Marina Pickleball Community Fund
 * @dev A simple crowdfunding contract for community pickleball improvements
 */
contract PickleballFund is ReentrancyGuard, Ownable, Pausable {
    // Events
    event ContributionMade(address indexed contributor, uint256 amount, uint256 timestamp);
    event GoalReached(uint256 totalRaised, uint256 timestamp);
    event FundsWithdrawn(address indexed recipient, uint256 amount, uint256 timestamp);
    event RefundIssued(address indexed contributor, uint256 amount, uint256 timestamp);
    event GoalUpdated(uint256 oldGoal, uint256 newGoal);
    event DeadlineUpdated(uint256 oldDeadline, uint256 newDeadline);

    // State variables
    uint256 public constant MINIMUM_CONTRIBUTION = 0.01 ether; // ~$25 at $2500 ETH
    uint256 public constant SUGGESTED_CONTRIBUTION = 0.04 ether; // ~$100 at $2500 ETH
    
    uint256 public fundingGoal;
    uint256 public deadline;
    uint256 public totalRaised;
    uint256 public contributorCount;
    
    bool public goalReached;
    bool public fundsWithdrawn;
    
    mapping(address => uint256) public contributions;
    address[] public contributors;
    
    struct ContributionInfo {
        address contributor;
        uint256 amount;
        uint256 timestamp;
    }
    
    ContributionInfo[] public contributionHistory;
    
    // Modifiers
    modifier onlyBeforeDeadline() {
        require(block.timestamp < deadline, "Funding period has ended");
        _;
    }
    
    modifier onlyAfterDeadline() {
        require(block.timestamp >= deadline, "Funding period still active");
        _;
    }
    
    modifier onlyWhenGoalReached() {
        require(goalReached, "Funding goal not reached");
        _;
    }
    
    modifier onlyWhenGoalNotReached() {
        require(!goalReached, "Funding goal already reached");
        _;
    }

    constructor(uint256 _fundingGoal, uint256 _durationInDays) {
        require(_fundingGoal > 0, "Funding goal must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");
        
        fundingGoal = _fundingGoal;
        deadline = block.timestamp + (_durationInDays * 1 days);
        
        // Initialize with the team addresses as initial contributors
        // This allows the team to have admin privileges
    }

    /**
     * @dev Contribute to the fund
     */
    function contribute() external payable nonReentrant whenNotPaused onlyBeforeDeadline {
        require(msg.value >= MINIMUM_CONTRIBUTION, "Contribution below minimum");
        require(!goalReached, "Funding goal already reached");
        
        // First-time contributor
        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
            contributorCount++;
        }
        
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        
        // Record contribution history
        contributionHistory.push(ContributionInfo({
            contributor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));
        
        emit ContributionMade(msg.sender, msg.value, block.timestamp);
        
        // Check if goal is reached
        if (totalRaised >= fundingGoal && !goalReached) {
            goalReached = true;
            emit GoalReached(totalRaised, block.timestamp);
        }
    }

    /**
     * @dev Withdraw funds (only owner, only after goal reached)
     */
    function withdrawFunds(address payable recipient) external onlyOwner onlyWhenGoalReached nonReentrant {
        require(!fundsWithdrawn, "Funds already withdrawn");
        require(recipient != address(0), "Invalid recipient address");
        
        fundsWithdrawn = true;
        uint256 amount = address(this).balance;
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(recipient, amount, block.timestamp);
    }

    /**
     * @dev Request refund (only if goal not reached and after deadline)
     */
    function requestRefund() external nonReentrant onlyAfterDeadline onlyWhenGoalNotReached {
        uint256 contribution = contributions[msg.sender];
        require(contribution > 0, "No contribution to refund");
        
        contributions[msg.sender] = 0;
        totalRaised -= contribution;
        
        (bool success, ) = msg.sender.call{value: contribution}("");
        require(success, "Refund failed");
        
        emit RefundIssued(msg.sender, contribution, block.timestamp);
    }

    /**
     * @dev Get contribution details for an address
     */
    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }

    /**
     * @dev Get all contributors
     */
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    /**
     * @dev Get contribution history
     */
    function getContributionHistory() external view returns (ContributionInfo[] memory) {
        return contributionHistory;
    }

    /**
     * @dev Get fund status
     */
    function getFundStatus() external view returns (
        uint256 _totalRaised,
        uint256 _fundingGoal,
        uint256 _deadline,
        uint256 _contributorCount,
        bool _goalReached,
        bool _fundsWithdrawn,
        uint256 _timeRemaining
    ) {
        return (
            totalRaised,
            fundingGoal,
            deadline,
            contributorCount,
            goalReached,
            fundsWithdrawn,
            block.timestamp < deadline ? deadline - block.timestamp : 0
        );
    }

    /**
     * @dev Get progress percentage (scaled by 100)
     */
    function getProgressPercentage() external view returns (uint256) {
        if (fundingGoal == 0) return 0;
        return (totalRaised * 100) / fundingGoal;
    }

    /**
     * @dev Emergency functions - only owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function updateGoal(uint256 newGoal) external onlyOwner {
        require(newGoal > 0, "Goal must be greater than 0");
        require(!goalReached, "Cannot update goal after it's reached");
        
        uint256 oldGoal = fundingGoal;
        fundingGoal = newGoal;
        
        // Check if new goal is now reached
        if (totalRaised >= fundingGoal && !goalReached) {
            goalReached = true;
            emit GoalReached(totalRaised, block.timestamp);
        }
        
        emit GoalUpdated(oldGoal, newGoal);
    }

    function updateDeadline(uint256 newDeadline) external onlyOwner {
        require(newDeadline > block.timestamp, "Deadline must be in the future");
        require(!goalReached, "Cannot update deadline after goal reached");
        
        uint256 oldDeadline = deadline;
        deadline = newDeadline;
        
        emit DeadlineUpdated(oldDeadline, newDeadline);
    }

    /**
     * @dev Emergency withdrawal - only if something goes wrong
     */
    function emergencyWithdraw(address payable recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        uint256 amount = address(this).balance;
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Emergency withdrawal failed");
        
        emit FundsWithdrawn(recipient, amount, block.timestamp);
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        contribute();
    }
}
