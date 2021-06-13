import { ethers } from 'hardhat';
import {
    Controller__factory,
    FeeConverter__factory,
    RevenueShare__factory,
    RevenueShareVault__factory,
    UniswapV2SwapRouter__factory
} from "../../typechain";

async function main() {

    const [deployer] = await ethers.getSigners();

    let UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let METRIC_TOKEN = "0xefc1c73a3d8728dc4cf2a18ac5705fe93e5914ac";
    let METRIC_ETH_UNI_V2_LP_TOKEN = "0xa7d707118c02dCd2beA94Ff05664DB51363c47BD";

    console.log(
        "Deploying contracts with the account:",
        deployer.address
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const MetricShare: RevenueShare__factory =
        <RevenueShare__factory>await ethers.getContractFactory("RevenueShare");

    const metricShare = await MetricShare.deploy(METRIC_TOKEN, "Metric Revenue Share", "xMETRIC");

    console.log("MetricShare address:", metricShare.address);

    const UniswapRouter: UniswapV2SwapRouter__factory =
        <UniswapV2SwapRouter__factory>await ethers.getContractFactory("UniswapV2SwapRouter");
    const uniswapRouter = await UniswapRouter.deploy(UNISWAP_ROUTER_ADDRESS);

    console.log("UniswapV2SwapRouter address:", uniswapRouter.address);

    const MetricShareVault: RevenueShareVault__factory =
        <RevenueShareVault__factory>await ethers.getContractFactory("RevenueShareVault");

    const metricShareVault = await MetricShareVault.deploy(
        METRIC_ETH_UNI_V2_LP_TOKEN,
        METRIC_TOKEN,
        "Metric LP Revenue Share",
        "xlMETRIC",
        uniswapRouter.address
    );

    console.log("MetricShareVault address:", metricShareVault.address);

    const Controller: Controller__factory =
        <Controller__factory>await ethers.getContractFactory("Controller");
    const controller = await Controller.deploy(
        [{
            receiver: metricShare.address,
            share: ethers.utils.parseEther("40.0")
        },
        {
            receiver: metricShareVault.address,
            share: ethers.utils.parseEther("60.0")
        }],
        uniswapRouter.address,
        ethers.utils.parseEther("2.0"),
        METRIC_TOKEN
    );

    console.log("Controller address:", controller.address);

    const FeeConverter: FeeConverter__factory =
        <FeeConverter__factory>await ethers.getContractFactory("FeeConverter");
    const feeConverter = await FeeConverter.deploy(controller.address);

    console.log("FeeConverter address:", feeConverter.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });