import { expect } from "chai";
import { ethers } from 'hardhat';
const hre = require("hardhat");

import {
    Controller,
    Controller__factory,
    FeeConverter,
    FeeConverter__factory,
    IERC20,
    RevenueShare,
    RevenueShare__factory,
    UniswapV2SwapRouter,
    UniswapV2SwapRouter__factory
} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber} from "ethers";

describe("FeeConverter contract", function () {

    let UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let METRIC_TOKEN = "0xefc1c73a3d8728dc4cf2a18ac5705fe93e5914ac";

    let METRIC_FEE_RECIPIENT_ADDRESS = "0x52427b0035f494a21a0a4a1abe04d679f789c821";
    let BUILD_TOKEN = "0x6e36556b3ee5aa28def2a8ec3dae30ec2b208739";
    let DPI_TOKEN = "0x1494ca1f11d487c2bbe4543e90080aeba4ba3c2b";
    let WETH_TOKEN = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

    let feeConverterFactory: FeeConverter__factory;
    let feeConverter: FeeConverter;

    let controllerFactory: Controller__factory;
    let controller: Controller;

    let uniswapV2SwapRouterFactory: UniswapV2SwapRouter__factory;
    let uniswapV2SwapRouter: UniswapV2SwapRouter;

    let metricShareFactory: RevenueShare__factory;
    let metricShare: RevenueShare;
    let metricSharePool2: RevenueShare;

    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let metricFeeRecipient: SignerWithAddress;

    beforeEach(async function () {

        [owner, user] =
            await ethers.getSigners();

        uniswapV2SwapRouterFactory =
            <UniswapV2SwapRouter__factory>await ethers.getContractFactory("UniswapV2SwapRouter");
        metricShareFactory = <RevenueShare__factory>await ethers.getContractFactory("RevenueShare");
        controllerFactory = <Controller__factory>await ethers.getContractFactory("Controller");
        feeConverterFactory = <FeeConverter__factory>await ethers.getContractFactory("FeeConverter");

        uniswapV2SwapRouter = await uniswapV2SwapRouterFactory.deploy(UNISWAP_ROUTER_ADDRESS);
        metricShare = await metricShareFactory.deploy(METRIC_TOKEN, "Metric Revenue Share", "rsMETRIC");
        metricSharePool2 = await metricShareFactory.deploy(METRIC_TOKEN, "Metric Revenue Share pool 2", "rs2METRIC");

        controller =
            await controllerFactory.deploy(
                [{
                    receiver: metricShare.address,
                    share: BigNumber.from("40000000000000000000")
                }, {
                    receiver: metricSharePool2.address,
                    share: BigNumber.from("60000000000000000000")
                }],
                uniswapV2SwapRouter.address,
                BigNumber.from("1000000000000000000"),
                METRIC_TOKEN
            );

        feeConverter = await feeConverterFactory.deploy(controller.address);

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [METRIC_FEE_RECIPIENT_ADDRESS]}
        );
        metricFeeRecipient = await ethers.getSigner(METRIC_FEE_RECIPIENT_ADDRESS);

    });

    describe("Deployment", function () {
        it("Should correctly point to controller contract", async function () {
            expect(await feeConverter.controller()).to.eql(controller.address);
        });
    });

    describe("Transactions", function () {
        it("Should not allow ETH wrap if controller is paused", async function () {
            await controller.pause();
            expect(feeConverter.wrapETH())
                .to.be.revertedWith("Forbidden: System is paused");
        });
        it("Should not allow Reward distribution if controller is paused", async function () {
            await controller.pause();
            expect(feeConverter.transferRewardTokenToReceivers())
                .to.be.revertedWith("Forbidden: System is paused");
        });
        it("Should not allow conversions if controller is paused", async function () {
            await controller.pause();
            expect(feeConverter.convertToken(
                BUILD_TOKEN,
                BigNumber.from(1),
                BigNumber.from(1),
                owner.address
            ))
                .to.be.revertedWith("Forbidden: System is paused");
        });
        it("Should be able to correctly wrap ETH", async function(){
            let weth: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", WETH_TOKEN));

            await metricFeeRecipient.sendTransaction({
                value: ethers.utils.parseEther("1.0"),
                to: feeConverter.address
            });

            await feeConverter.connect(user).wrapETH();

            expect(await weth.balanceOf(feeConverter.address)).to.be.equal(ethers.utils.parseEther("1"));
            expect(await ethers.provider.getBalance(feeConverter.address)).to.be.equal(0);


        });
        it("Should not fail wrapping ETH if there is no ETH", async function(){
            let weth: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", WETH_TOKEN));

            await feeConverter.connect(user).wrapETH();
            expect(await weth.balanceOf(feeConverter.address)).to.be.equal(0);
        });
        it("Should be able to correctly distribute rewards", async function(){
            let metric: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_TOKEN));

            await metric.connect(metricFeeRecipient).transfer(feeConverter.address, ethers.utils.parseEther("100"));
            await feeConverter.connect(user).transferRewardTokenToReceivers();

            expect(await metric.balanceOf(metricShare.address)).to.be.equal(ethers.utils.parseEther("40"));
            expect(await metric.balanceOf(metricSharePool2.address)).to.be.equal(ethers.utils.parseEther("60"));


        });
        it("Should be able to correctly convert ERC20 token", async function(){
            let buildToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", BUILD_TOKEN));
            let metricToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_TOKEN));

            await buildToken.connect(metricFeeRecipient).transfer(feeConverter.address, ethers.utils.parseEther("10.0"))

            await metricFeeRecipient.sendTransaction({
                value: ethers.utils.parseEther("1.0"),
                to: feeConverter.address
            });

            expect(await metricToken.balanceOf(feeConverter.address)).to.be.equal(0);
            expect(await buildToken.balanceOf(feeConverter.address)).to.be.equal(ethers.utils.parseEther("10.0"));
            expect(await ethers.provider.getBalance(feeConverter.address)).to.be.equal(ethers.utils.parseEther("1.0"));

            await feeConverter.connect(user).convertToken(
                BUILD_TOKEN,
                ethers.utils.parseEther("10.0"),
                BigNumber.from(0),
                user.address
            );

            expect(await metricToken.balanceOf(feeConverter.address)).to.be.equal(ethers.utils.parseEther("82.723557624339902191"));
            expect(await buildToken.balanceOf(feeConverter.address)).to.be.equal(0);
            expect(await metricToken.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("0.835591491154948506"));

        });
        it("Should approve token for router only when needed", async function(){
            let buildToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", BUILD_TOKEN));

            await buildToken.connect(metricFeeRecipient).transfer(feeConverter.address, ethers.utils.parseEther("2.0"))

            await feeConverter.connect(user).convertToken(
                BUILD_TOKEN,
                ethers.utils.parseEther("1.0"),
                BigNumber.from(0),
                user.address
            );

            await feeConverter.connect(user).convertToken(
                BUILD_TOKEN,
                ethers.utils.parseEther("1.0"),
                BigNumber.from(0),
                user.address
            );

        });
        it("Should not fail when batching multiple valid calls", async function() {

            let dpiToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", DPI_TOKEN));
            let metric: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_TOKEN));
            await dpiToken.connect(metricFeeRecipient).transfer(feeConverter.address, ethers.utils.parseEther("1.0"))

            await feeConverter.connect(user).multicall(
                [
                    feeConverter.interface.encodeFunctionData("wrapETH"),
                    feeConverter.interface.encodeFunctionData("convertToken", [
                        DPI_TOKEN,
                        ethers.utils.parseEther("1.0"),
                        BigNumber.from(0),
                        user.address
                    ]),
                    feeConverter.interface.encodeFunctionData("transferRewardTokenToReceivers")
                ]
            );

            expect(await metric.balanceOf(metricShare.address)).to.be.equal(ethers.utils.parseEther("63.721694000939713731"));
            expect(await metric.balanceOf(metricSharePool2.address)).to.be.equal(ethers.utils.parseEther("95.582541001409570598"));
        })
    });

});