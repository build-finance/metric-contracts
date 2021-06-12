// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/ISwapRouter.sol";
import "../libraries/Constants.sol";

contract UniswapV2SwapRouter is ISwapRouter, Constants {

    IUniswapV2Router02 public uniswapRouter;

    constructor(IUniswapV2Router02 _uniswapRouter) {
        uniswapRouter = _uniswapRouter;
    }

    function weth() external view override returns(address) {
        return uniswapRouter.WETH();
    }

    function swapExactTokensForTokens(
        address _token,
        uint _supplyTokenAmount,
        uint _minOutput,
        address _outputToken
    ) external override {
        require(_token != _outputToken, "Output token must not be given in input");

        IERC20(_token).transferFrom(msg.sender, address(this), _supplyTokenAmount);
        if (IERC20(_token).allowance(address(this), address(uniswapRouter)) < _supplyTokenAmount) {
            IERC20(_token).approve(address(uniswapRouter), MAX_INT);
        }

        uniswapRouter.swapExactTokensForTokens(
            _supplyTokenAmount,
            _minOutput,
            _path(_token, _outputToken),
            address(msg.sender),
            block.timestamp + 1000
        );
    }

    function compound(
        address token,
        uint balance,
        uint maxSlippage
    ) external override {

    }

    function _path(address _token, address _outputToken) internal view returns (address[] memory) {

        if (_token == uniswapRouter.WETH()) {

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
