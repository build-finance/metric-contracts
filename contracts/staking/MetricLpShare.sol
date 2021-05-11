// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Contract logic inspired by sushi's SushiBar
 * open source contract
 *
 * The goal here is to share $METRIC revenues with users
 * staking their $METRIC Lp tokens in the contract
 *
 * Each stake mints $xlMETRIC shares. These shares
 * gains earn $METRIC with time as the contract receives
 * more $METRIC from trading fees.
 *
 * At leave, $xlMETRIC shares will be burned to unlock
 * underlying $METRIC Lp tokens + earned $METRIC
 */

contract MetricLpShare is ERC20 {

    IERC20 public metric;
    IERC20 public lpMetric;

    mapping(address => uint256) stakedMetricLpAmount;

    constructor(
        IERC20 _metric,
        IERC20 _lpMetric,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        metric = _metric;
        lpMetric = _lpMetric;
    }

    function sharePrice() public view returns (uint256) {
        uint256 availableReward = balance();
        uint256 stakedLps = lpMetric.balanceOf(address(this));
        if (stakedLps == 0) {
            return 0;
        }

        return availableReward * 1e18 / stakedLps;
    }

    function balance() public view returns (uint256) {
        return metric.balanceOf(address(this));
    }

    function enter(uint256 _metricLpAmount) public {
        stakedMetricLpAmount[msg.sender] += _metricLpAmount;
        _mint(msg.sender, _shares(_metricLpAmount));
        lpMetric.transferFrom(msg.sender, address(this), _metricLpAmount);
    }

    function leave(uint256 _metricLpShareAmount) public {
        uint256 maxUnderlying = _underlying(stakedMetricLpAmount[msg.sender]);
        uint256 underlying = _underlying(_metricLpShareAmount);

        metric.transfer(msg.sender, _underlyingMetric(underlying, maxUnderlying));

        lpMetric.transfer(msg.sender, _metricLpShareAmount);
        _burn(msg.sender, _metricLpShareAmount);
        stakedMetricLpAmount[msg.sender] -= _underlyingLpMetric(underlying, maxUnderlying);
    }

    function _shares(uint256 _lpMetricAmount) private view returns (uint256) {
        uint256 totalShares = totalSupply();
        if (totalShares == 0) {
            return _lpMetricAmount;
        }

        return _lpMetricAmount * totalShares / _virtualTotalMetric();
    }

    function _underlyingMetric(uint256 underlying, uint256 maxUnderlying) private view returns (uint256) {
        if (maxUnderlying == 0) {
            return 0;
        }
        uint256 maxUnderlyingMetric = maxUnderlying - stakedMetricLpAmount[msg.sender];
        return maxUnderlyingMetric * underlying / maxUnderlying;
    }

    function _underlyingLpMetric(uint256 underlying, uint256 maxUnderlying) private view returns (uint256) {
        return stakedMetricLpAmount[msg.sender] * underlying / maxUnderlying;
    }

    function _underlying(uint256 _metricLpShareAmount) private view returns (uint256) {
        uint256 totalShares = totalSupply();
        if (totalShares == 0) {
            return 0;
        }

        return _metricLpShareAmount * _virtualTotalMetric() / totalShares;
    }

    function _virtualTotalMetric() private view returns (uint256) {
        return lpMetric.balanceOf(address(this)) + metric.balanceOf(address(this));
    }

}