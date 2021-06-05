pragma solidity ^0.8.0;

import "../interfaces/IFeeCollector.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../governance/Controller.sol";

contract ZeroXProtocolMarketMakerFeeCollector is IFeeCollector, Ownable {

    address public feeRecipient;
    IERC20 public weth;

    constructor(IERC20 _weth, address _feeRecipient) {
        weth = _weth;
        feeRecipient = _feeRecipient;
    }

    function collect(bytes memory _parameters) override external {
        uint wethBalance = weth.balanceOf(address(this));
        weth.transfer(feeRecipient, wethBalance);
    }

    // TODO implement pool operating functions

}
