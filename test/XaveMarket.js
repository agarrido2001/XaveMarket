const { expect, assert } = require("chai");
const { ethers } = require("hardhat");


describe("XaveMarket", function () {

    let market;
    let XVC;
    let USDT;
    let wETH;
    let testNFT1;
    let testNFT2;
    let testNFT3;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addrs;

    before(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

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
        testNFT3 = await TokenNFT.deploy();
        await testNFT3.deployed();
        
        //Mint 3 nfts on nft 1
        await testNFT1.mintItem(owner.address);
        await testNFT1.mintItem(owner.address);
        await testNFT1.mintItem(owner.address);

        //Mint 2 nfts on nft 2
        await testNFT2.mintItem(owner.address);
        await testNFT2.mintItem(owner.address);

        const validCurrencies = [XVC.address, USDT.address];
        const Market = await ethers.getContractFactory("XaveMarket");
        market = await Market.deploy(validCurrencies);
        await market.deployed();

    });


    describe("Deployment and setup", function () {

        it("Verify deploys (XaveMarket + XVC + USDT + wETH ) and minted data", async function () {
            expect(await testNFT1.balanceOf(owner.address)).to.eq(3);
            expect(await testNFT2.balanceOf(owner.address)).to.eq(2);

            let validCur = await market.validCurrencies();
            expect(validCur.length).to.eq(2);
        });

        it("Assign NFT_ADMIN role to owner", async function () {
            const role = await market.NFT_ADMIN();
            await market.grantRole(role, owner.address);
        
            expect(await market.hasRole(role,owner.address)).to.be.true;
        });

        describe("Add currency", function () {
            it("Should revert: adding currency address that is not a contract address", async function () {
                await expect(market.addValidCurrency(addr1.address)).to.be.revertedWith(
                    "Invalid currency address");
            });

            it("Should revert: adding currency that already exists", async function () {
                await expect(market.addValidCurrency(XVC.address)).to.be.revertedWith(
                    "Currency already exists");
            });
           
            it("Add new valid currency: wETH", async function () {
                await market.addValidCurrency(wETH.address)
            });
        });

        describe("Add nft", function () {

            it("Should revert: adding nft address that is not a contract address", async function () {
                await expect(market.addNft(addr1.address)).to.be.revertedWith(
                    "Invalid nft address");
            });

            it("Add nft address: testNFT1", async function () {
                await market.addNft(testNFT1.address);
                const nftAddr = await market.nftAt(0);
                expect(nftAddr).to.eq(testNFT1.address);
            });

            it("Should revert: adding nft address that already exits", async function () {
                await expect(market.addNft(testNFT1.address)).to.be.revertedWith(
                    "Nft already exists");
            });
        });


        describe("Add to market", function () {

            it("Should revert: addToMarket: tokenIds[] empty", async function () {
                await expect(market.addToMarket(testNFT1.address,[])).to.be.revertedWith(
                    "tokenIds[] cannot be empty");
            });

            it("Should revert: addToMarket: nft contract not found", async function () {
                await expect(market.addToMarket(testNFT2.address,[1])).to.be.revertedWith(
                    "Nft contract not found");
            });

            it("Should revert: addToMarket: must have default price", async function () {
                await expect(market.addToMarket(testNFT1.address,[1])).to.be.revertedWith(
                    "Nft must have at least one default price");
            });

            it("Should revert: addDefaultPrice: Nft contract not found", async function () {
                await expect(market.addDefaultPrice(testNFT2.address, [XVC.address],[100])).to.be.revertedWith(
                    "Nft contract not found");
            });

            it("Should revert: addDefaultPrice: currency not listed as valid", async function () {
                await expect(market.addDefaultPrice(testNFT1.address, [owner.address],[100])).to.be.reverted;
            });

            it("Should revert: addDefaultPrice: currencies[] and prices[] different size", async function () {
                await expect(market.addDefaultPrice(testNFT1.address, [XVC.address], [100,2])).to.be.revertedWith(
                    "currency and amounts must be the same size");
            });

            it("Should revert: addDefaultPrice: price cannot be 0", async function () {
                await expect(market.addDefaultPrice(testNFT1.address, [XVC.address], [0])).to.be.revertedWith(
                    "Amount cannot be 0");
            });

            it("Add nft default price of 100 XVC to all tokens at testNFT1", async function () {
                await market.addDefaultPrice(testNFT1.address, [XVC.address, USDT.address], [100,1]);
            });

            it("Add tokenIds 1,2 and 3 (testNFT1) to market. Emits AddedOrRemovedFromMarket. Check prices", async function () {
                await expect(market.addToMarket(testNFT1.address,[1,2,3])).to.emit(market, "AddedOrRemovedFromMarket").withArgs(true, testNFT1.address, [1,2,3]);

                let ret = await market.getPrices(testNFT1.address, 1);
                for (let i = 0; i < ret.currencies.length; i++) {
                    const currency = ret.currencies[i];
                    //USDT price should be 0
                    if(currency == USDT.address){
                        expect(ret.amounts[i]).to.eq(1);
                    }
                    //XVC price should be 100
                    if(currency == XVC.address){
                        expect(ret.amounts[i]).to.eq(100);
                    }
                }
            });

            it("Override the price for one tokenId(3)(testNFT1) and currency USDT. Check new prices", async function () {
                let ret = await market.getPrices(testNFT1.address, 3);
                // assumes idx=0 => xvc and idx=1 => usdt
                expect(ret.amounts[0]).to.eq(100);
                expect(ret.amounts[1]).to.eq(1); //no price
                
                //await market.overridePrice(testNFT1.address, XVC.address, [3], [150]);
                await market.overridePrice(testNFT1.address, USDT.address, [3], [15]);
                ret = await market.getPrices(testNFT1.address, 3);
        
                expect(ret.amounts[0]).to.eq(100);
                expect(ret.amounts[1]).to.eq(15);
            });
        });
    });

    describe("Buy tokens", function () {

        it("Owner owns tokenId 1 at testNFT1 ", async function () {
            expect(await testNFT1.ownerOf(1)).to.eq(owner.address);
        });

        it("Owner owns tokenId 3 at testNFT1 ", async function () {
            expect(await testNFT1.ownerOf(3)).to.eq(owner.address);
        });

        it("Owner owns tokenId 1 at testNFT2 ", async function () {
            expect(await testNFT2.ownerOf(1)).to.eq(owner.address);
        });

        it("Should revert: addr1 buys tokenId 1 at testNFT1 with no allowance from token owner", async function () {
            await expect(market.connect(addr1).buyToken(testNFT1.address, [1], XVC.address)).to.be.revertedWith(
                "ERC721: caller is not token owner or approved");
        });

        it("Token owner gives allowance of all its nfts (testNFT1) to Market contract", async function () {
            let approved = await testNFT1.isApprovedForAll(owner.address, market.address)
            expect(approved).to.be.false;
            await testNFT1.setApprovalForAll(market.address, true);
            approved = await testNFT1.isApprovedForAll(owner.address, market.address)
            expect(approved).to.be.true;
        });

        it("Token owner gives allowance of only one tokenId(1) (testNFT2) to Market contract. Also, lists it for sale: 90 XVC or 10 USDT", async function () {
            await testNFT2.approve(market.address, 1);
            await market.addNft(testNFT2.address);
            await market.addDefaultPrice(testNFT2.address, [XVC.address, USDT.address], [90, 10]);
            await market.addToMarket(testNFT2.address,[1,2]);
        });

        it("Should revert: addr1 buys tokenId 1 at testNFT1, addr1 must give allowance of currency (XVC) to Market", async function () {
            await expect(market.connect(addr1).buyToken(testNFT1.address, [1], XVC.address)).to.be.revertedWith(
                "ERC20: insufficient allowance");
        });

        it("addr1 gives allowane of 1000 XVC to market", async function () {
            await XVC.connect(addr1).approve(market.address, 1000);
        }); 

        it("Should revert: addr1 does not have enough XVC", async function () {
            await expect(market.connect(addr1).buyToken(testNFT1.address, [1], XVC.address)).to.be.revertedWith(
                "ERC20: transfer amount exceeds balance");
        });

        it("Transfer 1000 XVC to addr1", async function () {     
            await XVC.transfer(addr1.address, 1000);
        });

        it("addr1 buys tokenId 1 at testNFT1 with 100 XVC. Emits NftPurchased event", async function () {     
            await expect(market.connect(addr1).buyToken(testNFT1.address, [1], XVC.address))
                .to.emit(market, "NftPurchased").withArgs(addr1.address, testNFT1.address, [1], XVC.address, 100);
        });

        it("addr1 buys tokenId 1 at testNFT2 with 90 XVC. Emits NftPurchased event", async function () {     
            await expect(market.connect(addr1).buyToken(testNFT2.address, [1], XVC.address))
                .to.emit(market, "NftPurchased").withArgs(addr1.address, testNFT2.address, [1], XVC.address, 90);
        });

        it("Should revert: addr2 buys tokenId 1 at testNFT2. Already sold", async function () {     
            await  expect(market.connect(addr2).buyToken(testNFT2.address, [1], XVC.address)).to.be.
            revertedWithCustomError(market, "TokenIdNotListed").withArgs(1);
        });

        it("addr2 buys tokenId 3 at testNFT1 with 15 USDT", async function () {
            await USDT.transfer(addr2.address, 1000);
            await USDT.connect(addr2).approve(market.address, 1000);
            await market.connect(addr2).buyToken(testNFT1.address, [3], USDT.address);
        });

        it("Should revert: addr1 buys tokenId 2 at testNFT2. Only tokenId 1 was approved by owner", async function () {
            await expect(market.connect(addr1).buyToken(testNFT2.address, [2], XVC.address)).to.be.revertedWith(
                "ERC721: caller is not token owner or approved");
        });

        it("Should revert: addr1 buys tokenId 2 at testNFT1 with wETH(valid) but has no price", async function () {     
            await expect(market.connect(addr1).buyToken(testNFT1.address, [2], wETH.address)).to.be.revertedWith(
                "No price found for currency");
        });
    });

    describe("Check balances", function () {
        describe("Nfts", function () {
            it("addr1 owns tokenId 1 at testNFT1", async function () {     
                expect(await testNFT1.ownerOf(1)).to.eq(addr1.address);
            });

            it("addr1 owns tokenId 1 at testNFT2", async function () {     
                expect(await testNFT2.ownerOf(1)).to.eq(addr1.address);
            });

            it("addr2 owns tokenId 3 at testNFT1", async function () {     
                expect(await testNFT1.ownerOf(3)).to.eq(addr2.address);
            });

            it("Unsold: owner still owns tokenId 2 at testNFT1", async function () {     
                expect(await testNFT1.ownerOf(2)).to.eq(owner.address);
            });

            it("Unsold: owner still owns tokenId 2 at testNFT2", async function () {     
                expect(await testNFT2.ownerOf(2)).to.eq(owner.address);
            });            
        });

        describe("Erc20 balances", function () {
            it("addr1 owns 810 XVC => 1000 - (100 + 90)", async function () {
               expect(await XVC.balanceOf(addr1.address)).to.eq(810);
            });
            
            it("addr2 owns 985 USDT => 1000 - 15", async function () {     
               expect(await USDT.balanceOf(addr2.address)).to.eq(985);
            });

            it("Market owns USDT=15 XVC=190", async function () {     
                expect(await USDT.balanceOf(market.address)).to.eq(15);
                expect(await XVC.balanceOf(market.address)).to.eq(190);
            });
        });

        describe("Withdraw", function () {
            it("Should revert: cannot remove currency USDT, because market has balance", async function () {
                await expect(market.removeValidCurrency(USDT.address)).to.be.revertedWith(
                    "Need to withdraw balance");
            });

            it("Assign WITHDRAW role to addr3", async function () {
                const role = await market.WITHDRAW();
                await market.grantRole(role, addr3.address);
            
                expect(await market.hasRole(role, addr3.address)).to.be.true;
            });

            it("addr3 withdraws balances. Check balances", async function () {
                await market.connect(addr3).withdraw();
            
                //addr3
                expect(await USDT.balanceOf(addr3.address)).to.eq(15);
                expect(await XVC.balanceOf(addr3.address)).to.eq(190);

                //market
                expect(await USDT.balanceOf(market.address)).to.eq(0);
                expect(await XVC.balanceOf(market.address)).to.eq(0);
            });

            it("Remove currency USDT", async function () {
                await market.removeValidCurrency(USDT.address);
            }); 

            it("Should revert: remove currency USDT (again)", async function () {
                await expect(market.removeValidCurrency(USDT.address)).to.be.revertedWith(
                    "Currency not found");
            }); 

            it("Should revert: cannot withdraw if not balance available", async function () {
                await expect(market.connect(addr3).withdraw()).to.be.revertedWith(
                    "No balance available");

            }); 
        });

    });

});