import { expect } from "chai";
import { ethers } from 'hardhat';

import {MetricLpShare, MetricLpShare__factory, MetricToken, MetricToken__factory} from "../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

describe("MetricLpShare contract", function () {

    let MetricTokenFactory: MetricToken__factory;
    let MetricToken: MetricToken;
    let MetricLpToken: MetricToken;

    let MetricLpShareFactory: MetricLpShare__factory;
    let MetricLpShare: MetricLpShare;

    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        MetricTokenFactory = <MetricToken__factory>await ethers.getContractFactory("MetricToken");

        MetricToken = await MetricTokenFactory.deploy();
        MetricLpToken = await MetricTokenFactory.deploy();

        MetricLpShareFactory = <MetricLpShare__factory>await ethers.getContractFactory("MetricLpShare");
        MetricLpShare =
            await MetricLpShareFactory.deploy(
                MetricToken.address,
                MetricLpToken.address,
                "xlMETRIC",
                "Lp Share Metric"
            );

    });

    describe("Deployment", function () {
        it("Should assign MetricLpToken as underlying asset for MetricShare", async function () {
            expect(await MetricLpShare.metric()).to.equal(MetricToken.address);
            expect(await MetricLpShare.balance()).to.equal(0);

            expect(await MetricLpShare.lpMetric()).to.equal(MetricLpToken.address);
            expect(await MetricLpShare.sharePrice()).to.equal(0);
        });
    });

    describe("Transactions", function () {

        describe("Calls to MetricLpShare.enter", function (){

            beforeEach(async function() {
                await MetricLpToken.connect(addr2).mint(100);
            });

            it("Should fail if user has no MetricLpToken", async function () {
                expect(MetricLpShare.connect(addr1).enter(1))
                    .to.be.revertedWith("revert ERC20: transfer amount exceeds balance");
            });

            it("Should fail if user did not approve MetricLpToken transfer", async function () {
                expect(MetricLpShare.connect(addr2).enter(100))
                    .to.be.revertedWith("revert ERC20: transfer amount exceeds allowance");
            });

            it("Should lock user MetricLpToken on success", async function () {
                await MetricLpToken.connect(addr2).approve(MetricLpShare.address, 100);

                expect(MetricLpShare.connect(addr2).enter(100)).to.not.be.reverted;
                expect(await MetricLpToken.balanceOf(addr2.address)).to.be.equal(0);

            });

            it("Should correctly record user stake on success", async function () {
                await MetricLpToken.connect(addr2).approve(MetricLpShare.address, 100);

                expect(MetricLpShare.connect(addr2).enter(100)).to.not.be.reverted;
                expect(await MetricLpShare.balanceOf(addr2.address)).to.be.equal(100);
                expect(await MetricLpShare.sharePrice()).to.be.equal(0);
            });
        });

        describe("Calls to MetricLpShare.leave", function () {

            it("Should fail if no one has staked yet", async function() {
                expect(MetricLpShare.connect(addr1).leave(100))
                    .to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });

            it("Should fail if user provides an amount bigger than their LP balance", async function() {
                await MetricLpToken.connect(addr2).mint(100);
                await MetricLpToken.connect(addr2).approve(MetricLpShare.address, 100);
                await MetricLpShare.connect(addr2).enter(100);

                expect(MetricLpShare.connect(addr1).leave(100))
                    .to.be.revertedWith("ERC20: burn amount exceeds balance");
            });

            it("Should send back user LP tokens on success", async function() {
                await MetricLpToken.connect(addr2).mint(100);
                await MetricLpToken.connect(addr2).approve(MetricLpShare.address, 100);
                await MetricLpShare.connect(addr2).enter(100);

                expect(MetricLpShare.connect(addr2).leave(100)).to.not.be.reverted;
                expect(await MetricLpShare.balanceOf(addr2.address)).to.be.equal(0);
            });

            it("Should return same LP token amount as staked, if no new revenue received", async function() {
                await MetricToken.connect(owner).mint(50);
                await MetricToken.connect(owner).transfer(MetricLpShare.address, 50);
                await MetricLpToken.connect(addr2).mint(100);
                await MetricLpToken.connect(addr2).approve(MetricLpShare.address, 100);
                await MetricLpShare.connect(addr2).enter(100);
                await MetricLpShare.connect(addr2).leave(100);

                expect(await MetricLpShare.balanceOf(addr2.address)).to.be.equal(0);
            });

            it("Should return adjusted METRIC amount from staked, if new revenue received", async function() {
                await MetricLpToken.connect(addr2).mint(100);
                await MetricLpToken.connect(addr2).approve(MetricLpShare.address, 100);
                await MetricLpShare.connect(addr2).enter(100);

                await MetricLpToken.connect(addr1).mint(100);
                await MetricLpToken.connect(addr1).approve(MetricLpShare.address, 100);
                await MetricLpShare.connect(addr1).enter(100);

                await MetricToken.connect(owner).mint(50);
                await MetricToken.connect(owner).transfer(MetricLpShare.address, 50);

                expect(await MetricLpShare.balance()).to.equal(50);
                expect(await MetricLpShare.sharePrice()).to.equal("250000000000000000");

                await MetricLpShare.connect(addr2).leave(100);
                await MetricLpShare.connect(addr1).leave(100);

                expect(await MetricToken.balanceOf(addr2.address)).to.be.equal(25);
                expect(await MetricToken.balanceOf(addr1.address)).to.be.equal(25);
            });
        });

    });
});