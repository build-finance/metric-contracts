// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IFeeCollector.sol";
import "../interfaces/IRevenueShareReceiver.sol";
import "../libraries/Structures.sol";
import "../libraries/Helpers.sol";
import "../governance/Controller.sol";
import "../libraries/Structures.sol";

contract FeeConverter is Helpers {

    uint MAX_INT = 2**256 - 1;

    Controller public controller;

    event FeeDistribution(address recipient, uint amount);

    constructor(Controller _controller) {
        controller = _controller;
    }

    function convertTokens(
        address[] memory _tokens,
        uint[] memory _inputAmounts,
        uint[] memory _minOutputs,
        Structures.FeeCollectorCall[] memory _feeCollectorParameters
    ) external whenNotPaused {

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

    function _collectFees(Structures.FeeCollectorCall[] memory _feeCollectorParameters) private {
        IFeeCollector[] memory collectors = controller.getFeeCollectors();

        require(collectors.length == _feeCollectorParameters.length, "Must provide parameters to all known collectors");

        for(uint i = 0; i < collectors.length; i++) {
            if (_feeCollectorParameters[i].call) {
                collectors[i].collect(_feeCollectorParameters[i].parameters);
            }
        }
    }

    function _executeConversion(
        address[] memory _tokens,
        uint[] memory _inputAmounts,
        uint[] memory _minOutputs
    ) private {
        uint ethToSend = 0;
        IBatchTokenSwapRouter router = controller.swapRouter();

        for (uint i = 0; i < _tokens.length; i++) {
            if (_isEth(_tokens[i])) {
                ethToSend += _inputAmounts[i];
            } else if (IERC20(_tokens[i]).allowance(address(this), address(router)) < _inputAmounts[i]) {
                IERC20(_tokens[i]).approve(address(router), MAX_INT);
            }
        }

        controller.swapRouter().batchSellTokens{ value: ethToSend }(
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
            _sendReceiverShare(receivers[i], receiverShare);

            remaining -= receiverShare;
        }
        _sendReceiverShare(receivers[nbReceivers - 1], remaining);
    }

    function _sendReceiverShare(Structures.RewardReceiver memory _recipient, uint _amount) private {
        _sendRewardToken(_recipient.receiver, _amount);

        if (_recipient.call == true) {
            IRevenueShareReceiver(_recipient.receiver).processRevenue();
        }
    }

    function _sendRewardToken(address _recipient, uint _amount) private {
        controller.rewardToken().transfer(_recipient, _amount);
        emit FeeDistribution(_recipient, _amount);
    }

    modifier whenNotPaused() {
        require(!controller.paused(), "Forbidden: System is paused");
        _;
    }

    receive() external payable {}

}