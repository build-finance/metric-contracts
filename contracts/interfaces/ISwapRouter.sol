// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ISwapRouter {

    function weth() external returns(address);

    function swapExactTokensForTokens(
        address _token,
        uint _supplyTokenAmount,
        uint _minOutput,
        address _outputToken
    ) external;

    function compound(
        address token,
        uint balance,
        uint maxSlippage
    ) external;

}
