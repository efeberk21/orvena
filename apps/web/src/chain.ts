import { isAddress, type Address } from 'viem';
import { createRegistryReader, createApprovalReader } from '@orvena/sdk';

export const chainId = Number(import.meta.env.VITE_CHAIN_ID || 10143);
if (![10143, 31337].includes(chainId)) throw new Error('Only Monad testnet and the local development chain are supported.');
export const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS as Address | undefined;
export const registry = registryAddress && isAddress(registryAddress)
  ? createRegistryReader({ address: registryAddress, rpcUrl: import.meta.env.VITE_MONAD_RPC_URL, chainId })
  : null;
export const explorerUrl = chainId === 10143 ? 'https://testnet.monadscan.com' : null;
export const approvalsAddress = import.meta.env.VITE_APPROVALS_ADDRESS && isAddress(import.meta.env.VITE_APPROVALS_ADDRESS) ? import.meta.env.VITE_APPROVALS_ADDRESS as Address : undefined;
export const approvals = approvalsAddress ? createApprovalReader({ address: approvalsAddress, rpcUrl: import.meta.env.VITE_MONAD_RPC_URL, chainId }) : null;
export function requireRegistry() {
  if (!registry || !registryAddress) throw new Error('The registry has not been deployed and configured yet.');
  return { reader: registry, address: registryAddress };
}
