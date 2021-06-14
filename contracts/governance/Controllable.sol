pragma solidity ^0.8.0;

import "./Controller.sol";
// @author: https://github.com/SHA-2048

contract Controllable {

    Controller public controller;

    constructor(Controller _controller) {
        controller = _controller;
    }

    modifier whenNotPaused() {
        require(!controller.paused(), "Forbidden: System is paused");
        _;
    }

}
