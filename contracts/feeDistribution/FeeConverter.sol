// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IFeeCollector.sol";
import "../libraries/Structures.sol";
import "./Controller.sol";

contract FeeConverter is Ownable {

    Controller controller;

    event FeeDistribution(address recipient, uint amount);

    constructor(
        Controller _controller
    ) {
        controller = _controller;
    }

    function convertTokens(
        address[] memory _tokens,
        uint[] memory _supplyTokenAmounts,
        uint[] memory _minOutputs
    ) public {

        _collectFees();

        uint expectedMinOutput = controller.rewardToken().balanceOf(address(this));

        for (uint i = 0; i < _tokens.length; i++) {
            IERC20(_tokens[i]).transfer(address(controller.swapRouter()), _supplyTokenAmounts[i]);
            expectedMinOutput += _minOutputs[i];
        }

        controller.swapRouter().batchSellTokens(
            _tokens,
            _supplyTokenAmounts,
            _minOutputs,
            address(controller.rewardToken())
        );

        uint rewardTokenBalance = controller.rewardToken().balanceOf(address(this));

        require(
            rewardTokenBalance >= expectedMinOutput,
            "Insufficient output swap amount"
        );

        uint callerIncentive = rewardTokenBalance * controller.feeConversionIncentive() / 100e18;

        _sendRewardToken(msg.sender, callerIncentive);
        _transferRewardTokenToReceivers(rewardTokenBalance - callerIncentive);
    }

    function _collectFees() private {
        IFeeCollector[] memory collectors = controller.getFeeCollectors();
        for(uint i = 0; i < collectors.length; i++) {
            collectors[i].collect();
        }
    }

    function _transferRewardTokenToReceivers(uint _amount) private {

        Structures.RewardReceiver[] memory receivers = controller.getRewardReceivers();

        uint remaining = _amount;
        uint nbReceivers = receivers.length;

        for(uint i = 0; i < nbReceivers - 1; i++) {
            uint receiverShare = _amount * receivers[i].share / 100e18;
            _sendRewardToken(receivers[i].receiver, receiverShare);

            remaining -= receiverShare;
        }
        _sendRewardToken(receivers[nbReceivers - 1].receiver, remaining);
    }

    function _sendRewardToken(address _recipient, uint _amount) private {
        controller.rewardToken().transfer(_recipient, _amount);
        emit FeeDistribution(_recipient, _amount);
    }

}