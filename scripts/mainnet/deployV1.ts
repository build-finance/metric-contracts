import { ethers } from 'hardhat';
import {
    Controller,
    Controller__factory,
    FeeConverter__factory,
    RevenueShare__factory,
    RevenueShareVault__factory,
    UniswapV2SwapRouter__factory
} from "../../typechain";

async function main() {

    const gasPrice = 6000000000;
    const [deployer] = await ethers.getSigners();

    let UNISWAP_SWAP_ROUTER_ADDRESS = "0xC0D469d5fa25Ef2Fdf0bb111e96f1f93f5B4c588";
    let CONTROLLER = "0xc96e4cAa735184E68E53E130cDb59ce13C8EbeC1";
    let METRIC_SHARE = "0xdBd974ec753054e78Aa8Eb959761e3d22C632490";
    let METRIC_TOKEN = "0xefc1c73a3d8728dc4cf2a18ac5705fe93e5914ac";
    let METRIC_ETH_UNI_V2_LP_TOKEN = "0xa7d707118c02dCd2beA94Ff05664DB51363c47BD";

    console.log(
        "Deploying contracts with the account:",
        deployer.address
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const MetricShareVault: RevenueShareVault__factory =
        <RevenueShareVault__factory>await ethers.getContractFactory("RevenueShareVault");

    const metricShareVault = await MetricShareVault.deploy(
        METRIC_ETH_UNI_V2_LP_TOKEN,
        METRIC_TOKEN,
        "Metric UNI-V2 Revenue Share",
        "xUNI-V2",
        UNISWAP_SWAP_ROUTER_ADDRESS,
        {
            gasPrice: gasPrice
        }
    );

    console.log("MetricShareVault address:", metricShareVault.address);

    const FeeConverter: FeeConverter__factory =
        <FeeConverter__factory>await ethers.getContractFactory("FeeConverter");
    const feeConverter = await FeeConverter.deploy(
        CONTROLLER,
        {
            gasPrice: gasPrice
        }
    );

    console.log("FeeConverter address:", feeConverter.address);

    const controller: Controller =
        <Controller>await ethers.getContractAt("Controller", CONTROLLER);

    await controller.setRewardReceivers([
            {
                receiver: METRIC_SHARE,
                share: ethers.utils.parseEther("40")
            },
            {
                receiver: metricShareVault.address,
                share: ethers.utils.parseEther("60")
            }
        ],
        {
            gasPrice: gasPrice
        })
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });