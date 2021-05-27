// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IFeeCollector {

    function collect(bytes memory _parameters) external;

}