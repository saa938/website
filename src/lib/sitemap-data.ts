import { env } from "@/env.js";

/**
 * Server-side helpers for reading public subject data via the Firestore REST
 * API. The app otherwise talks to Firestore through the client SDK, but route
 * handlers like `sitemap.ts` and server `generateMetadata` run before hydration
 * and need a dependency-free way to read the publicly readable `subjects`
 * collection (`allow read: if true` in firestore.rules).
 */

const PROJECT_ID = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Cache for a day; subject structure changes rarely.
const REVALIDATE_SECONDS = 86_400;

interface RestValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: { values?: RestValue[] };
  mapValue?: { fields?: Record<string, RestValue> };
}

interface RestDocument {
  name: string;
  fields?: Record<string, RestValue>;
}

function parseValue(value: RestValue): unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(parseValue);
  if (value.mapValue) return parseFields(value.mapValue.fields ?? {});
  return null;
}

function parseFields(
  fields: Record<string, RestValue>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = parseValue(value);
  }
  return out;
}

export interface SitemapChapter {
  id: string;
  title: string;
  isPublic?: boolean;
}

export interface SitemapUnit {
  id: string;
  title: string;
  chapters: SitemapChapter[];
}

export interface SitemapSubject {
  slug: string;
  title: string;
  units: SitemapUnit[];
}

/**
 * Returns every subject with its embedded units and chapters. Falls back to an
 * empty array on any failure so callers (e.g. the sitemap) still render their
 * static entries instead of crashing the build.
 */
export async function getAllSubjects(): Promise<SitemapSubject[]> {
  try {
    const res = await fetch(`${BASE}/subjects?pageSize=300&key=${API_KEY}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { documents?: RestDocument[] };
    return (data.documents ?? []).map((doc) => {
      const slug = doc.name.split("/").pop() ?? "";
      const fields = parseFields(doc.fields ?? {});
      return {
        slug,
        title: typeof fields.title === "string" ? fields.title : slug,
        units: (Array.isArray(fields.units)
          ? fields.units
          : []) as SitemapUnit[],
      };
    });
  } catch {
    return [];
  }
}

/** Returns a single subject's display title, or null if it can't be read. */
export async function getSubjectTitle(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/subjects/${slug}?key=${API_KEY}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RestDocument;
    const fields = parseFields(data.fields ?? {});
    return typeof fields.title === "string" ? fields.title : null;
  } catch {
    return null;
  }
}
