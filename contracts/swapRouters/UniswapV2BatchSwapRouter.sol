// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IBatchTokenSwapRouter.sol";
import "../libraries/Helpers.sol";

contract UniswapV2BatchSwapRouter is IBatchTokenSwapRouter, Helpers {

    uint MAX_INT = 2**256 - 1;

    IUniswapV2Router02 public uniswapRouter;

    constructor(
        IUniswapV2Router02 _uniswapRouter
    ) {
        uniswapRouter = _uniswapRouter;
    }

    function batchSellTokens(
        address[] memory _tokens,
        uint[] memory _supplyTokenAmounts,
        uint[] memory _minOutputs,
        address _outputToken
    ) external payable override {

        require(msg.value == 0 || _hasEth(_tokens), "Call contains ETH value but no ETH conversion in parameters");

        for (uint i = 0; i < _tokens.length; i++) {

            require(_tokens[i] != _outputToken, "Output token must not be given in input");

            if (_isEth(_tokens[i])) {

                require(msg.value == _supplyTokenAmounts[i], "ETH amount to convert does not match transaction value");

                uniswapRouter.swapExactETHForTokens{ value: _supplyTokenAmounts[i] }(
                    _minOutputs[i],
                    _path(_tokens[i], _outputToken),
                    address(msg.sender),
                    block.timestamp + 1000
                );

            } else {

                IERC20(_tokens[i]).transferFrom(msg.sender, address(this), _supplyTokenAmounts[i]);
                if (IERC20(_tokens[i]).allowance(address(this), address(uniswapRouter)) < _supplyTokenAmounts[i]) {
                    IERC20(_tokens[i]).approve(address(uniswapRouter), MAX_INT);
                }

                uniswapRouter.swapExactTokensForTokens(
                    _supplyTokenAmounts[i],
                    _minOutputs[i],
                    _path(_tokens[i], _outputToken),
                    address(msg.sender),
                    block.timestamp + 1000
                );

            }
        }
    }

    function _path(address _token, address _outputToken) internal view returns (address[] memory) {

        if (_isEth(_token) || _token == uniswapRouter.WETH()) {

            address[] memory path = new address[](2);
            path[0] = uniswapRouter.WETH();
            path[1] = _outputToken;

            return path;

        } else {

            address[] memory path = new address[](3);
            path[0] = _token;
            path[1] = uniswapRouter.WETH();
            path[2] = _outputToken;

            return path;
        }
    }

}
