import { GameCategory, LoginMethod } from "@/types";

const PRODUCT_METADATA_STORAGE_KEY = "product_metadata_v1";

type ProductMetadataEntry = {
  game_category?: GameCategory;
  login_method?: LoginMethod;
  updated_at: string;
};

type ProductMetadataMap = Record<string, ProductMetadataEntry>;

const GAME_CATEGORY_PATTERNS: Array<{ pattern: RegExp; value: GameCategory }> = [
  { pattern: /mobile\s*legend|moblilegend|mlbb/i, value: "mobile_legends" },
  { pattern: /pubg/i, value: "pubg_mobile" },
  { pattern: /free\s*fire|\bff\b/i, value: "free_fire" },
  { pattern: /efootball|konami|pes/i, value: "efootball" },
  { pattern: /fifa|ea\s*fc|ea\s*sports|fc\s*26/i, value: "fifa_26" },
];

const LOGIN_METHOD_PATTERNS: Array<{ pattern: RegExp; value: LoginMethod }> = [
  { pattern: /\bfacebook\b|\bfb\b/i, value: "facebook" },
  { pattern: /\bgoogle\b|\bgmail\b/i, value: "google" },
  { pattern: /\btwitter\b|\bx\s*\(twitter\)/i, value: "x" },
  { pattern: /\bkonami\b/i, value: "konami_id" },
  { pattern: /\bea\b|\bea sports\b/i, value: "ea" },
];

function readMetadataMap(): ProductMetadataMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(PRODUCT_METADATA_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProductMetadataMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeMetadataMap(map: ProductMetadataMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRODUCT_METADATA_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors so product save flow is not blocked.
  }
}

export function saveProductMetadata(
  productId: string | number,
  metadata: { game_category?: GameCategory; login_method?: LoginMethod }
): void {
  if (!metadata.game_category && !metadata.login_method) return;

  const map = readMetadataMap();
  map[String(productId)] = {
    ...map[String(productId)],
    ...metadata,
    updated_at: new Date().toISOString(),
  };
  writeMetadataMap(map);
}

export function getProductMetadata(productId: string | number): ProductMetadataEntry | null {
  const map = readMetadataMap();
  return map[String(productId)] ?? null;
}

export function inferGameCategoryFromText(text: string): GameCategory | undefined {
  const normalizedText = text.trim();
  if (!normalizedText) return undefined;

  const matched = GAME_CATEGORY_PATTERNS.find(({ pattern }) => pattern.test(normalizedText));
  return matched?.value;
}

export function inferLoginMethodFromText(text: string): LoginMethod | undefined {
  const normalizedText = text.trim();
  if (!normalizedText) return undefined;

  const matched = LOGIN_METHOD_PATTERNS.find(({ pattern }) => pattern.test(normalizedText));
  return matched?.value;
}
