import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from "chai";
import { ethers } from "hardhat";

describe("InGameTokens", () => {
  async function deployContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const tokenErc20 = await ethers.getContractFactory("Token");
    const tokenContract = await tokenErc20.deploy();

    // send tokens to otherAccount

    await tokenContract.transfer(otherAccount.address, 1000);

    const inGameTokensFactory = await ethers.getContractFactory("InGameTokens");
    const inGameTokensContract = await inGameTokensFactory.deploy(
      await tokenContract.getAddress()
    );

    return { inGameTokensContract, tokenContract, owner, otherAccount };
  }

  describe("Deployment", () => {
    it("Should deploy contract", async () => {
      const { inGameTokensContract, owner } = await loadFixture(deployContract);
      expect(await inGameTokensContract.signerAddress()).to.equal(
        owner.address
      );
    });
  });

  describe("Deposits", () => {
    it("Should revert if not approved", async () => {
      const { inGameTokensContract, otherAccount } = await loadFixture(
        deployContract
      );

      await expect(
        inGameTokensContract.connect(otherAccount).deposit(1000)
      ).to.be.revertedWith("Token not approved for deposit");
    });

    it("Should deposit tokens", async () => {
      const { inGameTokensContract, otherAccount, tokenContract } =
        await loadFixture(deployContract);

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await inGameTokensContract.connect(otherAccount).deposit(1000);
      expect(
        await inGameTokensContract.balances(otherAccount.address)
      ).to.equal(1000);
    });

    it("Should emit 'Deposit' event", async () => {
      const { inGameTokensContract, otherAccount, tokenContract } =
        await loadFixture(deployContract);

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await expect(
        inGameTokensContract.connect(otherAccount).deposit(1000)
      ).to.emit(inGameTokensContract, "Deposit");
    });

    it("Should revert if not enough tokens", async () => {
      const { inGameTokensContract, otherAccount, tokenContract } =
        await loadFixture(deployContract);

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await expect(
        inGameTokensContract.connect(otherAccount).deposit(1001)
      ).to.be.revertedWith("Insufficient token balance");
    });
  });

  describe("Withdrawals", () => {
    it("Should revert if not enough tokens to withdraw ", async () => {
      const { inGameTokensContract, otherAccount, owner } = await loadFixture(
        deployContract
      );

      // owner signature message to sign - otherAccount address and 1000 tokens
      const message = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [otherAccount.address, 1000]
      );

      // sign message with owner account
      const signature = await owner.signMessage(message);

      await expect(
        inGameTokensContract.connect(otherAccount).withdraw(1000, signature)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should withdraw tokens", async () => {
      const { inGameTokensContract, otherAccount, tokenContract, owner } =
        await loadFixture(deployContract);

      // owner signature message to sign - otherAccount address and 1000 tokens
      const message = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [otherAccount.address, 1000]
      );

      // sign message with owner account
      const signature = await owner.signMessage(ethers.getBytes(message));

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await inGameTokensContract.connect(otherAccount).deposit(1000);

      await inGameTokensContract
        .connect(otherAccount)
        .withdraw(1000, signature);

      expect(
        await inGameTokensContract.balances(otherAccount.address)
      ).to.equal(0);
      expect(await tokenContract.balanceOf(otherAccount.address)).to.equal(
        1000
      );
    });

    it("Should withdraw 500 tokens", async () => {
      const { inGameTokensContract, otherAccount, tokenContract, owner } =
        await loadFixture(deployContract);

      // owner signature message to sign - otherAccount address and 1000 tokens
      const message = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [otherAccount.address, 500]
      );

      // sign message with owner account
      const signature = await owner.signMessage(ethers.getBytes(message));

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await inGameTokensContract.connect(otherAccount).deposit(1000);

      await inGameTokensContract.connect(otherAccount).withdraw(500, signature);

      expect(
        await inGameTokensContract.balances(otherAccount.address)
      ).to.equal(500);
      expect(await tokenContract.balanceOf(otherAccount.address)).to.equal(500);
    });

    it("Should emit 'Withdrawal' event", async () => {
      const { inGameTokensContract, otherAccount, tokenContract, owner } =
        await loadFixture(deployContract);

      // owner signature message to sign - otherAccount address and 1000 tokens
      const message = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [otherAccount.address, 1000]
      );

      // sign message with owner account
      const signature = await owner.signMessage(ethers.getBytes(message));

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await inGameTokensContract.connect(otherAccount).deposit(1000);

      await expect(
        inGameTokensContract.connect(otherAccount).withdraw(1000, signature)
      ).to.emit(inGameTokensContract, "Withdraw");
    });

    it("Should revert if signature is invalid", async () => {
      const { inGameTokensContract, otherAccount, tokenContract } =
        await loadFixture(deployContract);

      // owner signature message to sign - otherAccount address and 1000 tokens
      const message = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [otherAccount.address, 1000]
      );

      // sign message with otherAccount account
      const signature = await otherAccount.signMessage(message);

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await inGameTokensContract.connect(otherAccount).deposit(1000);

      await expect(
        inGameTokensContract.connect(otherAccount).withdraw(1000, signature)
      ).to.be.revertedWith("Invalid signature");
    });
  });

  describe("Transfer something to contract", () => {
    it("Should revert if ETH is sent to contract", async () => {
      const { inGameTokensContract, otherAccount } = await loadFixture(
        deployContract
      );

      await expect(
        otherAccount.sendTransaction({
          to: await inGameTokensContract.getAddress(),
          value: 1000,
        })
      ).to.be.revertedWith("Invalid transaction");
    });
  });

  describe("Set signer address", () => {
    it("Should revert if not owner", async () => {
      const { inGameTokensContract, otherAccount } = await loadFixture(
        deployContract
      );

      await expect(
        inGameTokensContract
          .connect(otherAccount)
          .setSignerAddress(otherAccount.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should set signer address", async () => {
      const { inGameTokensContract, otherAccount } = await loadFixture(
        deployContract
      );

      await inGameTokensContract.setSignerAddress(otherAccount.address);

      expect(await inGameTokensContract.signerAddress()).to.equal(
        otherAccount.address
      );
    });
  });
});
