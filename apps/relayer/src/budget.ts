import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class BudgetLedger {
  private reserved = 0n;
  constructor(private file: string, private identity: string, private limit: bigint) {}
  async load() {
    try {
      const state = JSON.parse(await readFile(this.file, 'utf8'));
      if (state.identity !== this.identity || !/^\d+$/.test(state.reserved)) throw new Error('Invalid sponsor budget state. Use a separate file for each chain and sponsor wallet.');
      this.reserved = BigInt(state.reserved);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  async reserve(cost: bigint) {
    if (cost <= 0n || this.reserved + cost > this.limit) throw new Error('Sponsorship budget exhausted.');
    const next = this.reserved + cost;
    await mkdir(dirname(this.file), { recursive: true });
    const temporary = `${this.file}.tmp`;
    await writeFile(temporary, JSON.stringify({ identity: this.identity, reserved: next.toString() }), { mode: 0o600 });
    await rename(temporary, this.file);
    this.reserved = next;
  }
  get used() { return this.reserved; }
}
