async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying CrowdsaleMaster contract with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const crowdsaleMasterContractFactory = await ethers.getContractFactory("CrowdsaleMaster");
    const crowdsaleMasterContract = await crowdsaleMasterContractFactory.deploy();
    await crowdsaleMasterContract.deployed();

    console.log("Account balance:", (await deployer.getBalance()).toString());
    console.log("crowdsaleMasterContract address:", crowdsaleMasterContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
