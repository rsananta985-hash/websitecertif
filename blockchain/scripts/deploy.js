const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying CertificateRegistry...");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying from account:", deployer.address);

  // ethers v5 API: getBalance on signer, utils.formatEther
  let balance;
  try {
    balance = await deployer.getBalance();
    console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");
  } catch (e) {
    // ethers v6 fallback
    try {
      balance = await ethers.provider.getBalance(deployer.address);
      console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
    } catch (e2) {
      console.log("💰 Account balance: (unable to fetch)");
    }
  }

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy();

  // Support both ethers v5 (deployed()) and v6 (waitForDeployment())
  let address;
  if (typeof registry.deployed === "function") {
    await registry.deployed();
    address = registry.address;
  } else {
    await registry.waitForDeployment();
    address = await registry.getAddress();
  }

  console.log("✅ CertificateRegistry deployed to:", address);

  const prvKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  // Save deployed address for backend reference
  const deployedInfo = {
    address: address,
    deployer: deployer.address,
    privateKey: prvKey,
    network: "localhost",
    rpcUrl: "http://127.0.0.1:8545",
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "..", "deployed_address.json");
  fs.writeFileSync(outPath, JSON.stringify(deployedInfo, null, 2));
  console.log("💾 Saved to:", outPath);

  console.log("\n📋 ============================================");
  console.log("   Update server/.env with:");
  console.log("   BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545");
  console.log("   CONTRACT_ADDRESS=" + address);
  console.log("   PRIVATE_KEY=" + prvKey);
  console.log("=============================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
