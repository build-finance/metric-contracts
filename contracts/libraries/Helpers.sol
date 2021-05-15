// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Helpers {

    function _isEth(address token) public pure returns(bool) {
        return token == address(0);
    }

}
