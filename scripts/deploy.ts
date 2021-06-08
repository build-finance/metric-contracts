import { ethers } from 'hardhat';
import {
    Controller__factory, FeeConverter__factory,
    HidingGameRewardsCollector__factory,
    RevenueShare__factory,
    UniswapV2BatchSwapRouter__factory,
    ZeroXProtocolMarketMakerFeeCollector__factory
} from "../typechain";

async function main() {

    const [deployer] = await ethers.getSigners();

    let UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let METRIC_TOKEN = "0xefc1c73a3d8728dc4cf2a18ac5705fe93e5914ac";
    let METRIC_ETH_UNI_V2_LP_TOKEN = "0xa7d707118c02dCd2beA94Ff05664DB51363c47BD";
    let WETH_TOKEN = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    let HIDING_GAME_REWARD_CONTRACT = "";

    console.log(
        "Deploying contracts with the account:",
        deployer.address
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const MetricShare: RevenueShare__factory =
        <RevenueShare__factory>await ethers.getContractFactory("RevenueShare");

    const metricShare = await MetricShare.deploy(METRIC_TOKEN, "Metric Revenue Share", "rsMETRIC");

    console.log("MetricShare address:", metricShare.address);

    const UniswapBatchRouter: UniswapV2BatchSwapRouter__factory =
        <UniswapV2BatchSwapRouter__factory>await ethers.getContractFactory("UniswapV2BatchSwapRouter");
    const uniswapBatchRouter = await UniswapBatchRouter.deploy(UNISWAP_ROUTER_ADDRESS);

    console.log("UniswapV2BatchSwapRouter address:", uniswapBatchRouter.address);

    const Controller: Controller__factory =
        <Controller__factory>await ethers.getContractFactory("Controller");
    const controller = await Controller.deploy(
        [{
            receiver: metricShare.address,
            share: ethers.utils.parseEther("100.0")
        }],
        [],
        uniswapBatchRouter.address,
        ethers.utils.parseEther("1.0"),
        METRIC_TOKEN
    );

    console.log("Controller address:", controller.address);

    const FeeConverter: FeeConverter__factory =
        <FeeConverter__factory>await ethers.getContractFactory("FeeConverter");
    const feeConverter = await FeeConverter.deploy(controller.address);

    console.log("FeeConverter address:", feeConverter.address);

    // const HidingGameRewardsCollector: HidingGameRewardsCollector__factory =
    //     <HidingGameRewardsCollector__factory>await ethers.getContractFactory("HidingGameRewardsCollector");
    //
    // const hidingGameRewardsCollector = await HidingGameRewardsCollector.deploy(HIDING_GAME_REWARD_CONTRACT);
    //
    // console.log("HidingGameRewardsCollector address:", hidingGameRewardsCollector.address);

    // const ZeroXProtocolMarketMakerFeeCollector: ZeroXProtocolMarketMakerFeeCollector__factory =
    //     <ZeroXProtocolMarketMakerFeeCollector__factory>await ethers.getContractFactory("ZeroXProtocolMarketMakerFeeCollector");
    //
    // const zeroXProtocolMarketMakerFeeCollector = await ZeroXProtocolMarketMakerFeeCollector.deploy(
    //     WETH_TOKEN,
    //     feeConverter.address
    // );
    //
    // console.log("ZeroXProtocolMarketMakerFeeCollector address:", zeroXProtocolMarketMakerFeeCollector.address);
    //
    // await controller.setFeeCollectors([
    //     hidingGameRewardsCollector.address,
    //     zeroXProtocolMarketMakerFeeCollector.address
    // ])
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });