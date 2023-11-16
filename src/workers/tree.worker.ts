import { createPublicClient, http, parseAbiItem } from 'viem'
import { optimism } from 'viem/chains'
import { logger } from '@/utils/logger';
import { KEY_REGISTRY_ADD_EVENT_SIGNATURE } from '@/utils/constants';
// @ts-ignore -- no types
import { buildMimc7 as buildMimc } from 'circomlibjs';

import { MerkleTreeMiMC, MiMC7 } from '@/utils/merkle-tree';
import { TreeElement, Tree } from '@/interfaces/tree.interface';

import _ from 'underscore';


type LogEntry = {
  blockNumber: bigint;
  logIndex: number;
  transactionIndex: number;
};


function sortLogEntries(logEntries: LogEntry[]) {
  return logEntries.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber < b.blockNumber ? -1 : 1;
      }
      if (a.transactionIndex !== b.transactionIndex) {
          return a.transactionIndex - b.transactionIndex;
      }
      return a.logIndex - b.logIndex;
  });
}


export class MerkleTreeWorker {
  private client;
  private key_registry_address: `0x${string}`;
  private fids: bigint[];
  private getlogs_batch_size: bigint;

  private last_block: bigint = 0n;

  // @ts-ignore
  private tree: MerkleTreeMiMC;
  private elements: TreeElement[] = [];
  private state: Tree;

  constructor(
    rpc: string,
    key_registry_address: `0x${string}`,
    fids: bigint[],
    getlogs_batch_size: bigint = 100000n
  ) {
    this.client = createPublicClient({
      chain: optimism,
      transport: http(rpc)
    });

    this.key_registry_address = key_registry_address;
    this.fids = fids;
    this.getlogs_batch_size = getlogs_batch_size;

    this.state = {
      elements: [],
      root: null,
      legacy_roots: [],
    }
  }

  async getLatestBlock() {
      // Get latest block
      const {
      number: end_block
    } = await this.client.getBlock();

    return end_block;
  }

  async initialize() {
    const mimc = await buildMimc();
    this.tree = new MerkleTreeMiMC(32, mimc);

    const end_block = await this.getLatestBlock();

    logger.info(`Syncing bootstrap logs until block #${end_block}`);

    const fid_chunks = _.chunk(this.fids, 1000);

    const unsorted_logs = [];

    for (const [fid_chunk_id, fid_chunk] of fid_chunks.entries()) {
      const chunk_logs = await this.syncLogs(fid_chunk, 0n, end_block);

      logger.debug(`Got ${chunk_logs.length} logs [${fid_chunk_id + 1} / ${fid_chunks.length}]`);

      unsorted_logs.push(...chunk_logs);
    }

    const logs = sortLogEntries(unsorted_logs);

    logger.info(`Got ${logs.length} bootrstap logs`);

    // @ts-ignore
    for (const [i, { args: { fid, keyBytes: key }, ...log }] of logs.entries()) {
      this.addElement({
        fid: parseInt(fid.toString()),
        key
      });

      if (i % 500 === 0 && i !== 0) {
        logger.debug(`Built tree with ${i} elements`);
      }
    }

    this.updateState();

    this.last_block = end_block;

    this.subscribeToLogs();
  }

  private updateState() {
    const root = `0x${this.tree.root()}` as `0x${string}`;

    logger.info(`New merkle root: ${root}`);

    const legacy_roots = this.state === null ? [] : this.state.legacy_roots;
    legacy_roots.push(root);
    if (legacy_roots.length > 50) legacy_roots.shift();

    this.state = {
      elements: this.elements.map((element: TreeElement, i) => {
        return {
          path: this.tree.proof(i).pathElements.map(p => `0x${p}` as `0x${string}`),
          fid: element.fid,
          key: element.key,
        };
      }),
      root,
      legacy_roots,
    };
  }

  private subscribeToLogs() {
    setTimeout(async () => {
      const end_block = await this.getLatestBlock();

      const logs = await this.syncLogs(
        this.fids,
        this.last_block + 1n,
        end_block,
      );

      if (logs.length > 0) {
        logger.info(`Got ${logs.length} logs`);

        for (const { args: { fid, keyBytes: key }, ...log } of logs) {
          this.addElement({
            fid: parseInt(fid.toString()),
            key
          });
        }
    
        this.updateState();
      }

      this.last_block = end_block;

      this.subscribeToLogs();
    }, 5000);
  }

  private async syncLogs(
    fids: bigint[] = this.fids,
    start_block: bigint,
    end_block: bigint,
  ) {
    const intervals = createIntervals(
      // this.last_block + 1n,
      start_block,
      end_block,
      this.getlogs_batch_size
    );

    const logs = await this.client.getLogs({
      address: this.key_registry_address,
      args: {
        fid: fids,
      },
      event: parseAbiItem(KEY_REGISTRY_ADD_EVENT_SIGNATURE),
      fromBlock: start_block,
      toBlock: end_block,
      strict: true
    });


    // console.log(logs);

    // this.last_block = end_block;

    return logs;
  }

  private addElement(element: TreeElement) {
    this.elements.push(element);

    const commitment = MiMC7(
      this.tree.mimc7,
      element.fid.toString(16).replace('0x', ''),
      element.key.replace('0x', '')
    );

    this.tree.insert(commitment);
  }

  getState() {
    return this.state;
  }
}


function createIntervals(start: bigint, end: bigint, interval: bigint): [bigint, bigint][] {
  let intervals: [bigint, bigint][] = [];
  for (let current = start; current < end; current += interval) {
    let next = current + interval;
    if (next > end) next = end;
    intervals.push([current, next]);
  }
  return intervals;
}
