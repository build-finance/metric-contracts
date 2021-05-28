pragma solidity ^0.8.0;

import "../interfaces/IFeeCollector.sol";
import "../interfaces/IHidingGameClaimContract.sol";
import "../libraries/Structures.sol";

contract HidingGameRewardsCollector is IFeeCollector {

    IHidingGameClaimContract hidingGameClaimContract;

    constructor(IHidingGameClaimContract _hidingGameClaimContract) {
        hidingGameClaimContract = _hidingGameClaimContract;
    }

    function collect(bytes memory _parameters) override external {

        Structures.HidingGameClaimParameters memory params =
            abi.decode(_parameters, (Structures.HidingGameClaimParameters));

        hidingGameClaimContract.claim(
            params.to,
            params.earningsToDate,
            params.nonce,
            params.signature
        );
    }

}
