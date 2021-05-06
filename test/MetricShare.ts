import { expect } from "chai";
import { ethers } from 'hardhat';

import {
    MetricShare,
    MetricShare__factory,
    MetricToken,
    MetricToken__factory
} from "../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

describe("MetricShare contract", function () {

    let MetricTokenFactory: MetricToken__factory;
    let MetricToken: MetricToken;

    let MetricShareFactory: MetricShare__factory;
    let MetricShare: MetricShare;

    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        MetricTokenFactory = <MetricToken__factory>await ethers.getContractFactory("MetricToken");
        MetricToken = await MetricTokenFactory.deploy();

        MetricShareFactory = <MetricShare__factory>await ethers.getContractFactory("MetricShare");
        MetricShare = await MetricShareFactory.deploy(MetricToken.address);

    });

    describe("Deployment", function () {
        it("Should assign MetricToken as underlying asset for MetricShare", async function () {
            expect(await MetricShare.metric()).to.equal(MetricToken.address);
        });
    });

    describe("Transactions", function () {

        describe("Calls to MetricShare.enter", function (){

            beforeEach(async function() {
                await MetricToken.connect(addr2).mint(100);
            });

            it("Should fail if user has no MetricToken", async function () {
                expect(MetricShare.connect(addr1).enter(1))
                    .to.be.revertedWith("revert ERC20: transfer amount exceeds balance");
            });

            it("Should fail if user did not approve MetricToken transfer", async function () {
                expect(MetricShare.connect(addr2).enter(100))
                    .to.be.revertedWith("revert ERC20: transfer amount exceeds allowance");
            });

            it("Should lock user MetricToken on success", async function () {
                await MetricToken.connect(addr2).approve(MetricShare.address, 100);

                expect(MetricShare.connect(addr2).enter(100)).to.not.be.reverted;
                expect(await MetricToken.balanceOf(addr2.address)).to.be.equal(0);

            });

            it("Should mint xMETRIC to user on success", async function () {
                await MetricToken.connect(addr2).approve(MetricShare.address, 100);

                expect(MetricShare.connect(addr2).enter(100)).to.not.be.reverted;
                expect(await MetricShare.balanceOf(addr2.address)).to.be.equal(100);
            });
        });

        describe("Calls to MetricShare.leave", function () {

            it("Should fail if no one has staked yet", async function() {
                expect(MetricShare.connect(addr1).leave(100))
                    .to.be.revertedWith("ERC20: burn amount exceeds balance");
            });

            it("Should fail if user provides an amount bigger than their xMETRIC balance", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(MetricShare.address, 100);
                await MetricShare.connect(addr2).enter(100);

                expect(MetricShare.connect(addr1).leave(100))
                    .to.be.revertedWith("ERC20: burn amount exceeds balance");
            });

            it("Should burn user xMETRIC tokens on success", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(MetricShare.address, 100);
                await MetricShare.connect(addr2).enter(100);

                expect(MetricShare.connect(addr2).leave(100)).to.not.be.reverted;
                expect(await MetricShare.balanceOf(addr2.address)).to.be.equal(0);
            });

            it("Should transfer METRIC tokens to user", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(MetricShare.address, 100);
                await MetricShare.connect(addr2).enter(100);
                await MetricShare.connect(addr2).leave(100);

                expect(await MetricToken.balanceOf(addr2.address)).to.be.equal(100);
            });

            it("Should return same METRIC amount as staked, if no new revenue received", async function() {
                await MetricToken.connect(owner).mint(50);
                await MetricToken.connect(owner).transfer(MetricShare.address, 50);
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(MetricShare.address, 100);
                await MetricShare.connect(addr2).enter(100);
                await MetricShare.connect(addr2).leave(100);

                expect(await MetricShare.balanceOf(addr2.address)).to.be.equal(0);
            });

            it("Should return adjusted METRIC amount from staked, if new revenue received", async function() {
                await MetricToken.connect(addr2).mint(100);
                await MetricToken.connect(addr2).approve(MetricShare.address, 100);
                await MetricShare.connect(addr2).enter(100);

                await MetricToken.connect(addr1).mint(100);
                await MetricToken.connect(addr1).approve(MetricShare.address, 100);
                await MetricShare.connect(addr1).enter(100);

                await MetricToken.connect(owner).mint(50);
                await MetricToken.connect(owner).transfer(MetricShare.address, 50);

                await MetricShare.connect(addr2).leave(100);
                await MetricShare.connect(addr1).leave(100);

                expect(await MetricToken.balanceOf(addr2.address)).to.be.equal(125);
                expect(await MetricToken.balanceOf(addr1.address)).to.be.equal(125);
            });
        });

    });
});