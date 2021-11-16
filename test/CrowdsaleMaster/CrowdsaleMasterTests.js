const {expect} = require("chai");
const {ethers} = require("hardhat");
require('chai').use(require('chai-as-promised'));

describe("Tests", function () {
    const VM_EXCEPTION_MESSAGE = "VM Exception while processing transaction: reverted with reason string";
    const currentPrice = 2137;
    let deployer;
    let nftContract;
    const maxCap = 100;

    beforeEach(async function () {
        [deployer] = await ethers.getSigners();
        const nftContractFactory = await ethers.getContractFactory("NftToken");
        nftContract = await nftContractFactory.deploy(deployer.address, "NftToken", "NFTT", "NftToken.com/");
        await nftContract.deployed();
    });

    describe("NftCrowdsaleMaster after deployment", function () {
        let crowdsaleMasterContract;

        beforeEach(async function () {
            const crowdsaleMasterFactory = await ethers.getContractFactory("CrowdsaleMaster");
            crowdsaleMasterContract = await crowdsaleMasterFactory.deploy();
            await crowdsaleMasterContract.deployed();
        });

        it("Should fail creating new crowdsale when nftTokenAddress is zero address", async function () {

            const crowdsaleTx = crowdsaleMasterContract.newCrowdsale(currentPrice, maxCap, ethers.constants.AddressZero, "SHUB");

            await expect(crowdsaleTx).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'CrowdsaleMaster: incorrect addresses.'`);
        });

        //TODO: why address(this) in contract is different than crowdsaleMasterContract.address here
        // it("Should fail creating new crowdsale when nftTokenAddress is crowdsaleMaster's address", async function () {
        //     const addr = await crowdsaleMasterContract.address;
        //     [deployer] = await ethers.getSigners();
        //     console.log("addr1: "+addr);
        //     console.log(deployer.address);
        //
        //     let crowdsaleTx = crowdsaleMasterContract.newCrowdsale(100, 100, crowdsaleMasterContract.address, "SHUB");
        //
        //     await expect(crowdsaleTx).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'CrowdsaleMaster: incorrect addresses.'`);
        // });

        it("Should fail creating new crowdsale when crowdsale for given projectId already exists", async function () {

            await crowdsaleMasterContract.newCrowdsale(currentPrice, maxCap, nftContract.address, "SHUB");

            const secondCrowdsaleTx = crowdsaleMasterContract.newCrowdsale(currentPrice, maxCap, nftContract.address, "SHUB");

            await expect(secondCrowdsaleTx).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'CrowdsaleMaster: crowdsale already exists.'`);
        });

        it("Creating new crowdsale should emit NewCrowdsale event", async function(){
            await expect(await crowdsaleMasterContract.newCrowdsale(currentPrice, maxCap, nftContract.address, "SHUB"))
                .to.emit(crowdsaleMasterContract, 'NewCrowdsale')
                // .withArgs("", "SHUB",maxCap, currentPrice);  - for now there is no matcher accepting any value (address is not known)
        });

        it("Should create new crowdsale with correct values and add to stored mappings", async function () {

            const retrievedAddressBefore = await crowdsaleMasterContract.getCrowdsaleAddressProjectId("SHUB");
            expect(retrievedAddressBefore).to.be.equal(ethers.constants.AddressZero);
            await crowdsaleMasterContract.newCrowdsale(currentPrice, maxCap, nftContract.address, "SHUB");
            const retrievedAddress = await crowdsaleMasterContract.getCrowdsaleAddressProjectId("SHUB");
            expect(retrievedAddress).to.be.not.empty;

            const crowdsaleContractFactory = await ethers.getContractFactory("NftCrowdsale");
            const nftCrowdsaleContract = await crowdsaleContractFactory.attach(
                retrievedAddress // The deployed contract address
            );

            const _tokenAddress = await nftCrowdsaleContract.nftTokenAddress();
            const _price = await nftCrowdsaleContract.currentPrice();
            const _maxCap = await nftCrowdsaleContract.maxCap();
            const _wallet = await nftCrowdsaleContract.getWallet();
            expect(_tokenAddress).to.be.equal(nftContract.address);
            expect(_price).to.be.equal(currentPrice);
            expect(_maxCap).to.be.equal(maxCap);
            expect(_wallet).to.be.equal(crowdsaleMasterContract.address);
        });

        describe("forwarding and withdrawing", async function () {
            let nftCrowdsaleContract;
            beforeEach(async function () {
                [deployer] = await ethers.getSigners();
                await crowdsaleMasterContract.newCrowdsale(currentPrice, maxCap, nftContract.address, "SHUB");
                const retrievedAddress = await crowdsaleMasterContract.getCrowdsaleAddressProjectId("SHUB");
                const crowdsaleContractFactory = await ethers.getContractFactory("NftCrowdsale");
                nftCrowdsaleContract = await crowdsaleContractFactory.attach(
                    retrievedAddress // The deployed contract address
                );
                await transferOwnershipOfNft(nftContract, nftCrowdsaleContract);
            });

            it("Should fail withdrawTo when receiver is zero address", async function () {
                const withdrawTx = crowdsaleMasterContract.withdrawTo(ethers.constants.AddressZero);

                await expect(withdrawTx).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'CrowdsaleMaster: incorrect address.'`);
            });

            it("Should fail withdrawAmountTo when receiver is zero address", async function () {
                const withdrawTx = crowdsaleMasterContract.withdrawAmountTo(ethers.constants.AddressZero, 50);

                await expect(withdrawTx).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'CrowdsaleMaster: incorrect address.'`);
            });

            it("Should not fail withdrawTo when not insufficient funds", async function () {
                const withdrawTx = await crowdsaleMasterContract.withdrawTo(deployer.address);
                expect(withdrawTx).not.be.empty;
                expect(withdrawTx.from).to.be.equal(deployer.address);
            });

            it("Should correctly forward funds when crowdsale purchase called", async function () {
                //BALANCES BEFORE PURCHASING
                const [, purchaser] = await ethers.getSigners();
                const provider = await ethers.provider;
                const crowdsaleMasterBalanceBefore =  await provider.getBalance(crowdsaleMasterContract.address);
                expect(crowdsaleMasterBalanceBefore).to.be.equal(0);

                const firstTicket = await purchaser.sendTransaction({
                    to: nftCrowdsaleContract.address,
                    value: currentPrice
                });
                await firstTicket.wait();

                //BALANCES AFTER PURCHASING
                const crowdsaleMasterBalanceAfter = await provider.getBalance(crowdsaleMasterContract.address);
                expect(crowdsaleMasterBalanceAfter.sub(crowdsaleMasterBalanceBefore)).to.be.equal(currentPrice);
            });

            it("Should correctly forward funds when withDrawTo called", async function () {
                //BALANCES BEFORE PURCHASING
                const [, purchaser, forwardingReceiver] = await ethers.getSigners();
                const provider = await ethers.provider;
                const crowdsaleMasterBalanceBefore = await await provider.getBalance(crowdsaleMasterContract.address);
                expect(crowdsaleMasterBalanceBefore).to.be.equal(0);
                const forwardingReceiverBalanceBefore = await provider.getBalance(forwardingReceiver.address);

                const firstPurchase = await purchaser.sendTransaction({
                    to: nftCrowdsaleContract.address,
                    value: currentPrice
                });
                await firstPurchase.wait();

                //BALANCES AFTER PURCHASING
                const crowdsaleMasterBalanceAfter = await provider.getBalance(crowdsaleMasterContract.address);
                expect(crowdsaleMasterBalanceAfter.sub(crowdsaleMasterBalanceBefore)).to.be.equal(currentPrice);

                await crowdsaleMasterContract.withdrawTo(forwardingReceiver.address);

                //BALANCES AFTER FORWARDING
                const crowdsaleMasterBalanceAfterWithdrawal = await provider.getBalance(crowdsaleMasterContract.address);
                expect(crowdsaleMasterBalanceAfterWithdrawal).to.be.equal(0);
                const forwardingReceiverBalanceAfter = await provider.getBalance(forwardingReceiver.address);
                expect(forwardingReceiverBalanceAfter.sub(forwardingReceiverBalanceBefore)).to.be.equal(currentPrice);
            });

            it("Should correctly forward funds when withdrawAmount called", async function () {
                //BALANCES BEFORE PURCHASING
                const [, purchaser, forwardingReceiver] = await ethers.getSigners();
                const provider = await ethers.provider;
                const crowdsaleMasterBalanceBefore = await await provider.getBalance(crowdsaleMasterContract.address);
                expect(crowdsaleMasterBalanceBefore).to.be.equal(0);
                const forwardingReceiverBalanceBefore = await provider.getBalance(forwardingReceiver.address);

                const firstPurchase = await purchaser.sendTransaction({
                    to: nftCrowdsaleContract.address,
                    value: currentPrice
                });
                await firstPurchase.wait();

                //BALANCES AFTER PURCHASING
                const crowdsaleMasterBalanceAfter = await provider.getBalance(crowdsaleMasterContract.address);
                expect(crowdsaleMasterBalanceAfter.sub(crowdsaleMasterBalanceBefore)).to.be.equal(currentPrice);

                await crowdsaleMasterContract.withdrawAmountTo(forwardingReceiver.address, 100);

                //BALANCES AFTER FORWARDING
                const crowdsaleMasterBalanceAfterWithdrawal = await provider.getBalance(crowdsaleMasterContract.address);
                expect(crowdsaleMasterBalanceAfterWithdrawal).to.be.equal(currentPrice-100);
                const forwardingReceiverBalanceAfter = await provider.getBalance(forwardingReceiver.address);
                expect(forwardingReceiverBalanceAfter.sub(forwardingReceiverBalanceBefore)).to.be.equal(100);
            });

        });

        describe("transferCrowdsaleOwnership", async function () {

            it("Should fail transferCrowdsaleOwnership when newOwner is zero address", async function () {
                await crowdsaleMasterContract.newCrowdsale(currentPrice, maxCap, nftContract.address, "SHUB");

                const transferOwnershipTx = crowdsaleMasterContract.transferCrowdsaleOwnership("SHUB", ethers.constants.AddressZero);

                await expect(transferOwnershipTx).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'CrowdsaleMaster: incorrect address.'`);
            });

            it("Should fail transferCrowdsaleOwnership when crowdsale doesnt exist", async function () {


                const transferOwnershipTx = crowdsaleMasterContract.transferCrowdsaleOwnership("SHIB", deployer.address);

                await expect(transferOwnershipTx).to.eventually.be.rejectedWith(Error, `${VM_EXCEPTION_MESSAGE} 'CrowdsaleMaster: crowdsale doesnt exist.'`);
            });

            it("Should transfer crowdsale ownership correctly", async function () {
                await crowdsaleMasterContract.newCrowdsale(currentPrice, maxCap, nftContract.address, "SHUB");

                await crowdsaleMasterContract.transferCrowdsaleOwnership("SHUB", deployer.address);
                const retrievedAddress = await crowdsaleMasterContract.getCrowdsaleAddressProjectId("SHUB");

                const crowdsaleContractFactory = await ethers.getContractFactory("NftCrowdsale");
                const nftCrowdsaleContract = await crowdsaleContractFactory.attach(
                    retrievedAddress // The deployed contract address
                );

                const newOwnerAddress = await nftCrowdsaleContract.owner();
                expect(newOwnerAddress).to.be.equal(deployer.address);
            });

        });
    });

});


async function transferOwnershipOfNft(nftContract, crowdsaleContract) {
    await nftContract.transferOwnership(crowdsaleContract.address);
}