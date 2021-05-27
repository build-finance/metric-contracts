pragma solidity ^0.8.0;

import "../interfaces/IFeeCollector.sol";
import "../interfaces/IHidingGameClaimContract.sol";

contract HidingGameRewardsCollector is IFeeCollector {

    struct HidingGameClaimParameters {
        address to;
        uint earningsToDate;
        uint nonce;
        bytes signature;
    }

    IHidingGameClaimContract hidingGameClaimContract;

    constructor(IHidingGameClaimContract _hidingGameClaimContract) {
        hidingGameClaimContract = _hidingGameClaimContract;
    }

    function collect(bytes memory _parameters) override external {

        HidingGameClaimParameters memory params = abi.decode(_parameters, (HidingGameClaimParameters));

        hidingGameClaimContract.claim(
            params.to,
            params.earningsToDate,
            params.nonce,
            params.signature
        );
    }

}
