import { ethers } from "hardhat";
import {ERC20} from "../../typechain";

export async function sendFees() {
    const [wallet] = await ethers.getSigners();

    const contractAddress = process.env.FANTOM_LP_SHARE_CONTRACT;
    const LpTokenAddress = process.env.FANTOM_LP_TOKEN;

    if (LpTokenAddress && contractAddress) {
        const lpToken = <ERC20> await ethers.getContractAt("ERC20", LpTokenAddress);
        await lpToken.transfer(
            contractAddress,
            ethers.utils.parseEther("0.000064982449751016")
        );
    }
}

async function main() {
    await sendFees();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
