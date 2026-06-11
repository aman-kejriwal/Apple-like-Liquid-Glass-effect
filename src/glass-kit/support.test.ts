/**
 * Engine detection for `backdrop-filter: url()` refraction support.
 * Run with `bun test`.
 */
import { afterEach, expect, test } from "bun:test";
import { __resetSupportCache, supportsBackdropDisplacement } from "./support";

function mockEnv(userAgent: string) {
  // Minimal DOM surface the detector touches.
  (globalThis as Record<string, unknown>).navigator = { userAgent };
  (globalThis as Record<string, unknown>).window = globalThis;
  (globalThis as Record<string, unknown>).document = {
    createElement: () => ({ style: { backdropFilter: "" } }),
  };
  __resetSupportCache();
}

afterEach(() => __resetSupportCache());

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HEADLESS =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/147.0 Safari/537.36";
const EDGE =
  "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0";
const SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IOS_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1";
const FIREFOX =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0";

test("desktop Chrome refracts", () => {
  mockEnv(CHROME);
  expect(supportsBackdropDisplacement()).toBe(true);
});

test("Headless Chrome refracts (not misread as Safari)", () => {
  mockEnv(HEADLESS);
  expect(supportsBackdropDisplacement()).toBe(true);
});

test("Edge (Chromium) refracts", () => {
  mockEnv(EDGE);
  expect(supportsBackdropDisplacement()).toBe(true);
});

test("desktop Safari falls back", () => {
  mockEnv(SAFARI);
  expect(supportsBackdropDisplacement()).toBe(false);
});

test("iOS Safari falls back", () => {
  mockEnv(IOS_SAFARI);
  expect(supportsBackdropDisplacement()).toBe(false);
});

test("iOS Chrome (WebKit underneath) falls back", () => {
  mockEnv(IOS_CHROME);
  expect(supportsBackdropDisplacement()).toBe(false);
});

test("Firefox falls back", () => {
  mockEnv(FIREFOX);
  expect(supportsBackdropDisplacement()).toBe(false);
});

test("server (no DOM) falls back safely", () => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).document;
  __resetSupportCache();
  expect(supportsBackdropDisplacement()).toBe(false);
});
