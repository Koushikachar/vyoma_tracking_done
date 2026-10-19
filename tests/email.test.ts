import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { emailProvider, parseFrom } from "@/lib/email-config";
const KEYS = ["EMAIL_PROVIDER", "EMAIL_FROM", "BREVO_API_KEY", "RESEND_API_KEY", "EMAIL_SERVER"]; let saved: Record<string, string | undefined> = {};
beforeEach(() => { saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]])); KEYS.forEach(k => delete process.env[k]); });
afterEach(() => { KEYS.forEach(k => saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])); });
describe("email provider choice", () => {
  it("is off when nothing is set, or when there is no sender address", () => { expect(emailProvider()).toBeNull(); process.env.BREVO_API_KEY = "k"; expect(emailProvider()).toBeNull(); });
  it("picks the service whose key is present", () => { process.env.EMAIL_FROM = "a@b.com"; process.env.RESEND_API_KEY = "k"; expect(emailProvider()).toBe("resend"); delete process.env.RESEND_API_KEY; process.env.EMAIL_SERVER = "smtp://x"; expect(emailProvider()).toBe("smtp"); });
  it("prefers Brevo, then Resend, then SMTP when several are set", () => { process.env.EMAIL_FROM = "a@b.com"; process.env.EMAIL_SERVER = "smtp://x"; process.env.RESEND_API_KEY = "k"; process.env.BREVO_API_KEY = "k"; expect(emailProvider()).toBe("brevo"); });
  it("honours an explicit choice and never silently switches", () => { process.env.EMAIL_FROM = "a@b.com"; process.env.BREVO_API_KEY = "k"; process.env.EMAIL_PROVIDER = "smtp"; expect(emailProvider()).toBeNull(); process.env.EMAIL_SERVER = "smtp://x"; expect(emailProvider()).toBe("smtp"); });
});
describe("sender address", () => {
  it("reads a display name and address", () => expect(parseFrom('"Vyoma Route" <no-reply@x.com>')).toEqual({ name: "Vyoma Route", email: "no-reply@x.com" }));
  it("reads a bare address", () => expect(parseFrom("no-reply@x.com")).toEqual({ name: "Vyoma Route", email: "no-reply@x.com" }));
});
