// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    uint public constant _initial_supply = 100000 * (10 ** 18);

    constructor() ERC20("TestToken", "TT") {
        _mint(msg.sender, _initial_supply);
    }
}
