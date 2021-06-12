import { expect } from "chai";
import { ethers } from 'hardhat';

import {
    RevenueShare,
    RevenueShare__factory,
    MetricToken,
    MetricToken__factory
} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

describe("RevenueShare contract", function () {

    let MetricTokenFactory: MetricToken__factory;
    let MetricToken: MetricToken;

    let RevenueShareFactory: RevenueShare__factory;
    let RevenueShare: RevenueShare;

    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        MetricTokenFactory = <MetricToken__factory>await ethers.getContractFactory("MetricToken");
        MetricToken = await MetricTokenFactory.deploy();

        RevenueShareFactory = <RevenueShare__factory>await ethers.getContractFactory("RevenueShare");
        RevenueShare = await RevenueShareFactory.deploy(MetricToken.address, "METRIC Revenue Share", "rsMETRIC");

    });

    describe("Deployment", function () {
        it("Should assign MetricToken as underlying asset for RevenueShare", async function () {
            expect(await RevenueShare.underlying()).to.equal(MetricToken.address);
            expect(await RevenueShare.balanceUnderlying()).to.be.equal(0);
            expect(await RevenueShare.sharePrice()).to.be.equal("1000000000000000000");
        });
    });

    describe("Transactions", function () {

        describe("Calls to RevenueShare.enter", function (){

            beforeEach(async function() {
                await MetricToken.connect(addr2).mint(100);
            });

            it("Should fail if user has no MetricToken", async function () {
                expect(RevenueShare.connect(addr1).enter(1))
                    .to.be.revertedWith("revert ERC20: transfer amount exceeds balance");
            });

            it("Should fail if user did not approve MetricToken transfer", async function () {
                expect(RevenueShare.connect(addr2).enter(100))
                    .to.be.revertedWith("revert ERC20: transfer amount exceeds allowance");
            });

            it("Should lock user MetricToken on success", async function () {
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);

                expect(RevenueShare.connect(addr2).enter(100)).to.not.be.reverted;
                expect(await MetricToken.balanceOf(addr2.address)).to.be.equal(0);
                expect(await RevenueShare.balanceUnderlying()).to.be.equal(100);
                expect(await RevenueShare.sharePrice()).to.be.equal("1000000000000000000");
            });

            it("Should mint xMETRIC to user on success", async function () {
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);

                expect(RevenueShare.connect(addr2).enter(100)).to.not.be.reverted;
                expect(await RevenueShare.balanceOf(addr2.address)).to.be.equal(100);
            });

            it("Should burn xMETRIC available in the contract if any", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr2).enter(100);

                await RevenueShare.connect(addr2).transfer(RevenueShare.address, 100);

                await MetricToken.connect(addr1).mint(100);
                await MetricToken.connect(addr1).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr1).enter(50);

                expect(await RevenueShare.balanceOf(RevenueShare.address)).to.be.equal(0);
            });
        });

        describe("Calls to RevenueShare.leave", function () {

            it("Should fail if no one has staked yet", async function() {
                expect(RevenueShare.connect(addr1).leave(100))
                    .to.be.revertedWith("ERC20: burn amount exceeds balance");
            });

            it("Should fail if user provides an amount bigger than their xMETRIC balance", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr2).enter(100);

                expect(RevenueShare.connect(addr1).leave(100))
                    .to.be.revertedWith("ERC20: burn amount exceeds balance");
            });

            it("Should burn user xMETRIC tokens on success", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr2).enter(100);

                expect(RevenueShare.connect(addr2).leave(100)).to.not.be.reverted;
                expect(await RevenueShare.balanceOf(addr2.address)).to.be.equal(0);
            });

            it("Should transfer METRIC tokens to user", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr2).enter(100);
                await RevenueShare.connect(addr2).leave(100);

                expect(await MetricToken.balanceOf(addr2.address)).to.be.equal(100);
            });

            it("Should burn xMETRIC available in the contract if any", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr2).enter(100);

                await MetricToken.connect(addr1).mint(100);
                await MetricToken.connect(addr1).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr1).enter(100);

                await RevenueShare.connect(addr2).transfer(RevenueShare.address, 100);

                await RevenueShare.connect(addr1).leave(100);

                expect(await MetricToken.balanceOf(addr1.address)).to.be.equal(200);
            });

            it("Should return same METRIC amount as staked, if no new revenue received", async function() {
                await MetricToken.connect(owner).mint(50);
                await MetricToken.connect(owner).transfer(RevenueShare.address, 50);
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr2).enter(100);
                await RevenueShare.connect(addr2).leave(100);

                expect(await RevenueShare.balanceOf(addr2.address)).to.be.equal(0);
            });

            it("Should return adjusted METRIC amount from staked, if new revenue received", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr2).enter(100);

                await MetricToken.connect(addr1).mint(100);
                await MetricToken.connect(addr1).approve(RevenueShare.address, 100);
                await RevenueShare.connect(addr1).enter(100);

                await MetricToken.connect(owner).mint(50);
                await MetricToken.connect(owner).transfer(RevenueShare.address, 50);

                await RevenueShare.connect(addr2).leave(100);
                await RevenueShare.connect(addr1).leave(100);

                expect(await MetricToken.balanceOf(addr2.address)).to.be.equal(125);
                expect(await MetricToken.balanceOf(addr1.address)).to.be.equal(125);
            });

        });

    });
});