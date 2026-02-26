/**
 * Monte Carlo Simulation Web Worker
 *
 * Runs the MC simulation off the main thread so the UI stays fully
 * interactive during long-running computation.
 *
 * Message protocol (incoming):
 *   { type: "run", decision, config }
 *
 * Message protocol (outgoing):
 *   { type: "progress", completed, total }
 *   { type: "complete", results }
 *   { type: "error", message }
 *
 * Cancellation: the host calls `worker.terminate()`.
 */

import { runMonteCarloSimulation } from "@/lib/monte-carlo";
import type { Decision, MonteCarloConfig, MonteCarloResults } from "@/lib/types";

// ---------------------------------------------------------------------------
// Worker message types
// ---------------------------------------------------------------------------

export interface WorkerRunMessage {
  type: "run";
  decision: Decision;
  config: Partial<MonteCarloConfig>;
}

export interface WorkerProgressMessage {
  type: "progress";
  completed: number;
  total: number;
}

export interface WorkerCompleteMessage {
  type: "complete";
  results: MonteCarloResults;
}

export interface WorkerErrorMessage {
  type: "error";
  message: string;
}

export type WorkerOutMessage = WorkerProgressMessage | WorkerCompleteMessage | WorkerErrorMessage;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

self.onmessage = (e: MessageEvent<WorkerRunMessage>) => {
  if (e.data.type !== "run") return;

  const { decision, config } = e.data;

  try {
    const results = runMonteCarloSimulation(decision, config, {
      onProgress: (completed: number, total: number) => {
        self.postMessage({ type: "progress", completed, total } satisfies WorkerProgressMessage);
      },
      // No AbortSignal here — cancellation is via worker.terminate()
    });

    self.postMessage({ type: "complete", results } satisfies WorkerCompleteMessage);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: "error", message } satisfies WorkerErrorMessage);
  }
};

// Signal that the worker is ready
export {};
