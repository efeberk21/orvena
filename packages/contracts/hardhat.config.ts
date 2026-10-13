import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'hardhat/config';
import hardhatViem from '@nomicfoundation/hardhat-viem';
import hardhatNodeTestRunner from '@nomicfoundation/hardhat-node-test-runner';
loadEnv({ path: '../../.env', quiet: true });
export default defineConfig({
  plugins: [hardhatViem, hardhatNodeTestRunner],
  solidity: { version: '0.8.28', settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun', viaIR: true } },
  networks: {
    default: { type: 'edr-simulated', chainType: 'l1' },
    localhost: { type: 'http', chainType: 'l1', url: 'http://127.0.0.1:8545' },
    monadTestnet: { type: 'http', chainType: 'l1', chainId: 10143, url: process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz', accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [] },
  },
});
