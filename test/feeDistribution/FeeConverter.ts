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
    UniswapV2BatchSwapRouter,
    UniswapV2BatchSwapRouter__factory,
    ZeroXProtocolMarketMakerFeeCollector,
    ZeroXProtocolMarketMakerFeeCollector__factory
} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber} from "ethers";

describe("FeeConverter contract", function () {

    let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    let UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let METRIC_TOKEN = "0xefc1c73a3d8728dc4cf2a18ac5705fe93e5914ac";
    let METRIC_ETH_UNI_V2_LP_TOKEN = "0xa7d707118c02dCd2beA94Ff05664DB51363c47BD";
    let WETH_TOKEN = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

    let METRIC_FEE_RECIPIENT_ADDRESS = "0x52427b0035f494a21a0a4a1abe04d679f789c821";
    let BUILD_TOKEN = "0x6e36556b3ee5aa28def2a8ec3dae30ec2b208739";

    let feeConverterFactory: FeeConverter__factory;
    let feeConverter: FeeConverter;

    let controllerFactory: Controller__factory;
    let controller: Controller;

    let uniswapV2BatchSwapRouterFactory: UniswapV2BatchSwapRouter__factory;
    let uniswapV2BatchSwapRouter: UniswapV2BatchSwapRouter;

    let metricShareFactory: RevenueShare__factory;
    let metricShare: RevenueShare;
    let metricSharePool2: RevenueShare;

    let zeroXFeeCollectorFactory: ZeroXProtocolMarketMakerFeeCollector__factory;
    let zeroXFeeCollector: ZeroXProtocolMarketMakerFeeCollector;

    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let metricFeeRecipient: SignerWithAddress;

    beforeEach(async function () {

        [owner, user] =
            await ethers.getSigners();

        uniswapV2BatchSwapRouterFactory =
            <UniswapV2BatchSwapRouter__factory>await ethers.getContractFactory("UniswapV2BatchSwapRouter");
        metricShareFactory = <RevenueShare__factory>await ethers.getContractFactory("RevenueShare");
        controllerFactory = <Controller__factory>await ethers.getContractFactory("Controller");
        feeConverterFactory = <FeeConverter__factory>await ethers.getContractFactory("FeeConverter");
        zeroXFeeCollectorFactory =
            <ZeroXProtocolMarketMakerFeeCollector__factory>
                await ethers.getContractFactory("ZeroXProtocolMarketMakerFeeCollector");

        uniswapV2BatchSwapRouter = await uniswapV2BatchSwapRouterFactory.deploy(UNISWAP_ROUTER_ADDRESS);
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
                [],
                uniswapV2BatchSwapRouter.address,
                BigNumber.from("1000000000000000000"),
                METRIC_TOKEN
            );

        feeConverter = await feeConverterFactory.deploy(controller.address);

        zeroXFeeCollector = await zeroXFeeCollectorFactory.deploy(WETH_TOKEN, feeConverter.address);

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
        it("Should not allow conversions if controller is paused", async function () {
            await controller.pause();
            expect(feeConverter.convertTokens([], [], [], []))
                .to.be.revertedWith("Forbidden: System is paused");
        });
        it("Should revert if number of tokens is different for input amounts", async function () {
            expect(feeConverter.convertTokens(
                [METRIC_TOKEN], [], [], []
            ))
                .to.be.revertedWith("inputAmounts list length must match tokens list length");
        });
        it("Should revert if number of tokens is different for output minimum amounts", async function () {
            expect(feeConverter.convertTokens(
                [METRIC_TOKEN], [BigNumber.from(1)], [], []
            ))
                .to.be.revertedWith("minOutputs list length must match tokens list length");
        });
        it("Should be able to correctly convert ETH & ERC20 tokens", async function(){
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

            await feeConverter.connect(user).convertTokens(
                [ZERO_ADDRESS, BUILD_TOKEN],
                    [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("10.0")],
                [BigNumber.from(0), BigNumber.from(0)],
                []
            );

            expect(await metricToken.balanceOf(feeConverter.address)).to.be.equal(0);
            expect(await buildToken.balanceOf(feeConverter.address)).to.be.equal(0);
            expect(await ethers.provider.getBalance(feeConverter.address)).to.be.equal(0);
            expect(await metricToken.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("9.821108685826061333"));
            expect(await metricToken.balanceOf(metricShare.address)).to.be.equal(ethers.utils.parseEther("388.915903958712028791"));
            expect(await metricToken.balanceOf(metricSharePool2.address)).to.be.equal(ethers.utils.parseEther("583.373855938068043188"));

        });
        it("Should approve token for router only when needed", async function(){
            let buildToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", BUILD_TOKEN));

            await buildToken.connect(metricFeeRecipient).transfer(feeConverter.address, ethers.utils.parseEther("2.0"))

            await feeConverter.connect(user).convertTokens(
                [BUILD_TOKEN],
                [ethers.utils.parseEther("1.0")],
                [BigNumber.from(0)],
                []
            );

            await feeConverter.connect(user).convertTokens(
                [BUILD_TOKEN],
                [ethers.utils.parseEther("1.0")],
                [BigNumber.from(0)],
                []
            );

        });
        it("Should revert if called with more feeCollector params than available", async function(){
            await controller.setFeeCollectors([zeroXFeeCollector.address]);

            expect(feeConverter.connect(user).convertTokens(
                [WETH_TOKEN],
                [ethers.utils.parseEther("1.0")],
                [BigNumber.from(0)],
                [{call: true, parameters: []}, {call: false, parameters: []}]
            )).to.be.revertedWith("Must provide parameters to all known collectors");

        });
        it("Should no call fee collector if call param is set to false", async function(){
            await controller.setFeeCollectors([zeroXFeeCollector.address]);

            await feeConverter.connect(user).convertTokens(
                [],
                [],
                [],
                [{call: false, parameters: []}]
            );

        });
        it("Should be able to correctly collect & convert WETH form zeroXCollector", async function(){
            let wethToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", WETH_TOKEN));
            let metricToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_TOKEN));

            await wethToken.connect(metricFeeRecipient).transfer(zeroXFeeCollector.address, ethers.utils.parseEther("1.0"))

            await controller.setFeeCollectors([zeroXFeeCollector.address]);

            await feeConverter.connect(user).convertTokens(
                [WETH_TOKEN],
                [ethers.utils.parseEther("1.0")],
                [BigNumber.from(0)],
                [{call: true, parameters: []}]
            );

            expect(await metricToken.balanceOf(feeConverter.address)).to.be.equal(0);
            expect(await wethToken.balanceOf(feeConverter.address)).to.be.equal(0);
            expect(await metricToken.balanceOf(user.address)).to.be.equal(ethers.utils.parseEther("15.511448750565022108"));
            expect(await metricToken.balanceOf(metricShare.address)).to.be.equal(ethers.utils.parseEther("221.527126267928288741"));
            expect(await metricToken.balanceOf(metricSharePool2.address)).to.be.equal(ethers.utils.parseEther("332.290689401892433112"));

        });
    });

});