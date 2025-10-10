// http.ts
import type { Request, Response } from "express";

export const parseJson = <T = unknown>(req: Request): Partial<T> =>
  (req.body ?? {}) as Partial<T>;

export const sendOk = <T>(res: Response, body: T): void => {
  res.json(body);
};

export const sendBad = (res: Response, message: string, code = 400): void => {
  res.status(code).json({ error: message });
};

// Logging helper stays the same
export const logError = (label: string, err: unknown, logger: Console | { error: (...args:any[])=>void } = console) => {
  try { logger.error(label, JSON.stringify(err as any, Object.getOwnPropertyNames(err as any))); }
  catch { logger.error(label, err); }
};

export const toCents = (n: number) => Math.max(0, Math.round(Number(n) * 100));
