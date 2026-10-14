import { PgDialect } from 'drizzle-orm/pg-core';
import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { vi } from 'vitest';

export const rows: unknown[][] = [];
export const filters: { sql: string; params: unknown[] }[] = [];

function recordFilter(condition: SQL | undefined): void {
  if (condition) filters.push(new PgDialect().sqlToQuery(condition));
}

function query() {
  const result = rows.shift() ?? [];
  let table: SQLWrapper | undefined;
  let predicate: SQL | undefined;
  const chain = {
    from: vi.fn((value: SQLWrapper) => {
      table = value;
      return chain;
    }),
    where: vi.fn((condition: SQL | undefined) => {
      predicate = condition;
      recordFilter(condition);
      return chain;
    }),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    getSQL: () => sql`select 1 from ${table} where ${predicate}`,
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

const returning = vi.fn(async () => rows.shift() ?? []);
const write = {
  returning,
  onConflictDoNothing: vi.fn(() => write),
  onConflictDoUpdate: vi.fn(() => write),
  where: vi.fn((condition: SQL | undefined) => {
    recordFilter(condition);
    return write;
  }),
};
export const database = {
  select: vi.fn(query),
  insert: vi.fn(() => ({
    values: vi.fn((value: unknown) => {
      writes.push(value);
      return write;
    }),
  })),
  update: vi.fn(() => ({
    set: vi.fn((value: unknown) => {
      writes.push(value);
      return write;
    }),
  })),
  delete: vi.fn(() => write),
  execute: vi.fn(async () => undefined),
  transaction: vi.fn(
    async <T>(operation: (tx: typeof databaseBoundary) => Promise<T>): Promise<T> =>
      operation(databaseBoundary),
  ),
};
const databaseBoundary = {
  select: database.select,
  insert: database.insert,
  update: database.update,
  delete: database.delete,
  execute: database.execute,
};
export const writes: unknown[] = [];

export function resetDatabase(): void {
  rows.length = 0;
  filters.length = 0;
  writes.length = 0;
  vi.clearAllMocks();
}
