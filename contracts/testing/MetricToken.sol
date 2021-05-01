// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MetricToken is ERC20("Metric.exchange", "METRIC") {

    constructor () {}

    function mint(uint256 amount) public returns (bool) {
        _mint(msg.sender, amount);
        return true;
    }

}