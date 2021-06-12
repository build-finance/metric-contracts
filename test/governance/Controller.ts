import { expect } from "chai";
import { ethers } from 'hardhat';

import {
    Controller,
    Controller__factory
} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber} from "ethers";

describe("Controller contract", function () {

    let controllerFactory: Controller__factory;
    let controller: Controller;

    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let receiver1: SignerWithAddress;
    let receiver2: SignerWithAddress;
    let feeConverter: SignerWithAddress;
    let router: SignerWithAddress;
    let rewardToken: SignerWithAddress;
    let rewardToken2: SignerWithAddress;

    beforeEach(async function () {
        [owner, user, receiver1, receiver2, router, rewardToken, rewardToken2, feeConverter] =
            await ethers.getSigners();

        controllerFactory = <Controller__factory>await ethers.getContractFactory("Controller");

        controller =
            await controllerFactory.deploy(
                [{
                    receiver: receiver1.address,
                    share: 1000
                }, {
                    receiver: receiver2.address,
                    share: 10000
                }],
                router.address,
                2000,
                rewardToken.address
            );
    });

    describe("Deployment", function () {
        it("Should correctly assign different controller attributes", async function () {
            expect(await controller.getRewardReceivers()).to.eql([
                [ receiver1.address, BigNumber.from(1000) ],
                [ receiver2.address, BigNumber.from(10000) ]
            ]);
            expect(await controller.swapRouter()).to.eql(router.address);
            expect(await controller.rewardToken()).to.eql(rewardToken.address);
            expect(await controller.feeConversionIncentive()).to.eql(BigNumber.from(2000));
            expect(await controller.paused()).to.eql(false);
        });
    });

    describe("Transactions", function () {

        it("setFeeConverter should correctly set recipient address", async function () {
            await controller.setFeeConverter(feeConverter.address);
            expect(await controller.feeConverter()).to.eql(feeConverter.address);
        });

        it("setRewardReceivers should correctly override existing receivers list", async function () {
            await controller.setRewardReceivers([{
                receiver: receiver2.address,
                share: BigNumber.from(3000)
            }]);
            expect(await controller.getRewardReceivers()).to.eql([[
                receiver2.address,
                BigNumber.from(3000)
            ]]);
        });

        it("setFeeConversionIncentive should correctly set the incentive fee", async function () {
            await controller.setFeeConversionIncentive(BigNumber.from(4000));
            expect(await controller.feeConversionIncentive()).to.eql(BigNumber.from(4000));
        });

        it("setRewardToken should correctly set the reward token address", async function () {
            await controller.setRewardToken(rewardToken2.address);
            expect(await controller.rewardToken()).to.eql(rewardToken2.address);
        });

        it("setters should revert if called by non owner", async function () {

            expect(controller.connect(user).setFeeConverter(feeConverter.address))
                .to.be.revertedWith("Ownable: caller is not the owner");

            expect(controller.connect(user).setRewardToken(rewardToken2.address))
                .to.be.revertedWith("Ownable: caller is not the owner");

            expect(controller.connect(user).setFeeConversionIncentive(BigNumber.from(4000)))
                .to.be.revertedWith("Ownable: caller is not the owner");

            expect(controller.connect(user).setRewardReceivers([{
                    receiver: receiver2.address,
                    share: BigNumber.from(3000)
                }]))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("non owner calling pause should revert", async function () {
            expect(controller.connect(user).pause()).to.revertedWith("Ownable: caller is not the owner");
        });

        it("owner calling unpause should fail if not paused", async function () {
            expect(controller.unpause()).to.be.revertedWith("Pausable: not paused");
        });

        it("owner calling pause should correctly set pause value", async function () {
            await controller.pause();
            expect(await controller.paused()).to.eql(true);
        });

        it("non owner should be able to call unpause", async function () {
            expect(controller.connect(user).unpause()).to.revertedWith("Ownable: caller is not the owner");
        });

        it("owner calling unpause should correctly set unpause value", async function () {
            await controller.pause();
            await controller.unpause();
            expect(await controller.paused()).to.eql(false);
        });

    });

});