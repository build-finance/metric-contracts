// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/Structures.sol";
import "../interfaces/IBatchTokenSwapRouter.sol";
import "../interfaces/IFeeCollector.sol";

contract Controller is Ownable, Pausable {

    IERC20 public rewardToken;
    IFeeCollector[] public feeCollectors;
    Structures.RewardReceiver[] public rewardReceivers;
    IBatchTokenSwapRouter public swapRouter;

    uint public feeConversionIncentive;

    constructor(
        Structures.RewardReceiver[] memory _rewardReceivers,
        IFeeCollector[] memory _feeCollectors,
        IBatchTokenSwapRouter _swapRouter,
        uint _feeConversionIncentive,
        IERC20 _rewardToken
    ) {
        rewardToken = _rewardToken;
        feeConversionIncentive = _feeConversionIncentive;
        swapRouter = _swapRouter;

        for(uint i = 0; i < _rewardReceivers.length; i++) {
            rewardReceivers.push(_rewardReceivers[i]);
        }

        for(uint i = 0; i < _feeCollectors.length; i++) {
            feeCollectors.push(_feeCollectors[i]);
        }

    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getRewardReceivers() public view whenNotPaused returns(Structures.RewardReceiver[] memory){
        return rewardReceivers;
    }

    function getFeeCollectors() public view whenNotPaused returns(IFeeCollector[] memory) {
        return feeCollectors;
    }

    function setRewardReceivers(
        Structures.RewardReceiver[] memory _rewardReceivers
    ) onlyOwner public {
        delete rewardReceivers;

        for(uint i = 0; i < _rewardReceivers.length; i++) {
            rewardReceivers.push(_rewardReceivers[i]);
        }
    }

    function setFeeCollectors(
        IFeeCollector[] memory _feeCollectors
    ) onlyOwner public {
        delete feeCollectors;

        for(uint i = 0; i < _feeCollectors.length; i++) {
            feeCollectors.push(_feeCollectors[i]);
        }
    }

    function setFeeConversionIncentive(uint _value) onlyOwner public {
        feeConversionIncentive = _value;
    }

    function setRewardToken(IERC20 _token) onlyOwner public {
        rewardToken = _token;
    }

}
