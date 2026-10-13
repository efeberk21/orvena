import { createSecp256k1SigningSession } from '@category-labs/mera';
import { HDKey } from '@scure/bip32';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
export const derivationPath = "m/44'/60'/0'/0/0";
export function deriveSigningSession(prfOutput: Uint8Array) {
  let root: HDKey | undefined;
  let derived: HDKey | undefined;
  let seed: Uint8Array | undefined;
  try {
    seed = mnemonicToSeedSync(entropyToMnemonic(prfOutput, wordlist));
    root = HDKey.fromMasterSeed(seed);
    derived = root.derive(derivationPath);
    if (!derived.privateKey) throw new Error('Account derivation failed.');
    return createSecp256k1SigningSession({ privateKey: derived.privateKey });
  } finally { prfOutput.fill(0); seed?.fill(0); derived?.wipePrivateData(); root?.wipePrivateData(); }
}
