pragma solidity ^0.8.0;

import "../interfaces/ISwapRouter.sol";
import "./RevenueShare.sol";
import "../libraries/Constants.sol";

contract RevenueShareVault is RevenueShare, Constants {

    uint public maxSlippage;
    ISwapRouter public swapRouter;

    constructor(
        IERC20 _underlying,
        string memory _name,
        string memory _symbol,
        ISwapRouter _swapRouter,
        uint _maxSlippage
    ) RevenueShare(IERC20(_underlying), _name, _symbol) {
        swapRouter = _swapRouter;
        maxSlippage = _maxSlippage;
    }

    function compound(IERC20 _token) external {
        uint balance = _token.balanceOf(address(this));

        if (_token.allowance(address(this), address(swapRouter)) < balance) {
            _token.approve(address(swapRouter), MAX_INT);
        }

        swapRouter.compound(address(_token), balance, maxSlippage);
    }

}
