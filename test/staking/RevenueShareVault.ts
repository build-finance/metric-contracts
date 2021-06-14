import { expect } from "chai";
import { ethers } from 'hardhat';
const hre = require("hardhat");

import {
    IERC20,
    RevenueShareVault,
    RevenueShareVault__factory,
    UniswapV2SwapRouter,
    UniswapV2SwapRouter__factory
} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

describe("RevenueShareVault contract", function () {

    let UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let METRIC_ETH_UNI_V2_LP_TOKEN = "0xa7d707118c02dCd2beA94Ff05664DB51363c47BD";
    let METRIC_TOKEN = "0xEfc1C73A3D8728Dc4Cf2A18ac5705FE93E5914AC";
    let METRIC_FEE_RECIPIENT_ADDRESS = "0x52427b0035f494a21a0a4a1abe04d679f789c821";
    let WETH_TOKEN = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

    let RevenueShareVaultFactory: RevenueShareVault__factory;
    let RevenueShareVault: RevenueShareVault;

    let uniswapV2SwapRouterFactory: UniswapV2SwapRouter__factory;
    let uniswapV2SwapRouter: UniswapV2SwapRouter;

    let owner: SignerWithAddress;
    let metricFeeRecipient: SignerWithAddress;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        uniswapV2SwapRouterFactory =
            <UniswapV2SwapRouter__factory>await ethers.getContractFactory("UniswapV2SwapRouter");
        uniswapV2SwapRouter = await uniswapV2SwapRouterFactory.deploy(UNISWAP_ROUTER_ADDRESS);

        RevenueShareVaultFactory = <RevenueShareVault__factory>await ethers.getContractFactory("RevenueShareVault");
        RevenueShareVault = await RevenueShareVaultFactory.deploy(
            METRIC_ETH_UNI_V2_LP_TOKEN,
            METRIC_TOKEN,
            "METRIC Revenue LP Share",
            "lrsMETRIC",
            uniswapV2SwapRouter.address
        );

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [METRIC_FEE_RECIPIENT_ADDRESS]}
        );
        metricFeeRecipient = await ethers.getSigner(METRIC_FEE_RECIPIENT_ADDRESS);
    });

    describe("Deployment", function () {
        it("Should assign MetricToken LP as underlying asset for RevenueShareVault", async function () {
            expect(await RevenueShareVault.underlying()).to.be.equal(METRIC_ETH_UNI_V2_LP_TOKEN);
            expect(await RevenueShareVault.swapRouter()).to.be.equal(uniswapV2SwapRouter.address);
            expect(await RevenueShareVault.revenueToken()).to.be.equal(METRIC_TOKEN);
        });
    });

    describe("Transactions", function () {

        it("Should correctly perform compound and generate extra LP tokens", async function () {

            let metricLp: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_ETH_UNI_V2_LP_TOKEN));
            let metric: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_TOKEN));
            let weth: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", WETH_TOKEN));
            await metric.connect(metricFeeRecipient).transfer(RevenueShareVault.address, ethers.utils.parseEther("10"));

            await RevenueShareVault.compound();

            expect(await metricLp.balanceOf(RevenueShareVault.address)).to.be.equal(ethers.utils.parseEther("0.079309268623665039"));
            expect(await metric.balanceOf(RevenueShareVault.address)).to.be.equal(ethers.utils.parseEther("0.008329361038839100"));
            expect(await weth.balanceOf(RevenueShareVault.address)).to.be.equal(0);

            expect(await metric.balanceOf(uniswapV2SwapRouter.address)).to.be.equal(0);
            expect(await weth.balanceOf(uniswapV2SwapRouter.address)).to.be.equal(0);
        });

    });
});