/**
 * useMonteCarloWorker — Custom hook for running Monte Carlo simulations
 * in a Web Worker with progress tracking & cancellation.
 *
 * Falls back to main-thread execution when Workers are unavailable.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runMonteCarloSimulation } from "@/lib/monte-carlo";
import type { Decision, MonteCarloConfig, MonteCarloResults } from "@/lib/types";
import type { WorkerOutMessage, WorkerRunMessage } from "@/workers/monte-carlo.worker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SimulationStatus = "idle" | "running" | "complete" | "cancelled" | "error";

export interface MonteCarloWorkerState {
  /** Current lifecycle status */
  status: SimulationStatus;
  /** 0-1 progress fraction during a run */
  progress: number;
  /** Completed iteration count */
  completed: number;
  /** Total iteration count */
  total: number;
  /** Results on completion (null otherwise) */
  results: MonteCarloResults | null;
  /** Error message if status === "error" */
  error: string | null;
  /** Whether Web Workers are supported */
  workerSupported: boolean;
}

export interface MonteCarloWorkerAPI {
  /** Kick off a simulation. Terminates any in-flight run. */
  run: (decision: Decision, config: Partial<MonteCarloConfig>) => void;
  /** Cancel the current run. */
  cancel: () => void;
  /** Reset state to idle. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const INITIAL_STATE: MonteCarloWorkerState = {
  status: "idle",
  progress: 0,
  completed: 0,
  total: 0,
  results: null,
  error: null,
  workerSupported: false,
};

export function useMonteCarloWorker(): MonteCarloWorkerState & MonteCarloWorkerAPI {
  const [state, setState] = useState<MonteCarloWorkerState>(INITIAL_STATE);
  const workerRef = useRef<Worker | null>(null);
  const supportedRef = useRef(false);

  // Detect Worker support once on mount
  useEffect(() => {
    const supported = typeof Worker !== "undefined";
    supportedRef.current = supported;
    setState((s) => ({ ...s, workerSupported: supported }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // ── Terminate any existing worker ──────────────────────────
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // ── Run ──────────────────────────────────────────────────────
  const run = useCallback(
    (decision: Decision, config: Partial<MonteCarloConfig>) => {
      // Kill any in-flight worker
      terminateWorker();

      const total = config.numSimulations ?? 10_000;

      setState({
        status: "running",
        progress: 0,
        completed: 0,
        total,
        results: null,
        error: null,
        workerSupported: supportedRef.current,
      });

      // ── Web Worker path ──
      if (supportedRef.current) {
        try {
          const worker = new Worker(new URL("../workers/monte-carlo.worker.ts", import.meta.url));
          workerRef.current = worker;

          worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
            const msg = e.data;

            switch (msg.type) {
              case "progress":
                setState((s) => ({
                  ...s,
                  completed: msg.completed,
                  total: msg.total,
                  progress: msg.completed / msg.total,
                }));
                break;

              case "complete":
                setState((s) => ({
                  ...s,
                  status: "complete",
                  progress: 1,
                  completed: msg.results.config.numSimulations,
                  total: msg.results.config.numSimulations,
                  results: msg.results,
                }));
                terminateWorker();
                break;

              case "error":
                setState((s) => ({
                  ...s,
                  status: "error",
                  error: msg.message,
                }));
                terminateWorker();
                break;
            }
          };

          worker.onerror = (ev) => {
            setState((s) => ({
              ...s,
              status: "error",
              error: ev.message ?? "Worker error",
            }));
            terminateWorker();
          };

          const message: WorkerRunMessage = { type: "run", decision, config };
          worker.postMessage(message);
          return;
        } catch {
          // Worker creation failed — fall through to main-thread
          supportedRef.current = false;
        }
      }

      // ── Main-thread fallback ──
      // Use requestAnimationFrame to allow UI to update "Running" state first.
      requestAnimationFrame(() => {
        try {
          const results = runMonteCarloSimulation(decision, config, {
            onProgress: (completed, tot) => {
              setState((s) => ({
                ...s,
                completed,
                total: tot,
                progress: completed / tot,
              }));
            },
          });

          setState((s) => ({
            ...s,
            status: "complete",
            progress: 1,
            completed: results.config.numSimulations,
            total: results.config.numSimulations,
            results,
            workerSupported: false,
          }));
        } catch (err) {
          setState((s) => ({
            ...s,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
            workerSupported: false,
          }));
        }
      });
    },
    [terminateWorker]
  );

  // ── Cancel ──────────────────────────────────────────────────
  const cancel = useCallback(() => {
    terminateWorker();
    setState((s) => ({
      ...s,
      status: "cancelled",
    }));
  }, [terminateWorker]);

  // ── Reset ───────────────────────────────────────────────────
  const reset = useCallback(() => {
    terminateWorker();
    setState({ ...INITIAL_STATE, workerSupported: supportedRef.current });
  }, [terminateWorker]);

  return { ...state, run, cancel, reset };
}
