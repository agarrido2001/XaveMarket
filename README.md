# Xave Market
## Purpose
Xave Market is a smart contract that allows the sale of Xave Lands, which are NFTs (non-fungible tokens) minted in one or more NFT contracts. Xave Market accepts any approved ERC20 token as payment and requires the buyer to give proper allowance to XaveMarket for the transfer of tokens.

All the lands (token ids) are already minted out to the same address. This address must give allowance to XaveMarket to transfer all of its Lands.

The purchase process allows the buyer to purchase a list of token ids to guarantee the purchase of all the desired lands or land group. Additionally, a token id may require ERC1155 tokens as well (Purchase Keys).

All the NFTs must have one or more default prices: ERC20 address + value. These prices will be used for all the NFT’s token ids. However, any token id's price can be overridden with a specific value.

XaveMarket has three access roles: Admin (for roles), NFT Admin, and Withdraw. The NFT_ADMIN maintains a list of valid currencies accepted as payments and can add NFT contracts to XaveMarket, set a default price, override a price for a list of token ids, and add ERC1155 purchase keys requirement to a list of token ids. The WITHDRAW role can take all the collected ERC20 and ERC1155 tokens.


## Usage
- Install dependencies

- In order to run all the tests, go to the project foler and run:
    ```
    npx hardhat test
    ```

- The test can be run individually. For instance:
    ```
    npx hardhat test test/XaveMarketGas
    ```    

- To list NFTs for sale, the NFT_ADMIN will need to:
    1. Add the NFT contract/s to XaveMarket (addNft) and set a default price (addDefaultPrice). Or do both at the same time (addNftWithPrices).
    2. (Optional) Override the price for a list of token ids (overridePrice).
    3. (Optional) Add ERC1155 purchase keys requirement to a list of token ids (addUpdatePurchaseKey).
    4. List the desired token ids for sale (addToMarket)

- To purchase NFT tokens the buyer will:
    1. Check the token id's different prices (getPrices).
    2. Check if the token id requires a ERC1155 tokens (getPurchaseKey)
    3. Give proper allowance to XaveMarket (ERC20 and ERC1155)
    4. Purchase a list of token ids for one NFT using one of the accepted currencies (buyToken).
    
- A user with WITHDRAW role, withdraws all collected ERC20 and ERC1155 (withdraw)

- Other public functions are:
    - maxTokenPurchase(): Max amount of token allowed in one purchase.
    - nftLength(): How many NFT contracts are set in XaveMarket.
    - nftAt(index): NFT address for one index.
    - listedTokensLength(nft): How many tokens are listed for one NFT.
    - listedTokensAt(nft, index): Token id listed for one NFT and at index.
    - isTokenListed(nft, tokenId): Is the token id listed for sale?
    - validCurrencies(): List of valid currencies.
