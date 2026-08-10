import { describe, expect, it } from "vitest";
import { canTransition, reconcileStatus } from "./model";

describe("canTransition", () => {
  it("provisional can move to confirmed, conflict, or unresolved", () => {
    expect(canTransition("provisional", "confirmed")).toBe(true);
    expect(canTransition("provisional", "conflict")).toBe(true);
    expect(canTransition("provisional", "unresolved")).toBe(true);
    expect(canTransition("provisional", "provisional")).toBe(false);
  });

  it("conflict resolves to confirmed or unresolved only", () => {
    expect(canTransition("conflict", "confirmed")).toBe(true);
    expect(canTransition("conflict", "unresolved")).toBe(true);
    expect(canTransition("conflict", "provisional")).toBe(false);
  });

  it("unresolved can be re-confirmed, confirmed is terminal", () => {
    expect(canTransition("unresolved", "confirmed")).toBe(true);
    expect(canTransition("unresolved", "provisional")).toBe(false);
    expect(canTransition("confirmed", "provisional")).toBe(false);
    expect(canTransition("confirmed", "conflict")).toBe(false);
  });
});

describe("reconcileStatus", () => {
  it("flags CONFLICT and PARTIAL evidence as conflict status", () => {
    expect(reconcileStatus("CONFLICT")).toBe("conflict");
    expect(reconcileStatus("PARTIAL")).toBe("conflict");
  });

  it("never auto-confirms or auto-unresolves from evidence alone", () => {
    expect(reconcileStatus("SUPPORTED")).toBeNull();
    expect(reconcileStatus("NO_EVIDENCE")).toBeNull();
    expect(reconcileStatus("NEW_RELATED_AREA")).toBeNull();
  });
});
