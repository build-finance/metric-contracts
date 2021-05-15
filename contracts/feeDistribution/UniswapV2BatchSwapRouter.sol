// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol';

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IBatchTokenSwapRouter.sol";

contract UniswapV2BatchSwapRouter is IBatchTokenSwapRouter, Ownable {

    uint MAX_INT = 2**256 - 1;

    IUniswapV2Router01 public uniswapRouter;
    IERC20 public swapBridgeToken;

    function batchSellTokens(
        address[] memory _tokens,
        uint[] memory _supplyTokenAmounts,
        uint[] memory _minOutputs,
        address _outputToken
    ) external override {
        for (uint i = 0; i < _tokens.length; i++) {

            require(address(_tokens[i]) != _outputToken, "Output token must not be given in input");

            IERC20(_tokens[i]).approve(address(uniswapRouter), MAX_INT);

            address[] memory path = new address[](3);
            path[0] = address(_tokens[i]);
            path[1] = address(swapBridgeToken);
            path[2] = address(_outputToken);

            uniswapRouter.swapExactTokensForTokens(
                _supplyTokenAmounts[i],
                _minOutputs[i],
                path,
                address(msg.sender),
                block.timestamp + 1000
            );
        }
    }

}
