const { expect } = require("chai");
const { ethers } = require("hardhat");
// const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("XaveMarket Prices + Override ",  function () {

    let market;
    let XVC;
    let USDT;
    let wETH;
    let testNFT1;
    let testNFT2;
    let owner;
    let addr1;
    let tokenIds = new Array();
    const tokenIdsLen = 500;

    before(async function () {

        [owner, addr1] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TokenERC20");

        XVC = await Token.deploy("XVC coin", "XVC", 1000000);
        await XVC.deployed();
        USDT = await Token.deploy("USDT coin", "USDT", 5000000);
        await USDT.deployed();
        wETH = await Token.deploy("wETH coin", "wETH", 3000000);
        await wETH.deployed();

        const TokenNFT = await ethers.getContractFactory("NFT");
        testNFT1 = await TokenNFT.deploy();
        await testNFT1.deployed();
        testNFT2 = await TokenNFT.deploy();
        await testNFT2.deployed();
              
        const validCurrencies = [XVC.address, USDT.address, wETH.address];
        const Market = await ethers.getContractFactory("XaveMarket");
        market = await Market.deploy(validCurrencies);
        await market.deployed();

        const role = await market.NFT_ADMIN();
        await market.grantRole(role, owner.address);

        await market.addNft(testNFT2.address);
        await market.addNft(testNFT1.address);
        await market.addDefaultPrice(testNFT1.address, [XVC.address, USDT.address, wETH.address], [100, 30, 2]);

        for (let i = 0; i < tokenIdsLen; i++) {
            await testNFT1.mintItem(owner.address);
            tokenIds[i] = i+1;
        }

    });

    describe("Add to market",  function () {
        
        it("Add to market " + tokenIdsLen + " minted tokens at testNFT1", async function () {
            await market.addToMarket(testNFT1.address, tokenIds);
            const litedAmt = await market.listedTokensLength(testNFT1.address);
            expect(await market.listedTokensLength(testNFT1.address)).to.eq(tokenIdsLen);
        });

        it("Check default prices on testNFT1: XVC=100; USDT=30: wETH=2  (testing TokenId(150))", async function () {
            const tokenId_150 = tokenIds[150];
            const tokenId_150Prices = await market.getPrices(testNFT1.address, tokenId_150);
            expect(tokenId_150Prices.amounts[0]).to.eq(100);
            expect(tokenId_150Prices.amounts[1]).to.eq(30);
            expect(tokenId_150Prices.amounts[2]).to.eq(2);
        });
    });

    describe("Price override",  function () {
        it("Override XVC price of 100 tokens (ids 100-199): 85 XVC", async function () {
            let tokenIds100_200 = tokenIds.slice(99,199);
            let amounts100_200 = (new Array(100)).fill(85);
            await market.overridePrice(testNFT1.address, XVC.address, tokenIds100_200,amounts100_200);
        });

        it("Check XVC prices: id_150=85 id_99=100 id_100=85 id_200=100 id_199=85", async function () {
            expect((await market.getPrices(testNFT1.address, 150)).amounts[0]).to.eq(85);
            expect((await market.getPrices(testNFT1.address, 99)).amounts[0]).to.eq(100);
            expect((await market.getPrices(testNFT1.address, 100)).amounts[0]).to.eq(85);
            expect((await market.getPrices(testNFT1.address, 200)).amounts[0]).to.eq(100);
            expect((await market.getPrices(testNFT1.address, 199)).amounts[0]).to.eq(85);
        });

        it("Should revert with TokenIdHasNoOverridenPrice(200): removeOverridePrice of 100 tokens (ids 110-210)", async function () {
            const tokenIds100_200 = tokenIds.slice(109, 209);
            await expect(market.removeOverridePrice(testNFT1.address, XVC.address, tokenIds100_200))
                .to.be.revertedWithCustomError(market, "TokenIdHasNoOverridenPrice")
                .withArgs(200);
        });

        it("Remove overriden XVC price of 50 tokens (ids 140-189)", async function () {
            const tokenIdsRem = tokenIds.slice(139,189);
            await market.removeOverridePrice(testNFT1.address, XVC.address, tokenIdsRem);
        });

        it("Check XVC prices: id_139=85 id_140=100 id_189=100 id_190=85", async function () {
            expect((await market.getPrices(testNFT1.address, 139)).amounts[0]).to.eq(85);
            expect((await market.getPrices(testNFT1.address, 140)).amounts[0]).to.eq(100);
            expect((await market.getPrices(testNFT1.address, 189)).amounts[0]).to.eq(100);
            expect((await market.getPrices(testNFT1.address, 190)).amounts[0]).to.eq(85);
        });

        it("Remove all tokens from market. Emit AddedOrRemovedFromMarket. (DOES NOT remove overriden prices)", async function () {
            await expect(market.removeFromMarket(testNFT1.address, tokenIds)).to.emit(market, "AddedOrRemovedFromMarket").withArgs(false, testNFT1.address, tokenIds);
        });

        it("Add all tokens to market", async function () {
            await market.addToMarket(testNFT1.address, tokenIds);
        });

        it("Check XVC prices. Overriden should still be there: id_139=85 id_140=100 id_189=100 id_190=85", async function () {
            expect((await market.getPrices(testNFT1.address, 139)).amounts[0]).to.eq(85);
            expect((await market.getPrices(testNFT1.address, 140)).amounts[0]).to.eq(100);
            expect((await market.getPrices(testNFT1.address, 189)).amounts[0]).to.eq(100);
            expect((await market.getPrices(testNFT1.address, 190)).amounts[0]).to.eq(85);
        });

    });
 
});