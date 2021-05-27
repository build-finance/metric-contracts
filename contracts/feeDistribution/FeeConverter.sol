// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IFeeCollector.sol";
import "../libraries/Structures.sol";
import "../libraries/Helpers.sol";
import "./Controller.sol";

contract FeeConverter {

    Controller controller;

    event FeeDistribution(address recipient, uint amount);

    constructor(Controller _controller) {
        controller = _controller;
    }

    function convertTokens(
        address[] memory _tokens,
        uint[] memory _inputAmounts,
        uint[] memory _minOutputs,
        bytes[] memory _feeCollectorParameters
    ) public {

        require(_tokens.length == _inputAmounts.length, "inputAmounts list length must match tokens list length");
        require(_tokens.length == _minOutputs.length, "minOutputs list length must match tokens list length");

        _collectFees(_feeCollectorParameters);

        uint rewardTokenBalanceBeforeConversion = controller.rewardToken().balanceOf(address(this));

        _executeConversion(_tokens, _inputAmounts, _minOutputs);

        uint rewardTokenBalanceAfterConversion = controller.rewardToken().balanceOf(address(this));
        uint convertedRewardTokenBalance = rewardTokenBalanceAfterConversion - rewardTokenBalanceBeforeConversion;
        uint callerIncentive = convertedRewardTokenBalance * controller.feeConversionIncentive() / 100e18;

        _sendRewardToken(msg.sender, callerIncentive);
        _transferRewardTokenToReceivers(rewardTokenBalanceAfterConversion - callerIncentive);
    }

    function _collectFees(bytes[] memory _feeCollectorParameters) private {
        IFeeCollector[] memory collectors = controller.getFeeCollectors();

        require(collectors.length == _feeCollectorParameters.length, "Must provide parameters to all known collectors");

        for(uint i = 0; i < collectors.length; i++) {
            collectors[i].collect(_feeCollectorParameters[i]);
        }
    }

    function _executeConversion(
        address[] memory _tokens,
        uint[] memory _inputAmounts,
        uint[] memory _minOutputs
    ) private {
        IBatchTokenSwapRouter router = controller.swapRouter();

        for (uint i = 0; i < _tokens.length; i++) {
            if (Helpers._isEth(_tokens[i])) {
                payable(address(router)).transfer(_inputAmounts[i]);
            } else {
                IERC20(_tokens[i]).transfer(address(router), _inputAmounts[i]);
            }
        }

        controller.swapRouter().batchSellTokens(
            _tokens,
            _inputAmounts,
            _minOutputs,
            address(controller.rewardToken())
        );
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