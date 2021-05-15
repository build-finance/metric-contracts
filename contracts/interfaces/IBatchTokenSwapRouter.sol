// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IBatchTokenSwapRouter {

    function batchSellTokens(
        address[] memory _tokens,
        uint[] memory _supplyTokenAmounts,
        uint[] memory _minOutputs,
        address outputToken
    ) external;

}
