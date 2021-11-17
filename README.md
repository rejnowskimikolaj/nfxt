# NEXT Hollywood

Next HOLLYWOOD is a web3 platform built to level the playing field in big Hollywood by giving
filmmakers and creators access to smart contracts, chain of title, and tokenize intellectual
property ownership. It’s a fractionalization platform for film and television.

This repository contains basic code needed to deploy **CrowdsaleMaster** - a factory smart contract for mintable NFT crodwdsales.
It deployes NftCrowdsale for an existing NFT token smart contract. Nft has to implement *IERC721Tradable* interface.
All the contracts in this project utilize **OpenZeppelin**'s *ReentrancyGuard*, *Ownable* and *Pausable* libraries.
Please note, that this project is still a work in progress and the code is not a production ready!!

## CrowdsaleMaster Deployment
You can deploy it by running
`npx hardhat run scripts/deployCrowdsaleMaster.js --network <NETWORK SPECIFIED IN hardhat.config.js>`, f.e.:
`npx hardhat run scripts/deployCrowdsaleMaster.js --network ropsten`

You can specify your own network in *hardhat.config.js*
Before running *deployCrowdsaleMaster.js* remember to:
* specify you private keys in *secrets.json* (as in secrets_example.json)
  
All the scripts log addresses of deployed smart contracts. 
## NftCrowdsale 
You can generate an NFT crowdsale by calling an existing **CrowdsaleMaster**. You will need an already deployed NFT token contract. You can use *scripts/deployERC721.js* for that. Remember to update deploymentConfig.json after getting the NFT contract address.

To create new Crowdsale you can run
`*npx hardhat run scripts/createNewCrowdsaleForExistingToken.js --network <NETWORK SPECIFIED IN hardhat.config.js>*`, f.e.:
`*npx hardhat run scripts/createNewCrowdsaleForExistingToken.js --network ropsten*`
  
## Purchasing token
Investors can purchase NFT tokens through **NftCrowdsale** by sending predefined amount of wei  (without calling particular function) or by calling *purchaseToken()*.
  
You can find an example in *scripts/buyNewTokenOnCrowdsale.js*. Remember to update **deploymentConfig.json** with required parameters.
  
Other useful commands:
`npx hardhat accounts`
`npx hardhat compile`
`npx hardhat clean`
`npx hardhat test`
`npx hardhat node`
`npx hardhat help`


