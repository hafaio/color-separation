/**
 * User-defined palette colors, persisted across browser sessions.
 *
 * Storage: localStorage under `customColors:v1`, an envelope of
 * `{ version: 1, colors: CustomColor[] }`. The version field lets future
 * shape changes migrate or invalidate cleanly. Malformed / wrong-version
 * payloads load as an empty list so a bad write can't permanently brick the
 * UI.
 *
 * Custom colors carry no spectral metadata — the worker's `layerFor`
 * fallback already treats unknown RGBs as transparent layers, which is
 * correct for `subtractive` / `alpha_blend` (those modes mix on RGB
 * directly) and which the `kmEligible` check elsewhere prevents from being
 * used in `kubelka_munk` mode.
 */

import { useCallback, useEffect, useState } from "react";
import type { RgbU32 } from "./color";

export interface CustomColor {
  readonly rgb: RgbU32;
  readonly name: string;
}

const STORAGE_KEY = "customColors:v1";

interface StoredEnvelope {
  readonly version: 1;
  readonly colors: readonly CustomColor[];
}

function isCustomColor(value: unknown): value is CustomColor {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.rgb === "number" && typeof obj.name === "string";
}

export function loadCustoms(): readonly CustomColor[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const env = parsed as Partial<StoredEnvelope>;
    if (env.version !== 1 || !Array.isArray(env.colors)) return [];
    return env.colors.filter(isCustomColor);
  } catch {
    return [];
  }
}

export function saveCustoms(customs: readonly CustomColor[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const envelope: StoredEnvelope = { version: 1, colors: [...customs] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // quota exceeded, storage disabled, etc. — best-effort only
  }
}

export interface CustomColorsApi {
  readonly customs: readonly CustomColor[];
  readonly addCustom: (color: CustomColor) => void;
  readonly removeCustom: (rgb: RgbU32) => void;
}

export function useCustomColors(): CustomColorsApi {
  // Start empty so SSR / first-paint markup matches; hydrate from storage in
  // an effect. The palette modal is closed by default, so the user never sees
  // the empty-then-populated transition.
  const [customs, setCustoms] = useState<readonly CustomColor[]>([]);
  useEffect(() => {
    setCustoms(loadCustoms());
  }, []);

  const addCustom = useCallback((color: CustomColor) => {
    setCustoms((prev) => {
      if (prev.some((c) => c.rgb === color.rgb)) return prev;
      const next = [...prev, color];
      saveCustoms(next);
      return next;
    });
  }, []);

  const removeCustom = useCallback((rgb: RgbU32) => {
    setCustoms((prev) => {
      if (!prev.some((c) => c.rgb === rgb)) return prev;
      const next = prev.filter((c) => c.rgb !== rgb);
      saveCustoms(next);
      return next;
    });
  }, []);

  return { customs, addCustom, removeCustom };
}
