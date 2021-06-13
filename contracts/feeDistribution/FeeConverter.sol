// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";

import "../libraries/Constants.sol";

import "../governance/Controller.sol";
import "../governance/Controllable.sol";

contract FeeConverter is Multicall, Controllable, Constants {

    event FeeDistribution(
        address recipient,
        uint amount
    );

    constructor(Controller _controller) Controllable(_controller) {}

    receive() external payable {}

    function convertToken(
        address _token,
        uint _inputAmount,
        uint _minOutput,
        address _incentiveCollector
    ) external whenNotPaused {
        uint rewardTokenBalanceBeforeConversion = controller.rewardToken().balanceOf(address(this));
        _executeConversion(_token, _inputAmount, _minOutput);
        uint rewardTokenBalanceAfterConversion = controller.rewardToken().balanceOf(address(this));

        uint convertedRewardTokenBalance = rewardTokenBalanceAfterConversion - rewardTokenBalanceBeforeConversion;
        uint callerIncentive = convertedRewardTokenBalance * controller.feeConversionIncentive() / 100e18;

        _sendRewardToken(_incentiveCollector, callerIncentive);
    }

    function wrapETH() external whenNotPaused {
        uint balance = address(this).balance;
        if (balance > 0) {
            IWETH(controller.swapRouter().weth()).deposit{value : balance}();
        }
    }

    function transferRewardTokenToReceivers() external whenNotPaused {

        Controller.RewardReceiver[] memory receivers = controller.getRewardReceivers();

        uint totalAmount = controller.rewardToken().balanceOf(address(this));
        uint remaining = totalAmount;
        uint nbReceivers = receivers.length;

        for(uint i = 0; i < nbReceivers - 1; i++) {
            uint receiverShare = totalAmount * receivers[i].share / 100e18;
            _sendRewardToken(receivers[i].receiver, receiverShare);

            remaining -= receiverShare;
        }
        _sendRewardToken(receivers[nbReceivers - 1].receiver, remaining);
    }

    function _executeConversion(
        address _token,
        uint _inputAmount,
        uint _minOutput
    ) internal {
        ISwapRouter router = controller.swapRouter();

        if (IERC20(_token).allowance(address(this), address(router)) < MAX_INT) {
            IERC20(_token).approve(address(router), MAX_INT);
        }

        controller.swapRouter().swapExactTokensForTokens(
            _token,
            _inputAmount,
            _minOutput,
            address(controller.rewardToken())
        );
    }

    function _sendRewardToken(
        address _recipient,
        uint _amount
    ) internal {
        controller.rewardToken().transfer(_recipient, _amount);
        emit FeeDistribution(_recipient, _amount);
    }

}