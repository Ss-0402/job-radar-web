import { getDb } from "@/lib/db";

/**
 * 每日额度。SQLite 下用一条 upsert 完成「检查 + 扣减」，
 * 避免"先查再写"的并发丢失。换成 Postgres 时同样是 on conflict。
 */

export const FREE_PER_DAY = 3;
export const DAILY_CAP = 100;

function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function remaining(username: string, day = today()): number {
  const row = getDb()
    .prepare("select used from quota_daily where day = ? and username = ?")
    .get(day, username.toLowerCase()) as { used: number } | undefined;

  return Math.max(FREE_PER_DAY - (row?.used ?? 0), 0);
}

export function totalUsedToday(day = today()): number {
  const row = getDb()
    .prepare("select coalesce(sum(used), 0) as total from quota_daily where day = ?")
    .get(day) as { total: number };

  return row?.total ?? 0;
}

/**
 * 占用一次额度。成功返回 true。
 * 返回 false 表示「今日个人额度已满」或「全站额度已满」。
 */
export function consume(username: string, day = today()): boolean {
  const db = getDb();
  const key = username.toLowerCase();

  if (totalUsedToday(day) >= DAILY_CAP) return false;

  const before = db
    .prepare("select used from quota_daily where day = ? and username = ?")
    .get(day, key) as { used: number } | undefined;

  if ((before?.used ?? 0) >= FREE_PER_DAY) return false;

  db.prepare(
    `insert into quota_daily (day, username, used) values (?, ?, 1)
     on conflict (day, username) do update set used = quota_daily.used + 1`,
  ).run(day, key);

  return true;
}
