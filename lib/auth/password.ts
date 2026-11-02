import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * 密码哈希：scrypt（Node 内置，无原生依赖）。
 *
 * 存储格式：scrypt$N$r$p$salt_hex$hash_hex
 * - 每个账号独立随机盐
 * - 校验用 timingSafeEqual，避免时序侧信道
 * - 换 argon2 只需替换本文件（格式前缀已带算法名，便于日后迁移）
 */

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, n, r, p, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt") return false;

    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
