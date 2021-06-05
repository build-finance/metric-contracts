import { expect } from "chai";
import { ethers } from 'hardhat';
const hre = require("hardhat");

import {
    IERC20,
    UniswapV2BatchSwapRouter,
    UniswapV2BatchSwapRouter__factory,
} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber} from "ethers";

describe("UniswapV2BatchSwapRouter contract", function () {

    let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    let UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let METRIC_FEE_RECIPIENT_ADDRESS = "0x52427b0035f494a21a0a4a1abe04d679f789c821";

    let WETH_TOKEN = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    let WETH_BALANCE = BigNumber.from("405758459293434584");

    let DPI_TOKEN = "0x1494ca1f11d487c2bbe4543e90080aeba4ba3c2b";
    let DPI_BALANCE = BigNumber.from("1763860847159779648");

    let AAVE_TOKEN = "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9";
    let AAVE_BALANCE = BigNumber.from("1281525376981360555");

    let METRIC_TOKEN = "0xefc1c73a3d8728dc4cf2a18ac5705fe93e5914ac";
    let METRIC_BALANCE = BigNumber.from("3649314699743717646683");

    let uniswapV2BatchSwapRouterFactory: UniswapV2BatchSwapRouter__factory;
    let uniswapV2BatchSwapRouter: UniswapV2BatchSwapRouter;

    let owner: SignerWithAddress;
    let metricFeeRecipient: SignerWithAddress;

    beforeEach(async function () {

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [METRIC_FEE_RECIPIENT_ADDRESS]}
        );

        [owner] = await ethers.getSigners();
        metricFeeRecipient = await ethers.getSigner(METRIC_FEE_RECIPIENT_ADDRESS);

        uniswapV2BatchSwapRouterFactory =
            <UniswapV2BatchSwapRouter__factory>await ethers.getContractFactory("UniswapV2BatchSwapRouter");

        uniswapV2BatchSwapRouter =
            await uniswapV2BatchSwapRouterFactory.deploy(UNISWAP_ROUTER_ADDRESS);
    });

    describe("Deployment", function () {
        it("Should correctly assign different controller attributes", async function () {
            expect(await uniswapV2BatchSwapRouter.uniswapRouter()).to.eql(UNISWAP_ROUTER_ADDRESS);
        });
    });

    describe("Transactions", function () {

        it("Should revert when asked convert METRIC into METRIC", async function () {

            expect(uniswapV2BatchSwapRouter
                .connect(metricFeeRecipient)
                .batchSellTokens(
                    [METRIC_TOKEN],
                    [METRIC_BALANCE],
                    [BigNumber.from(0)],
                    METRIC_TOKEN
                )).to.be.revertedWith("Output token must not be given in input");
        });

        it("Should revert when asked convert ETH value different from ETH sent in the call", async function () {
            expect(uniswapV2BatchSwapRouter
                .connect(metricFeeRecipient)
                .batchSellTokens(
                    [ZERO_ADDRESS],
                    [ethers.utils.parseEther("1.0")],
                    [BigNumber.from(0)],
                    METRIC_TOKEN,
                    {
                        value: ethers.utils.parseEther("0.5")
                    }
                )).to.be.revertedWith("ETH amount to convert does not match transaction value");
        });

        it("Should revert when ETH value is provided but no ETH conversion is in the parameter list", async function () {
            expect(uniswapV2BatchSwapRouter
                .connect(metricFeeRecipient)
                .batchSellTokens(
                    [],
                    [],
                    [],
                    METRIC_TOKEN,
                    {
                        value: ethers.utils.parseEther("0.5")
                    }
                )).to.be.revertedWith(" Call contains ETH value but no ETH conversion in parameters");
        });

        it("Should correctly convert ETH into METRIC", async function () {

            let metricToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_TOKEN));
            let originalBalance = await metricToken.balanceOf(metricFeeRecipient.address);

            await uniswapV2BatchSwapRouter
                .connect(metricFeeRecipient)
                .batchSellTokens(
                    [ZERO_ADDRESS],
                    [ethers.utils.parseEther("1.0")],
                    [BigNumber.from(0)],
                    METRIC_TOKEN,
                    {
                        value: ethers.utils.parseEther("1.0")
                    }
                );

            expect(await metricToken.balanceOf(metricFeeRecipient.address)).to.be.gt(originalBalance);
            expect(await metricToken.balanceOf(uniswapV2BatchSwapRouter.address)).to.be.equal(BigNumber.from(0));
            expect(await ethers.getDefaultProvider().getBalance(uniswapV2BatchSwapRouter.address)).to.be.equal(BigNumber.from(0));
        });

        it("Should correctly convert WETH into METRIC", async function () {

            let metricToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_TOKEN));
            let wethToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", WETH_TOKEN));

            await wethToken.connect(metricFeeRecipient).approve(uniswapV2BatchSwapRouter.address, WETH_BALANCE);
            let originalBalance = await metricToken.balanceOf(metricFeeRecipient.address);

            await uniswapV2BatchSwapRouter
                .connect(metricFeeRecipient)
                .batchSellTokens(
                    [WETH_TOKEN],
                    [WETH_BALANCE],
                    [BigNumber.from(0)],
                    METRIC_TOKEN
                );

            expect(await metricToken.balanceOf(metricFeeRecipient.address)).to.be.gt(originalBalance);
            expect(await metricToken.balanceOf(uniswapV2BatchSwapRouter.address)).to.be.equal(BigNumber.from(0));
            expect(await wethToken.balanceOf(uniswapV2BatchSwapRouter.address)).to.be.equal(BigNumber.from(0));
        });

        it("Should correctly convert ERC20 tokens into METRIC", async function () {

            let aaveToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", AAVE_TOKEN));
            let dpiToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", DPI_TOKEN));
            let metricToken: IERC20 = <IERC20>(await ethers.getContractAt("IERC20", METRIC_TOKEN));

            await aaveToken.connect(metricFeeRecipient).approve(uniswapV2BatchSwapRouter.address, AAVE_BALANCE);
            await dpiToken.connect(metricFeeRecipient).approve(uniswapV2BatchSwapRouter.address, DPI_BALANCE);

            let originalBalance = await metricToken.balanceOf(metricFeeRecipient.address);

            await uniswapV2BatchSwapRouter
                .connect(metricFeeRecipient)
                .batchSellTokens(
                [AAVE_TOKEN, DPI_TOKEN],
                        [AAVE_BALANCE, DPI_BALANCE],
                [BigNumber.from(0), BigNumber.from(0)],
                METRIC_TOKEN
            );

            expect(await metricToken.balanceOf(metricFeeRecipient.address)).to.be.gt(originalBalance);
            expect(await aaveToken.balanceOf(uniswapV2BatchSwapRouter.address)).to.be.equal(BigNumber.from(0));
            expect(await dpiToken.balanceOf(uniswapV2BatchSwapRouter.address)).to.be.equal(BigNumber.from(0));
            expect(await metricToken.balanceOf(uniswapV2BatchSwapRouter.address)).to.be.equal(BigNumber.from(0));
        });
    });

});