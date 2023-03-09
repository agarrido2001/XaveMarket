const { expect, assert } = require("chai");
const { ethers } = require("hardhat");


describe("XaveMarket Gas Review (to enable gas reporter edit .env file => REPORT_GAS=true)", function () {

    let market;
    let XVC;
    let USDT;
    let wETH;
    let testNFT1;
    let owner;
    let addrs;

    before(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

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
              
        const validCurrencies = [XVC.address, USDT.address, wETH.address];
        const Market = await ethers.getContractFactory("XaveMarket");
        market = await Market.deploy(validCurrencies);
        await market.deployed();

        const role = await market.NFT_ADMIN();
        await market.grantRole(role, owner.address);

        await market.addNftWithPrices(testNFT1.address, [XVC.address, USDT.address, wETH.address], [100, 30, 2]);
    });

    describe("Adding/removing tokens", function () {

        const tokenQty = 300;

        it("Mint items on testNFT3", async function () {
            for (let i = 0; i < tokenQty; i++) {
                await testNFT1.mintItem(owner.address);
            }
        });

        var tokenIds = new Array();
        for (let i = 0; i < tokenQty; i++) {
            tokenIds[i] = i+1;
        }

        it("Add items to Market", async function () {
            await market.addToMarket(testNFT1.address, tokenIds);
        });

        it("Override price for XVC for tokens", async function () {
            var prices = new Array();
            for (let i = 0; i < tokenIds.length; i++) {
                prices[i] = i+1 + 100;
            }
            await market.overridePrice(testNFT1.address, XVC.address, tokenIds, prices);
        });

        it("Remove from market", async function () {
            await market.removeFromMarket(testNFT1.address, tokenIds);
            //await market.removeOverridePrice(testNFT1.address, XVC.address, tokenIds);
        });

    });
 
});