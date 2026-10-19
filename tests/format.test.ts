import { describe, it, expect } from "vitest";
import { fmtDate, fmtDateTime } from "@/lib/format";
describe("date formatting (same text on server and browser)", () => {
  it("shows India time", () => expect(fmtDateTime("2026-10-09T09:04:47Z")).toBe("9 Oct 2026, 2:34 pm"));
  it("moves to the next day after 18:30 UTC", () => expect(fmtDate("2026-10-09T19:00:00Z")).toBe("10 Oct 2026"));
  it("handles midnight and noon", () => { expect(fmtDateTime("2026-01-01T18:30:00Z")).toBe("2 Jan 2026, 12:00 am"); expect(fmtDateTime("2026-01-01T06:30:00Z")).toBe("1 Jan 2026, 12:00 pm"); });
  it("does not crash on a bad date", () => expect(fmtDate("not a date")).toBe("—"));
});
