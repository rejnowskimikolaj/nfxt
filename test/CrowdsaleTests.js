const {expect} = require("chai");
const {ethers} = require("hardhat");
require('chai').use(require('chai-as-promised'));

describe("Tests", function () {
    const VM_EXCEPTION_MESSAGE = "VM Exception while processing transaction: reverted with reason string";
    const currentPrice = 2137;
    const maxCap = 100;
    let deployer;
    let nftContract;

    beforeEach(async function () {
        [deployer] = await ethers.getSigners();
        const nftContractFactory = await ethers.getContractFactory("NftToken");
        nftContract = await nftContractFactory.deploy(deployer.address, "NftToken", "NFTT", "NftToken.com/");
        await nftContract.deployed();
    });
    describe("NftCrowdsale failed deployments", function () {
        it("Should fail deployment when currentPrice less than 1", async function () {

            const nftCrowdsaleFactory = await ethers.getContractFactory("NftCrowdsale");
            const nftCrowdsaleContract = nftCrowdsaleFactory.deploy(0, maxCap, deployer.address, nftContract.address);
            await expect(nftCrowdsaleContract).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'NftCrowdsale: price is less than 1.'`);
        });

        it("Should fail deployment when maxCap less than 1", async function () {

            const nftCrowdsaleFactory = await ethers.getContractFactory("NftCrowdsale");
            const nftCrowdsaleContract = nftCrowdsaleFactory.deploy(currentPrice, 0, deployer.address, nftContract.address);
            await expect(nftCrowdsaleContract).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'NftCrowdsale: maxCap is less than 1.'`);
        });

        it("Should fail deployment when wallet is 0 address", async function () {

            const nftCrowdsaleFactory = await ethers.getContractFactory("NftCrowdsale");
            const nftCrowdsaleContract = nftCrowdsaleFactory.deploy(currentPrice, maxCap, ethers.constants.AddressZero, nftContract.address);
            await expect(nftCrowdsaleContract).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'NftCrowdsale: wallet is the zero address.'`);
        });
    });
    describe("NftCrowdsale after deployment", function () {
        let nftCrowdsaleContract;

        beforeEach(async function () {
            const nftCrowdsaleFactory = await ethers.getContractFactory("NftCrowdsale");
            nftCrowdsaleContract = await nftCrowdsaleFactory.deploy(currentPrice, maxCap, deployer.address, nftContract.address);
            await nftCrowdsaleContract.deployed();
            await transferOwnershipOfNft(nftContract, nftCrowdsaleContract);
        });

        it("Should have correct starting values", async function () {

            const _tokenAddress = await nftCrowdsaleContract.nftTokenAddress();
            const _price = await nftCrowdsaleContract.currentPrice();
            const _maxCap = await nftCrowdsaleContract.maxCap();
            const _wallet = await nftCrowdsaleContract.getWallet();
            expect(_tokenAddress).to.be.equal(nftContract.address);
            expect(_price).to.be.equal(currentPrice);
            expect(_maxCap).to.be.equal(maxCap);
            expect(_wallet).to.be.equal(deployer.address);
        });


        it("Should fail purchasing when maxCap is reached", async function () {

            const nftContractFactory = await ethers.getContractFactory("NftToken");
            nftContract = await nftContractFactory.deploy(deployer.address, "NftToken", "NFTT", "NftToken.com/");
            await nftContract.deployed();

            const NftCrowdsaleContractFactory = await ethers.getContractFactory("NftCrowdsale");
            //creating again to have a small cap
            const nftCrowdsaleContract = await NftCrowdsaleContractFactory.deploy(currentPrice, 1, deployer.address, nftContract.address);
            await nftCrowdsaleContract.deployed();

            await transferOwnershipOfNft(nftContract, nftCrowdsaleContract);

            let firstToken = await nftCrowdsaleContract.purchaseToken({value: currentPrice});

            expect(firstToken).not.be.empty;
            expect(firstToken.from).to.be.equal(deployer.address);

            const secondToken = nftCrowdsaleContract.purchaseToken({value: currentPrice});
            await expect(secondToken).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'NftCrowdsale: max cap reached.'`);
        });

        it("Should be able to call minting on NftToken after deployment", async function () {
            const firstTicket = await nftCrowdsaleContract.purchaseToken({value: currentPrice});
            await firstTicket.wait();
            expect(firstTicket).not.be.empty;
            expect(firstTicket.from).to.be.equal(deployer.address);

            //owner of the new ticket belongs to person calling purchaseToken
            const ownerOfFirstToken = await nftContract.ownerOf(1);
            expect(ownerOfFirstToken).to.be.equal(deployer.address);
        });

        it("Newly purchased token should belong to address calling purchaseToken", async function () {
            const [, notDeployer] = await ethers.getSigners();
            const firstTicket = await nftCrowdsaleContract.connect(notDeployer).purchaseToken({value: currentPrice});
            await firstTicket.wait();
            expect(firstTicket).not.be.empty;
            expect(firstTicket.from).to.be.equal(notDeployer.address);

            //owner of the new ticket belongs to person calling purchaseToken
            const ownerOfFirstTicket = await nftContract.ownerOf(1);
            expect(ownerOfFirstTicket).to.be.equal(notDeployer.address);
        });

        it("Funds should be transferred from purchaser to the wallet and balances should be updated", async function () {
            const [, purchaser] = await ethers.getSigners();
            const provider = await ethers.provider;
            //BALANCES BEFORE
            const walletBalanceBefore = await provider.getBalance(deployer.address);
            const purchaserBalanceBefore = await provider.getBalance(purchaser.address);

            //TRANSACTION
            const firstTicket = await nftCrowdsaleContract.connect(purchaser).purchaseToken({value: currentPrice});
            await firstTicket.wait();
            expect(firstTicket).not.be.empty;
            expect(firstTicket.from).to.be.equal(purchaser.address);

            //WALLET BALANCE
            const walletBalanceAfter = await provider.getBalance(deployer.address);
            console.log(`before ${walletBalanceBefore} after ${walletBalanceAfter}`);
            expect(walletBalanceAfter.sub(walletBalanceBefore)).to.be.equal(currentPrice);

            //PURCHASER BALANCE
            const purchaserBalanceAfter = await provider.getBalance(purchaser.address);
            const txReceipt = await provider.getTransactionReceipt(firstTicket.hash);
            const gasUsed = await txReceipt.gasUsed;
            const gasPrice = await txReceipt.effectiveGasPrice;
            expect(purchaserBalanceBefore.sub(purchaserBalanceAfter).sub(gasUsed.mul(gasPrice))).to.be.equal(currentPrice);
        });

        it("Purchasing should be possible through sending ether with no method specified", async function () {
            const [, purchaser] = await ethers.getSigners();
            const provider = await ethers.provider;
            //BALANCES BEFORE
            const walletBalanceBefore = await provider.getBalance(deployer.address);
            const purchaserBalanceBefore = await provider.getBalance(purchaser.address);

            const firstTicket = await purchaser.sendTransaction({
                to: nftCrowdsaleContract.address,
                value: 2137
            });
            await firstTicket.wait();

            //WALLET BALANCE
            const walletBalanceAfter = await provider.getBalance(deployer.address);
            console.log(`before ${walletBalanceBefore} after ${walletBalanceAfter}`);
            expect(walletBalanceAfter.sub(walletBalanceBefore)).to.be.equal(currentPrice);

            //PURCHASER BALANCE
            const purchaserBalanceAfter = await provider.getBalance(purchaser.address);
            const txReceipt = await provider.getTransactionReceipt(firstTicket.hash);
            const gasUsed = await txReceipt.gasUsed;
            const gasPrice = await txReceipt.effectiveGasPrice;
            expect(purchaserBalanceBefore.sub(purchaserBalanceAfter).sub(gasUsed.mul(gasPrice))).to.be.equal(currentPrice);
        });

        it("Should fail purchasing when value less than currentPrice", async function () {
            const firstTicket = nftCrowdsaleContract.purchaseToken({value: currentPrice - 1});
            await expect(firstTicket).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'NftCrowdsale: value to small.'`);
        });

        it("PurchaseToken should emit correct events", async function () {
            await expect(await nftCrowdsaleContract.purchaseToken({value: currentPrice}))
                .to.emit(nftCrowdsaleContract, 'Received')
                .withArgs(deployer.address, 1, currentPrice, 0);

            await expect(await nftCrowdsaleContract.purchaseToken({value: currentPrice}))
                .to.emit(nftCrowdsaleContract, 'Sent')
                .withArgs(deployer.address, currentPrice);
        });

        it("Get wallet should return correct address", async function () {
            const wallet = await nftCrowdsaleContract.getWallet();
            expect(wallet).to.be.equal(deployer.address);
        });
    });
});

async function transferOwnershipOfNft(nftContract, crowdsaleContract) {
    await nftContract.transferOwnership(crowdsaleContract.address);
}