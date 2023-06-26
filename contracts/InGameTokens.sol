// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

//import "hardhat/console.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Uncomment this line to use console.log

//import "hardhat/console.sol";

contract InGameTokens is Ownable {
    using ECDSA for bytes32;

    address public tokenAddress;
    address public signerAddress;
    IERC20 public token;

    mapping(address => uint256) public balances;

    event Deposit(address indexed account, uint256 amount);
    event Withdraw(address indexed account, uint256 amount);

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
        token = IERC20(tokenAddress);
        signerAddress = msg.sender;
    }

    fallback() external payable {
        revert("Invalid transaction");
    }

    receive() external payable {
        revert("Invalid transaction");
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");

        require(
            token.balanceOf(msg.sender) >= amount,
            "Insufficient token balance"
        );
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Token not approved for deposit"
        );

        balances[msg.sender] += amount;
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount, bytes calldata signature) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(
            validateSignature(msg.sender, amount, signature),
            "Invalid signature"
        );

        balances[msg.sender] -= amount;

        require(token.transfer(msg.sender, amount), "Token transfer failed");

        emit Withdraw(msg.sender, amount);
    }



    function validateSignature(
        address signer,
        uint256 amount,
        bytes memory signature
    ) private view returns (bool) {
        bytes32 message = keccak256(abi.encodePacked(signer, amount));
        bytes32 hash = message.toEthSignedMessageHash();
        address recoveredSigner = hash.recover(signature);
        return recoveredSigner == signerAddress;
    }

    function setSignerAddress(address _signerAddress) external onlyOwner {
        signerAddress = _signerAddress;
    }

    function updateUserBalances(address[] calldata accounts, uint256[] calldata amounts) external onlyOwner {
        require(accounts.length == amounts.length, "Invalid input");
        for (uint256 i = 0; i < accounts.length; i++) {
            balances[accounts[i]] = amounts[i];
        }
    }
}
