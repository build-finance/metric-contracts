import { ethers } from 'hardhat';
import {
    RevenueShare__factory
} from "../../typechain";

async function main() {

    const gasPrice = 200000000000;
    const [deployer] = await ethers.getSigners();

    let METRIC_LP_TOKEN = "0xe02f47ed61363c971b011b8585037b78a04580df";

    console.log(
        "Deploying contracts with the account:",
        deployer.address
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const MetricShare: RevenueShare__factory =
        <RevenueShare__factory>await ethers.getContractFactory("RevenueShare");

    const metricLpShare = await MetricShare.deploy(
        METRIC_LP_TOKEN,
        "Metric-USDC SSLP Revenue Share",
        "xSPIRIT-LP",
        {
            gasPrice: gasPrice
        }
    );

    console.log("MetricLpShare address:", metricLpShare.address);

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });