// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol';

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FeeConverter is Ownable {

    uint MAX_INT = 2**256 - 1;

    IUniswapV2Router01 public uniswapRouter;
    IERC20 public metric;
    IERC20 public weth;

    address[] public metricReceivers;
    uint[] public metricReceiversPercentage;

    uint public callIncentive;

    event FeeDistribution(address recipient, uint amount);

    constructor(
        IUniswapV2Router01 _uniswapRouter,
        IERC20 _metric,
        IERC20 _weth,
        address[] memory _metricReceivers,
        uint[] memory _metricReceiverPercentage,
        uint _callIncentive
    ) {
        uniswapRouter = _uniswapRouter;
        callIncentive = _callIncentive;
        metric = _metric;
        weth = _weth;
        for(uint i = 0; i < _metricReceivers.length; i++) {
            metricReceivers.push(_metricReceivers[i]);
            metricReceiversPercentage.push(_metricReceiverPercentage[i]);
        }
    }

    function sellForMetric(
        address[] memory _tokens,
        uint[] memory _supplyTokenAmounts,
        uint[] memory _minOutputs
    ) public {

        for (uint i = 0; i < _tokens.length; i++) {
            IERC20(_tokens[i]).approve(address(uniswapRouter), MAX_INT);

            address[] memory path = new address[](3);
            path[0] = address(_tokens[i]);
            path[1] = address(weth);
            path[2] = address(address(metric));

            uniswapRouter.swapExactTokensForTokens(
                _supplyTokenAmounts[i],
                _minOutputs[i],
                path,
                address(this),
                block.timestamp + 1000
            );
        }

        uint metricBalance = metric.balanceOf(address(this));

        uint callerIncentive = metricBalance * callIncentive / 100e18;
        metric.transfer(msg.sender, callerIncentive);

        _transferMetricToReceivers(metricBalance - callerIncentive);
    }

    function setStakingRewards(
        address[] memory _metricReceivers,
        uint[] memory _metricReceiverPercentage
    ) onlyOwner public {

        delete metricReceivers;
        delete metricReceiversPercentage;

        for(uint i = 0; i < _metricReceivers.length; i++) {
            metricReceivers.push(_metricReceivers[i]);
            metricReceiversPercentage.push(_metricReceiverPercentage[i]);
        }
    }

    function setCallIncentive(uint _value) onlyOwner public {
        callIncentive = _value;
    }

    function _transferMetricToReceivers(uint _amount) private {
        uint remaining = _amount;
        uint nbReceivers = metricReceivers.length;

        for(uint i = 0; i < nbReceivers - 1; i++) {
            uint receiverShare = _amount * metricReceiversPercentage[i] / 100e18;
            _sendMetric(metricReceivers[i], receiverShare);

            remaining -= receiverShare;
        }
        _sendMetric(metricReceivers[nbReceivers - 1], remaining);
    }

    function _sendMetric(address _recipient, uint _amount) private {
        metric.transfer(_recipient, _amount);
        emit FeeDistribution(_recipient, _amount);
    }

}