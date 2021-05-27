pragma solidity ^0.8.0;

interface IHidingGameClaimContract {

    function claim(
        address _to,
        uint _earningsToDate,
        uint _nonce,
        bytes memory _signature
    ) external;

}
