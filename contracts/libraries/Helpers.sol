// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Helpers {

    function _hasEth(address[] memory _tokens) public pure returns(bool) {
        for (uint16 i = 0; i < _tokens.length; i++) {
            if (_isEth(_tokens[i])) return true;
        }
        return false;
    }

    function _isEth(address _token) public pure returns(bool) {
        return _token == address(0);
    }

}
