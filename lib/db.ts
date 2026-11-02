import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * 数据库访问层。
 *
 * 现在用 SQLite（Node 22+ 内置 node:sqlite，无原生依赖、无需编译）。
 * 换成 Postgres 时只改这个文件：把 SQL 方言与驱动替换掉，调用方不动。
 */

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    create table if not exists users (
      username   text primary key,
      name       text not null,
      pwd_hash   text not null,
      created_at text not null default (datetime('now'))
    );
  `);

  // 每日额度：按天分桶，天然支持跨天重置
  db.exec(`
    create table if not exists quota_daily (
      day      text not null,
      username text not null,
      used     integer not null default 0,
      primary key (day, username),
      foreign key (username) references users(username) on delete cascade
    );
  `);

  return db;
}
