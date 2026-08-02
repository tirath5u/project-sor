import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Shared-password site gate.
 *
 * The expected password lives in the server-only SITE_PASSWORD env var and is
 * compared inside a server function, so it never ships in the client bundle.
 * The unlocked flag lives in an encrypted, httpOnly session cookie, so it
 * cannot be forged from devtools the way a localStorage flag could.
 */

type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "sor-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const getGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const expected = process.env["SITE_PASSWORD"];
  // No password configured: the gate is disabled entirely.
  if (!expected) return { unlocked: true as const, gateEnabled: false as const };
  const session = await useSession<GateSession>(sessionConfig());
  return { unlocked: session.data.unlocked === true, gateEnabled: true as const };
});

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    if (typeof data?.password !== "string" || data.password.length > 200) {
      throw new Error("Invalid request");
    }
    return { password: data.password };
  })
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected) return { ok: true as const };
    if (!passwordMatches(data.password.trim(), expected)) {
      return { ok: false as const };
    }
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});