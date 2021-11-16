async function main() {
    const [deployer] = await ethers.getSigners();
    const config = require('../deploymentConfig.json');
    console.log("Deploying Crowdsale contract with the account:", deployer.address);
    console.log("Config:", config);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    console.log("Attaching to CrowdsaleMaster ", config.CrowdsaleMasterAddress);
    const crowdsaleMasterFactory = await ethers.getContractFactory("CrowdsaleMaster");

    const crowdsaleMaster = await crowdsaleMasterFactory.attach(
        config.CrowdsaleMasterAddress // The deployed contract address
    );

    await crowdsaleMaster.newCrowdsale(config.crowdsaleRate.toString(), config.maxCap, config.ERC721Address, config.ERC721Symbol);
    const crowdsaleAddress = await crowdsaleMaster.getCrowdsaleAddressProjectId(config.ERC721Symbol);
    console.log("crowdsaleAddress", crowdsaleAddress);

    console.log("Attaching to %s ERC721 token ", config.ERC721Address);

    const nftToken = await ethers.getContractAt("IERC721Tradable", config.ERC721Address);

    await nftToken.transferOwnership(crowdsaleAddress);
    const nftTokenOwner = await nftToken.owner();

    console.log("new nftToken owner: ", nftTokenOwner);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });