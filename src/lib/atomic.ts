import mongoose, { type ClientSession } from "mongoose";

let txSupported: boolean | null = null;
export const resetTransactionSupportCache = () => { txSupported = null; };

/** Multi-document transactions need a replica set / sharded cluster (MongoDB Atlas always is one). */
async function supportsTransactions(): Promise<boolean> {
  if (txSupported !== null) return txSupported;
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  txSupported = Boolean(hello.setName || hello.msg === "isdbgrid");
  return txSupported;
}

export type AtomicCtx = {
  /** Session to pass to every query, or null when the deployment has no transactions (local standalone mongod). */
  session: ClientSession | null;
  /** Register a compensating action. Only used when there is no transaction; ignored (the rollback is automatic) otherwise. */
  onUndo: (fn: () => Promise<void>) => void;
};

/**
 * Run `work` atomically. With transactions available, every write commits or none does (transient errors are retried
 * by the driver, so `work` must keep its side effects inside the database). Without them, writes are applied in order
 * and, if `work` throws, the registered compensations run in reverse so stock is put back.
 */
export async function atomically<T>(work: (ctx: AtomicCtx) => Promise<T>): Promise<T> {
  if (await supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work({ session, onUndo: () => {} });
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
  const undo: (() => Promise<void>)[] = [];
  try {
    return await work({ session: null, onUndo: (fn) => undo.push(fn) });
  } catch (error) {
    for (const fn of undo.reverse()) {
      try {
        await fn();
      } catch (undoError) {
        console.error("[atomically] compensation failed", undoError instanceof Error ? undoError.message : undoError);
      }
    }
    throw error;
  }
}
