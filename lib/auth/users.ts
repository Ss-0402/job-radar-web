import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * 账号相关的数据操作。所有校验规则集中在这里，接口层只做 HTTP 语义。
 */

export const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;
export const MIN_PASSWORD = 6;

export type PublicUser = { username: string; name: string };

type UserRow = { username: string; name: string; pwd_hash: string };

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function normalize(username: string): string {
  return (username ?? "").trim();
}

export function register(
  username: string,
  password: string,
): Result<PublicUser> {
  const name = normalize(username);

  if (!USERNAME_RE.test(name)) {
    return { ok: false, status: 422, message: "用户名 3–20 位，只能字母、数字、下划线或中文" };
  }
  if ((password ?? "").length < MIN_PASSWORD) {
    return { ok: false, status: 422, message: `密码至少 ${MIN_PASSWORD} 位` };
  }

  const db = getDb();
  const key = name.toLowerCase();

  const exists = db
    .prepare("select 1 from users where username = ?")
    .get(key) as unknown;
  if (exists) {
    return { ok: false, status: 409, message: "这个用户名已经被注册了" };
  }

  db.prepare("insert into users (username, name, pwd_hash) values (?, ?, ?)").run(
    key,
    name,
    hashPassword(password),
  );

  return { ok: true, data: { username: key, name } };
}

export function authenticate(
  username: string,
  password: string,
): Result<PublicUser> {
  const key = normalize(username).toLowerCase();
  const row = getDb()
    .prepare("select username, name, pwd_hash from users where username = ?")
    .get(key) as UserRow | undefined;

  // 用户不存在与密码错误返回同一句，避免枚举账号
  if (!row || !verifyPassword(password ?? "", row.pwd_hash)) {
    return { ok: false, status: 401, message: "用户名或密码不正确" };
  }

  return { ok: true, data: { username: row.username, name: row.name } };
}

export function findUser(username: string): PublicUser | null {
  const row = getDb()
    .prepare("select username, name from users where username = ?")
    .get(normalize(username).toLowerCase()) as
    | { username: string; name: string }
    | undefined;

  return row ? { username: row.username, name: row.name } : null;
}
