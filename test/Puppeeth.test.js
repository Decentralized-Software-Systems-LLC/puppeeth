const { expect } = require("chai");
const { ethers } = require("hardhat");
const { validIds: validIdsArray, invalidIds: invalidIdsArray, algorithm } = require("./testingIds.js");

describe("Token ID Algorithm", function () {

  it("should have the correct total of IDs", async function () {
    expect(validIdsArray.length).to.equal(3125);
    expect(invalidIdsArray.length).to.equal(41320);
  });

  it("should return true for valid IDs", async function () {
    for (let i in validIdsArray) {
      expect(algorithm(validIdsArray[i])).to.be.true;
    }
  });

  it("should return false for invalid IDs", async function () {
    for (let i in invalidIdsArray) {
      expect(algorithm(invalidIdsArray[i])).to.be.false;
    }
  });
});

describe("Puppeeth", function () {
  // Declare common variables
  let owner, secondAddress, PuppeethContract, Puppeeth;
  let tokenUri = (id) => `ipfs://QmXmjY1bFMuH5fCGbZ8CHd8fFWzJRZxTKQo7aievy7LUou/${id}.json`;

  before(async function () {

    // Get signers of local chain
    [owner, secondAddress] = await ethers.getSigners();

    // Deploy contract instance
    PuppeethContract = await ethers.getContractFactory("Puppeeth");
    Puppeeth = await PuppeethContract.deploy();
    await Puppeeth.deployed();
  });

  it("should return true for valid IDs", async function () {
    let validIds = [
      11111,
      22222,
      12345
    ]
    for (let i in validIds) {
      expect(await Puppeeth.validId(validIds[i])).to.be.true;
    }
  });

  it("should return false for invalid IDs", async function () {
    let invalidIds = [
      10,    // Small
      11110, // Lower bound
      55556, // Upper bound
      11116, // Ones
      11120, // Ones
      11161, // Tens
      11201, // Tens
      11611, // Hundreds
      12011, // Hundreds
      16111, // Thousands
      20111, // Thousands
      20000, // Zeros
    ]
    for (let i in invalidIds) {
      expect(await Puppeeth.validId(invalidIds[i])).to.be.false;
    }
  });

  it("should error for large numbers beyond 16 bits", async function () {
    try {
      await Puppeeth.validId(20000000000)
    } catch (e) {
      expect(e.reason).to.contain("value out-of-bounds");
    }
  });

  it("should mint for the owner", async function () {
    await Puppeeth.ownerMint(11112);
    expect(await Puppeeth.tokenURI(11112)).to.equal(tokenUri(11112));
  });

  it("should not mint with a bad ID", async function () {
    let msg = "InvalidTokenID";
    let badIds = [
      11110, // Lower bound
    ]
    for (let i in badIds) {
      await expect(
        Puppeeth.ownerMint(badIds[i])
      ).to.be.revertedWith(msg);
    }
  });

  it("should not mint duplicates", async function () {
    expect(await Puppeeth.tokenURI(11111)).to.equal(tokenUri(11111));
    await expect(
      Puppeeth.ownerMint(11111)
    ).to.be.revertedWith("token already minted");
  });

  it("should transfer", async function () {
    await Puppeeth.transferFrom(owner.address, secondAddress.address, 11111);
    expect(await Puppeeth.ownerOf(11111)).to.equal(secondAddress.address);
  });

  it("should not transfer if not owner or approved", async function () {
    await expect(
      Puppeeth.transferFrom(owner.address, secondAddress.address, 11111)
    ).to.be.revertedWith("transfer caller is not owner nor approved");
  });

  it("should mint for the public", async function () {
    let payment = ethers.utils.parseEther(".02");
    let overrides = {
      value: payment
    };
    let oldBalance = await secondAddress.getBalance();
    await Puppeeth.connect(secondAddress).publicMint(44332, overrides);
    expect(await Puppeeth.tokenURI(44332)).to.equal(tokenUri(44332));
    expect(await Puppeeth.ownerOf(44332)).to.equal(secondAddress.address);
    let newBalance = await secondAddress.getBalance();
    expect(oldBalance.sub(newBalance).sub(payment).lt(payment)).to.be.true;
  });

  it("should withdraw to owner", async function () {
    let oldBalance = await owner.getBalance();
    await Puppeeth.withdraw();
    let newBalance = await owner.getBalance();
    expect(newBalance.sub(oldBalance) > 0).to.be.true;
  });

  it("should not withdraw if not owner", async function () {
    await expect(
      Puppeeth.connect(secondAddress).withdraw()
    ).to.be.revertedWith("caller is not the owner");
  });

  it("should return minted tokens", async function () {
    let mintedTokens = await Puppeeth.mintedTokens();
    expect(mintedTokens).to.eql([11111,22222,33333,44444,55555,11112,44332]);
  });
});
