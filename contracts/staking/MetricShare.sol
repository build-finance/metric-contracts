// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Contract logic borrowed from sushi's SushiBar
 * open source contract
 *
 * The goal here is to share $METRIC revenues with users
 * staking their $METRIC in the contract
 *
 * Each stake mints $xMETRIC shares. These shares
 * gains in value with time as the contract receives
 * more $METRIC from trading fees.
 *
 * At leave, $xMETRIC shares will be burned to unlock
 * underlying $METRIC
 */

contract MetricShare is ERC20("MetricShare", "xMETRIC") {

    IERC20 public metric;

    constructor(IERC20 _metric) {
        metric = _metric;
    }

    function sharePrice() public view returns (uint256) {
        uint256 stakedMetric = balance();
        if (stakedMetric == 0) {
            return 1e18;
        }

        return totalSupply() * 1e18 / stakedMetric;
    }

    function balance() public view returns (uint256) {
        return metric.balanceOf(address(this));
    }

    function enter(uint256 _metricAmount) public {
        _mint(msg.sender, _shares(_metricAmount));
        metric.transferFrom(msg.sender, address(this), _metricAmount);
    }

    function leave(uint256 _metricShareAmount) public {
        metric.transfer(msg.sender, _underlying(_metricShareAmount));
        _burn(msg.sender, _metricShareAmount);
    }

    function _shares(uint256 _metricAmount) private view returns (uint256) {
        uint256 totalShares = totalSupply();
        if (totalShares == 0) {
            return _metricAmount;
        }

        uint256 totalStakedMetric = metric.balanceOf(address(this));
        return _metricAmount * totalShares / totalStakedMetric;
    }

    function _underlying(uint256 _metricShareAmount) private view returns (uint256) {
        uint256 totalShares = totalSupply();
        if (totalShares == 0) {
            return 0;
        }

        uint256 totalStakedMetric = metric.balanceOf(address(this));
        return _metricShareAmount * totalStakedMetric / totalShares;
    }
}