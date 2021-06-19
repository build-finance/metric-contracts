import { ethers } from 'hardhat';
import {Controller} from "../../typechain";

async function main() {

    const gasPrice = 15000000000;
    const [deployer] = await ethers.getSigners();

    let CONTROLLER = "0xc96e4cAa735184E68E53E130cDb59ce13C8EbeC1";
    let METRIC_SHARE = "0xdBd974ec753054e78Aa8Eb959761e3d22C632490";
    let METRIC_SHARE_VAULT = "0x04d69Aec4eFdb5613120758d6c4cDB970f64a4E5";

    console.log(
        "Action performed with the account:",
        deployer.address
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const controller: Controller =
        <Controller>await ethers.getContractAt("Controller", CONTROLLER);

    await controller.setRewardReceivers([
        {
            receiver: METRIC_SHARE,
            share: ethers.utils.parseEther("40")
        },
        {
            receiver: METRIC_SHARE_VAULT,
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