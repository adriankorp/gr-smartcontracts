import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('InGameTokens', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContract() {
    // create ERC20 token
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const tokenErc20 = await ethers.getContractFactory('Token');
    const tokenContract = await tokenErc20.deploy();

    // send tokens to otherAccount

    await tokenContract.transfer(otherAccount.address, 1000);

    const inGameTokensFactory = await ethers.getContractFactory('InGameTokens');
    const inGameTokensContract = await inGameTokensFactory.deploy(
      await tokenContract.getAddress(),
    );

    return { inGameTokensContract, tokenContract, owner, otherAccount };
  }

  describe('Deployment', function () {
    it('Should deploy contract', async function () {
      const { inGameTokensContract, owner } = await loadFixture(deployContract);
      expect(await inGameTokensContract.signerAddress()).to.equal(
        owner.address,
      );
    });
  });

  describe('Deposits', function () {
    it('Should revert if not approved', async function () {
      const { inGameTokensContract, otherAccount } = await loadFixture(
        deployContract,
      );

      await expect(
        inGameTokensContract.connect(otherAccount).deposit(1000),
      ).to.be.revertedWith('Token not approved for deposit');
    });

    it('Should deposit tokens', async function () {
      const { inGameTokensContract, otherAccount, tokenContract } =
        await loadFixture(deployContract);

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await inGameTokensContract.connect(otherAccount).deposit(1000);
      expect(
        await inGameTokensContract.balances(otherAccount.address),
      ).to.equal(1000);
    });

    it("Should emit 'Deposit' event", async function () {
      const { inGameTokensContract, otherAccount, tokenContract } =
        await loadFixture(deployContract);

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await expect(
        inGameTokensContract.connect(otherAccount).deposit(1000),
      ).to.emit(inGameTokensContract, 'Deposit');
    });

    it('Should revert if not enough tokens', async function () {
      const { inGameTokensContract, otherAccount, tokenContract } =
        await loadFixture(deployContract);

      await tokenContract
        .connect(otherAccount)
        .approve(await inGameTokensContract.getAddress(), 1000);

      await expect(
        inGameTokensContract.connect(otherAccount).deposit(1001),
      ).to.be.revertedWith('Insufficient token balance');
    });
  });
});
