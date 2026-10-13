import { createPublicClient, defineChain, encodeAbiParameters, http, keccak256, parseAbi, stringToHex, type Address, type Hex, type PublicClient } from 'viem';
import { registryAbi } from './abi.js';
export { registryAbi } from './abi.js';
export { approvalsAbi, approvalProtocol, contentCommitment, createApprovalReader, evaluateApproval, parseApprovalPackage, requestContentApproval, zeroApprovalId, type ApprovalPackage, type ApprovalStatus, type ApprovalVerification, type ContentApproval, type ApprovalReader } from './approvals.js';

export const monadTestnet = defineChain({ id: 10143, name: 'Monad Testnet', nativeCurrency: { name: 'Test MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } }, blockExplorers: { default: { name: 'Monadscan', url: 'https://testnet.monadscan.com' } }, testnet: true });
export type ProfileInput = { name: string; bio: string; avatar: Hex; qx: Hex; qy: Hex; rpIdHash: Hex; origin: string };
export type RegistryProfile = ProfileInput & { exists: boolean; verifiedAt: bigint };
export type RegistryActivity = { kind: 'profile-created' | 'profile-updated' | 'passkey-verified' | 'data-recorded'; transactionHash: Hex; block: bigint; logIndex: number; dataHash?: Hex; timestamp?: bigint };
export type ActivityPage = { entries: RegistryActivity[]; nextBlock?: bigint; scannedFrom: bigint; scannedTo: bigint };
export type RegistryReader = {
  client: PublicClient;
  getProfile(owner: Address): Promise<RegistryProfile>;
  getRecord(owner: Address, dataHash: Hex): Promise<{ exists: boolean; recordedAt: bigint }>;
  getNonce(owner: Address): Promise<bigint>;
  proofChallenge(owner: Address, deadline: bigint): Promise<Hex>;
  getActivityPage(owner: Address, options?: { fromBlock?: bigint; beforeBlock?: bigint; ranges?: number }): Promise<ActivityPage>;
};
const activityEvents = parseAbi([
  'event ProfileCreated(address indexed owner, bytes32 indexed profileHash)',
  'event ProfileUpdated(address indexed owner, bytes32 indexed profileHash)',
  'event DataRecorded(address indexed owner, bytes32 indexed dataHash, uint64 recordedAt)',
  'event PasskeyControlVerified(address indexed owner, uint64 verifiedAt)',
]);
export type RegistryAction = 'CreateProfile' | 'UpdateProfile' | 'RecordData';
export const registryTypes = {
  CreateProfile: [{ name: 'owner', type: 'address' }, { name: 'profileHash', type: 'bytes32' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }],
  UpdateProfile: [{ name: 'owner', type: 'address' }, { name: 'profileHash', type: 'bytes32' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }],
  RecordData: [{ name: 'owner', type: 'address' }, { name: 'dataHash', type: 'bytes32' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }],
} as const;
export function registryDomain(chainId: number, registry: Address) { return { name: 'OrvenaRegistry', version: '1', chainId, verifyingContract: registry } as const; }
export function hashProfile(input: ProfileInput): Hex {
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }], [keccak256(stringToHex(input.name)), keccak256(stringToHex(input.bio)), input.avatar, input.qx, input.qy, input.rpIdHash, keccak256(stringToHex(input.origin))]));
}
export function hashProfileUpdate(name: string, bio: string, avatar: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }], [keccak256(stringToHex(name)), keccak256(stringToHex(bio)), avatar]));
}
/** Receipts use keccak256 of UTF-8 bytes. File callers hash their raw bytes. */
export function hashText(text: string): Hex { return keccak256(stringToHex(text)); }
export function createRegistryReader({ address, rpcUrl, chainId = 10143 }: { address: Address; rpcUrl?: string; chainId?: number }): RegistryReader {
  if (![10143, 31337].includes(chainId)) throw new Error('Only Monad testnet and local development are supported.');
  const chain = chainId === 10143 ? monadTestnet : defineChain({ id: chainId, name: 'Local development', nativeCurrency: monadTestnet.nativeCurrency, rpcUrls: { default: { http: [rpcUrl || 'http://127.0.0.1:8545'] } } });
  const client = createPublicClient({ chain, transport: http(rpcUrl) });
  return {
    client,
    getProfile: (owner: Address) => client.readContract({ address, abi: registryAbi, functionName: 'getProfile', args: [owner] }),
    getRecord: (owner: Address, dataHash: Hex) => client.readContract({ address, abi: registryAbi, functionName: 'getRecord', args: [owner, dataHash] }),
    getNonce: (owner: Address) => client.readContract({ address, abi: registryAbi, functionName: 'nonces', args: [owner] }),
    proofChallenge: (owner: Address, deadline: bigint) => client.readContract({ address, abi: registryAbi, functionName: 'proofChallenge', args: [owner, deadline] }),
    async getActivityPage(owner, options = {}) {
      const fromBlock = options.fromBlock ?? 0n;
      const beforeBlock = options.beforeBlock ?? await client.getBlockNumber({ cacheTime: 0 });
      if (fromBlock < 0n || beforeBlock < 0n) throw new Error('Block numbers must be non-negative.');
      if (beforeBlock < fromBlock) return { entries: [], scannedFrom: fromBlock, scannedTo: beforeBlock };
      const ranges = Math.max(1, Math.min(20, Math.floor(options.ranges || 10)));
      const entries: RegistryActivity[] = [];
      let cursor = beforeBlock;
      let scannedFrom = beforeBlock;
      // Public Monad RPC limits eth_getLogs to 100 blocks. Bound each call to 100.
      for (let scanned = 0; scanned < ranges; scanned++) {
        const start = cursor - fromBlock >= 99n ? cursor - 99n : fromBlock;
        const logs = await client.getLogs({ address, events: activityEvents, fromBlock: start, toBlock: cursor, strict: true });
        for (const log of logs) {
          if (log.args.owner.toLowerCase() !== owner.toLowerCase()) continue;
          const kind = { ProfileCreated: 'profile-created', ProfileUpdated: 'profile-updated', DataRecorded: 'data-recorded', PasskeyControlVerified: 'passkey-verified' }[log.eventName] as RegistryActivity['kind'];
          entries.push({ kind, transactionHash: log.transactionHash, block: log.blockNumber, logIndex: log.logIndex,
            ...(log.eventName === 'DataRecorded' ? { dataHash: log.args.dataHash, timestamp: log.args.recordedAt } : {}),
            ...(log.eventName === 'PasskeyControlVerified' ? { timestamp: log.args.verifiedAt } : {}),
          });
        }
        scannedFrom = start;
        if (start === fromBlock) return { entries: entries.sort((a, b) => a.block === b.block ? b.logIndex - a.logIndex : a.block > b.block ? -1 : 1), scannedFrom, scannedTo: beforeBlock };
        cursor = start - 1n;
        // Return an initial useful page quickly; older history is loaded on demand.
        if (entries.length >= 8) break;
      }
      return { entries: entries.sort((a, b) => a.block === b.block ? b.logIndex - a.logIndex : a.block > b.block ? -1 : 1), nextBlock: cursor, scannedFrom, scannedTo: beforeBlock };
    },
  };
}
