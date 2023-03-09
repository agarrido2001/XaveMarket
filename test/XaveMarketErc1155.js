const { expect, assert } = require("chai");
const { ethers } = require("hardhat");


describe("XaveMarket with erc1155", function () {

    let market;
    let XVC;
    let USDT;
    let wETH;
    let testNFT;
    let testNFTTokenIds = [];
    let test1155;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addrs;

    before(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TokenERC20");

        // Deploy currencies
        XVC = await Token.deploy("XVC coin", "XVC", 1000000);
        await XVC.deployed();
        USDT = await Token.deploy("USDT coin", "USDT", 5000000);
        await USDT.deployed();
        wETH = await Token.deploy("wETH coin", "wETH", 3000000);
        await wETH.deployed();

        //transfer 4000 xvc to addr1
        await XVC.transfer(addr1.address, 4000);

        //transfer 5000 USDT to addr3
        await USDT.transfer(addr3.address, 5000);

        // Deploy nft
        const TokenNFT = await ethers.getContractFactory("NFT");
        testNFT = await TokenNFT.deploy();
        await testNFT.deployed();
        //Mint 100 nfts on testNFT
        for (let i = 0; i < 100; i++) {
            await testNFT.mintItem(owner.address);
            //Minted tokenIds are sequential starting from from 0
            testNFTTokenIds[i] = i;
        }

        //Deploy erc1155
        const Tokenerc1155 = await ethers.getContractFactory("TokenERC1155");
        test1155 = await Tokenerc1155.deploy();
        await test1155.deployed();
        // Mint 3 tokens on test1155
        await test1155.mint(owner.address, 1, 1000);
        await test1155.mint(owner.address, 2, 3000);
        await test1155.mint(owner.address, 3, 5000);

        //Transfer 10 tokenId 2 to addr3
        await test1155.safeTransferFrom(owner.address, addr3.address, 2, 10, "0x000000000000000000");

        //Deploy Market
        const validCurrencies = [XVC.address, USDT.address, wETH.address];
        const Market = await ethers.getContractFactory("XaveMarket");
        market = await Market.deploy(validCurrencies);
        await market.deployed();

        const roleAd = await market.NFT_ADMIN();
        const roleWi = await market.WITHDRAW();
       
        await market.grantRole(roleAd, owner.address);
        await market.grantRole(roleWi, owner.address);
    });

    describe("Setup", function () {
        
        it("Add testNft to market with prices, and list all tokens for sale", async function () {
            const validCurrencies = [XVC.address, USDT.address, wETH.address];
            const prices = [1000, 30, 1];

            await market.addNftWithPrices(testNFT.address, validCurrencies, prices);

            await market.addToMarket(testNFT.address, testNFTTokenIds);

            const storedPrices = await market.getPrices(testNFT.address, 10);
            //console.log("storedPrices", storedPrices);
        });
    });

    describe("Add erc1155 purchaseKey", function () {

        it("Add purchaseKey(erc1155 + tokenId 1 + amount 2), to nft tokenId 10, 11 and 12 ", async function () {
            await market.addUpdatePurchaseKey(testNFT.address,[10,11,12], test1155.address, 1, 2);
        });

        it("Add purchaseKey(erc1155 + tokenId 2 + amount 1), to nft nft tokenId 13, 14 and 15 ", async function () {
            await market.addUpdatePurchaseKey(testNFT.address,[13,14,15], test1155.address, 2, 1);
        });

        it("tokenId 10 should have a purchaseKey", async function () {
            const purchaseKey = await market.getPurchaseKey(testNFT.address, 10);
            expect(purchaseKey.erc1155).to.eq(test1155.address)
        });

        it("tokenId 9 should NOT have a purchaseKey", async function () {
            const purchaseKey = await market.getPurchaseKey(testNFT.address, 9);
            expect(purchaseKey.erc1155).to.eq("0x0000000000000000000000000000000000000000")
        });

        it("Should revert: remove purchaseKey for tokenId 9, does not have purchase key ", async function () {
            await expect(market.removePurchaseKey(testNFT.address,[9])).to.be.revertedWith("Purchase key not found for the tokenId");
        });

        it("Remove purchaseKey for tokenId 10 purchaseKey(tokenId=1)", async function () {
            await market.removePurchaseKey(testNFT.address,[10]);
            const purchaseKey = await market.getPurchaseKey(testNFT.address, 9);
            expect(purchaseKey.erc1155).to.eq("0x0000000000000000000000000000000000000000")
        });
    });

    describe("Add to market", function () {
        it("Remove all nfts from sale", async function () {
            await market.removeFromMarket(testNFT.address, testNFTTokenIds);
        });
        it("Add all nft to market for sale", async function () {
            await market.addToMarket(testNFT.address, testNFTTokenIds);
        });
        it("tokenId 11 should STILL have its purchaseKey(tokenId=1)", async function () {
            const purchaseKey = await market.getPurchaseKey(testNFT.address, 11);
            expect(purchaseKey.erc1155).to.eq(test1155.address);
            expect(purchaseKey.tokenId).to.eq(1);
        });
    });

    describe("Buy nft", function () {
        it("Addr1 should have 4000 XVC", async function () {
            const bal = await XVC.balanceOf(addr1.address);
            expect(bal).to.eq(4000);
        });

        it("Addr3 should have 5000 USDT", async function () {
            const bal = await USDT.balanceOf(addr3.address);
            expect(bal).to.eq(5000);
        });

        it("Market should have 0 XVC", async function () {
            const bal = await XVC.balanceOf(market.address);
            expect(bal).to.eq(0);
        });

        it("Market should have 0 USDT", async function () {
            const bal = await USDT.balanceOf(market.address);
            expect(bal).to.eq(0);
        });

        it("Market should have 0 erc1155(tokenId=1)", async function () {
            const bal = await test1155.balanceOf(market.address, 1);
            expect(bal).to.eq(0);
        });

        it("Market should have 0 erc1155(tokenId=2)", async function () {
            const bal = await test1155.balanceOf(market.address, 2);
            expect(bal).to.eq(0);
        });

        it("Nft token owner gives allowance of all its nfts (testNFT1) to Market contract", async function () {
            let approved = await testNFT.isApprovedForAll(owner.address, market.address)
            expect(approved).to.be.false;
            await testNFT.setApprovalForAll(market.address, true);
            approved = await testNFT.isApprovedForAll(owner.address, market.address)
            expect(approved).to.be.true;
        });

        it("Addr1 gives allowane of 1000 XVC to market", async function () {
            await XVC.connect(addr1).approve(market.address, 1000);
        }); 

        it("Addr1 buys tokenId 10, which does not require purchaseKey", async function () {
            await market.connect(addr1).buyToken(testNFT.address, [10], XVC.address);
        });

        it("Should revert: Addr1 buys tokenId 11, which DOES require purchaseKey, and addr1 hos no balance", async function () {
            await expect(market.connect(addr1).buyToken(testNFT.address, [11], XVC.address)).to.be.revertedWith(
                "Need purchaseKey to buy this tokenId");
        });

        it("Transfer 5 erc1155(tokenId=1) to addr1", async function () {
            await test1155.safeTransferFrom(owner.address, addr1.address, 1, 5, "0x000000000000000000");
            const bal = await test1155.balanceOf(addr1.address, 1);
            expect(bal).to.eq(5);
        });

        it("Should revert: Need sender approval of required purchaseKey ERC1155", async function () {
            await expect(market.connect(addr1).buyToken(testNFT.address, [11], XVC.address)).to.be.revertedWith(
                "ERC1155: caller is not token owner or approved");
        });

        it("Give approval of erc1155 to market", async function () {
            await test1155.connect(addr1).setApprovalForAll(market.address, true);
            const bal = await test1155.isApprovedForAll(addr1.address, market.address);
            expect(bal).to.eq(true);
        });

        it("Addr1 gives allowane of 2000 XVC to market", async function () {
            await XVC.connect(addr1).approve(market.address, 2000);
        }); 

        it("Addr1 buys nft(tokenId = [11, 12])", async function () {
            await market.connect(addr1).buyToken(testNFT.address, [11,12], XVC.address);
        });

        it("Addr3 should have 10 erc1155(tokenId=2)", async function () {
            const bal = await test1155.balanceOf(addr3.address, 2);
            expect(bal).to.eq(10);
        });

        it("Addr3 gives allowane of 4000 USDT to market + erc1155 aproval", async function () {
            await USDT.connect(addr3).approve(market.address, 4000);
            await test1155.connect(addr3).setApprovalForAll(market.address, true);
        }); 

        it("Addr3 buys nft(tokenId = [13, 14, 15]) with purchaseKey(tokenId=2)", async function () {
            await market.connect(addr3).buyToken(testNFT.address, [13, 14, 15], USDT.address);
        });
        
    });

    describe("Balances", function () {
        it("Addr1 should have 1000 XVC", async function () {
            const bal = await XVC.balanceOf(addr1.address);
            expect(bal).to.eq(1000);
        });

        it("Addr1 should have 1 erc1155(tokenId=1)", async function () {
            const bal = await test1155.balanceOf(addr1.address, 1);
            expect(bal).to.eq(1);
        });

        it("Addr3 should have 4910 USDT", async function () {
            const bal = await USDT.balanceOf(addr3.address);
            expect(bal).to.eq(4910);
        });

        it("Addr3 should have 7 erc1155(tokenId=2)", async function () {
            const bal = await test1155.balanceOf(addr3.address, 2);
            expect(bal).to.eq(7);
        });

        it("Market should have 3000 XVC", async function () {
            const bal = await XVC.balanceOf(market.address);
            expect(bal).to.eq(3000);
        });

        it("Market should have 90 USDT", async function () {
            const bal = await USDT.balanceOf(market.address);
            expect(bal).to.eq(90);
        });

        it("Market should have 4 erc1155(tokenId=1)", async function () {
            const bal = await test1155.balanceOf(market.address, 1);
            expect(bal).to.eq(4);
        });

        it("Market should have 3 erc1155(tokenId=2)", async function () {
            const bal = await test1155.balanceOf(market.address, 2);
            expect(bal).to.eq(3);
        });

    });

    describe("Withdraw", function () {

        it("Give addr2 WITHDRAW role", async function () {
            const roleWi = await market.WITHDRAW();
            await market.grantRole(roleWi, addr2.address);
        });

        it("Addr2 should have 0 XVC", async function () {
            const bal = await XVC.balanceOf(addr2.address);
            expect(bal).to.eq(0);
        });

        it("Addr2 should have 0 USDT", async function () {
            const bal = await USDT.balanceOf(addr2.address);
            expect(bal).to.eq(0);
        });

        it("Addr2 should have 0 erc1155(tokenId=1)", async function () {
            const bal = await test1155.balanceOf(addr2.address, 1);
            expect(bal).to.eq(0);
        });

        it("Addr2 should have 0 erc1155(tokenId=2)", async function () {
            const bal = await test1155.balanceOf(addr2.address, 2);
            expect(bal).to.eq(0);
        });

        it("Addr2 withdraws", async function () {
            await market.connect(addr2).withdraw();
        });
    });

    describe("Balances after withdraw", function () {

        it("addr2 should have 3000 XVC", async function () {
            const bal = await XVC.balanceOf(addr2.address);
            expect(bal).to.eq(3000);
        });

        it("addr2 should have 90 USDT", async function () {
            const bal = await USDT.balanceOf(addr2.address);
            expect(bal).to.eq(90);
        });

        it("addr2 should have 4 erc1155(tokenId=1)", async function () {
            const bal = await test1155.balanceOf(addr2.address, 1);
            expect(bal).to.eq(4);
        });

        it("addr2 should have 3 erc1155(tokenId=2)", async function () {
            const bal = await test1155.balanceOf(addr2.address, 2);
            expect(bal).to.eq(3);
        });

        it("Market should have 0 XVC", async function () {
            const bal = await XVC.balanceOf(market.address);
            expect(bal).to.eq(0);
        });

        it("Market should have 0 USDT", async function () {
            const bal = await USDT.balanceOf(market.address);
            expect(bal).to.eq(0);
        });

        it("Market should have 0 erc1155(tokenId=1)", async function () {
            const bal = await test1155.balanceOf(market.address, 1);
            expect(bal).to.eq(0);
        });

        it("Market should have 0 erc1155(tokenId=2)", async function () {
            const bal = await test1155.balanceOf(market.address, 2);
            expect(bal).to.eq(0);
        });

        it("Should revert withdraw: No balance available", async function () {
            await expect(market.connect(addr2).withdraw()).to.be.revertedWith("No balance available");
        });
    });
});