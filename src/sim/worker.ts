import { parentPort, workerData } from 'node:worker_threads';
import { cardSetFor } from '../cardsets/index.ts';
import { variantFor } from '../engine/rules.ts';
import { playGames } from './record.ts';

export interface WorkerJob {
  setVersion: string;
  variantId: string;
  botSpec: string;
  seeds: number[];
}

const job = workerData as WorkerJob; // workerData is untyped; pool.ts is its only producer.
const setup = { cardSet: cardSetFor(job.setVersion), rules: variantFor(job.variantId), botSpec: job.botSpec };
parentPort?.postMessage(playGames(setup, job.seeds));
