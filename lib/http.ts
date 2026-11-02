import { NextResponse } from "next/server";

export type ApiError = { error: { code: string; message: string } };

export function badRequest(message: string) {
  return NextResponse.json<ApiError>(
    { error: { code: "bad_request", message } },
    { status: 400 },
  );
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status });
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
