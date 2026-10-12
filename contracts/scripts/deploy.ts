import { ethers } from "hardhat";

// Mezo Testnet — must match src/config/contracts.ts in the Alto frontend.
const BORROWER_OPERATIONS = "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5";
const STABILITY_POOL = "0x1CCA7E410eE41739792eA0A24e00349Dd247680e";
const MUSD_TOKEN = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  if (deployer === undefined) {
    throw new Error(
      "No deployer account — set PRIVATE_KEY env var (never commit it). " +
        "Example: PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network mezoTestnet",
    );
  }

  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "BTC",
  );

  const Router = await ethers.getContractFactory("AltoRouter");
  const router = await Router.deploy(
    BORROWER_OPERATIONS,
    STABILITY_POOL,
    MUSD_TOKEN,
  );
  await router.waitForDeployment();

  console.log("AltoRouter deployed to:", await router.getAddress());
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
