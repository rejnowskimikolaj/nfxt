async function main() {
    const [deployer] = await ethers.getSigners();
    const config = require('../deploymentConfig.json');
    console.log("Deploying NftToken contract with the account:", deployer.address);
    console.log("Config:", config);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const nftTokenFactory = await ethers.getContractFactory("NftToken");
    const nftToken = await nftTokenFactory.deploy(deployer.address,config.ERC721Name,config.ERC721Symbol,config.ERC721BaseTokenURI);
    await nftToken.deployed();

    console.log("Account balance:", (await deployer.getBalance()).toString());
    console.log("NftToken address:", nftToken.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
