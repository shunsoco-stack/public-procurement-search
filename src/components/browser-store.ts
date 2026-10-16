"use client";

import { useSyncExternalStore } from "react";
import { Profile } from "@/lib/domain";

const KEY = "kkj-search-browser-v1";
const EVENT = "kkj-search-browser-change";
type BrowserData = { profile: Profile; savedIds: string[] };
const EMPTY: BrowserData = { profile: { skills: [], qualification: "", notes: "" }, savedIds: [] };
let cachedRaw: string | null | undefined;
let cachedData = EMPTY;

function getSnapshot(): BrowserData {
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); } catch { return cachedData; }
  if (raw === cachedRaw) return cachedData;
  cachedRaw = raw;
  if (!raw) { cachedData = EMPTY; return cachedData; }
  try {
    const value = JSON.parse(raw);
    cachedData = {
      profile: {
        skills: Array.isArray(value.profile?.skills) ? value.profile.skills.filter((s: unknown) => typeof s === "string").slice(0, 30) : [],
        qualification: typeof value.profile?.qualification === "string" ? value.profile.qualification.slice(0, 4000) : "",
        notes: typeof value.profile?.notes === "string" ? value.profile.notes.slice(0, 4000) : ""
      },
      savedIds: Array.isArray(value.savedIds) ? value.savedIds.filter((s: unknown) => typeof s === "string").slice(0, 200) : []
    };
  } catch { cachedData = EMPTY; }
  return cachedData;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); };
}

export function useBrowserData() { return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY); }

function write(data: BrowserData): boolean {
  try {
    const raw = JSON.stringify(data);
    localStorage.setItem(KEY, raw);
    cachedRaw = raw;
    cachedData = data;
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch { return false; }
}

export function saveProfile(profile: Profile) { return write({ ...getSnapshot(), profile }); }
export function toggleSaved(id: string) {
  const data = getSnapshot();
  if (!data.savedIds.includes(id) && data.savedIds.length >= 200) return false;
  return write({ ...data, savedIds: data.savedIds.includes(id) ? data.savedIds.filter((value) => value !== id) : [...data.savedIds, id] });
}
