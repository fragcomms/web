const MAX_SHARECODE_LENGTH = 64;
const SHARECODE_PATTERN = /^CSGO(?:-[A-Za-z0-9]{5}){5}$/;

export type SharecodeValidationError =
  | "missing"
  | "too_long"
  | "invalid_format";

export type SharecodeValidationResult =
  | {
    ok: true;
    value: string;
  }
  | {
    ok: false;
    value: string;
    error: SharecodeValidationError;
  };

export function normalizeSharecode(input: string): string {
  const sanitized = input
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, "");

  if (/^csgo-/i.test(sanitized)) {
    return `CSGO-${sanitized.slice(5)}`;
  }

  return sanitized;
}

export function validateSharecode(input: string): SharecodeValidationResult {
  const normalized = normalizeSharecode(input);

  if (!normalized) {
    return {
      ok: false,
      value: normalized,
      error: "missing",
    };
  }

  if (normalized.length > MAX_SHARECODE_LENGTH) {
    return {
      ok: false,
      value: normalized,
      error: "too_long",
    };
  }

  if (!SHARECODE_PATTERN.test(normalized)) {
    return {
      ok: false,
      value: normalized,
      error: "invalid_format",
    };
  }

  return {
    ok: true,
    value: normalized,
  };
}