import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 会话凭证：HMAC-SHA256 签名的 token，放在 httpOnly cookie 里。
 *
 * 结构：base64url("username|expiresAt") . base64url(HMAC(secret, 前者))
 * 与旧版 Python 实现保持同一思路：只签名不加密，token 里没有密码。
 */

export const SESSION_COOKIE = "jr_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    // 开发环境兜底：重启后旧 token 失效，生产必须配 AUTH_SECRET
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET 未配置，生产环境拒绝签发会话");
    }
    return "dev-only-secret-change-me";
  }
  return value;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text: string): Buffer {
  return Buffer.from(text.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signSession(username: string, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + SESSION_MAX_AGE;
  const payload = Buffer.from(`${username}|${expires}`, "utf8");
  const sig = createHmac("sha256", secret()).update(payload).digest();
  return `${b64url(payload)}.${b64url(sig)}`;
}

export function verifySession(
  token: string | undefined,
  now = Date.now(),
): string | null {
  if (!token) return null;

  try {
    const [payloadPart, sigPart] = token.split(".");
    if (!payloadPart || !sigPart) return null;

    const payload = fromB64url(payloadPart);
    const sig = fromB64url(sigPart);
    const expected = createHmac("sha256", secret()).update(payload).digest();

    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
      return null;
    }

    const [username, expires] = payload.toString("utf8").split("|");
    if (!username || Number(expires) * 1000 < now) return null;
    return username;
  } catch {
    return null;
  }
}
