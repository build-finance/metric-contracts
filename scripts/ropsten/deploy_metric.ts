import { ethers } from 'hardhat';
import {
    MetricToken__factory
} from "../../typechain";

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log(
        "Deploying contracts with the account:",
        deployer.address
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const MetricToken: MetricToken__factory =
        <MetricToken__factory>await ethers.getContractFactory("MetricToken");

    const metricToken = await MetricToken.deploy();

    console.log("Metric token address:", metricToken.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });