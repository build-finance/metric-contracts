// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Structures {

    struct RewardReceiver {
        address receiver;
        uint share;
    }

    struct FeeCollectorCall {
        bool call;
        bytes parameters;
    }

    struct HidingGameClaimParameters {
        address to;
        uint earningsToDate;
        uint nonce;
        bytes signature;
    }

}
