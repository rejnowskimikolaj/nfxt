async function main() {
    const [deployer] = await ethers.getSigners();
    const config = require('../deploymentConfig.json');
    console.log("Config:", config);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    console.log("Attaching to Crowdsale: ", config.CrowdsaleAddress);

    const crowdsale = await ethers.getContractAt("NftCrowdsale", config.CrowdsaleAddress);

    const receipt = await crowdsale.purchaseToken({value: 1});

    console.log("receipt: ", receipt);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });