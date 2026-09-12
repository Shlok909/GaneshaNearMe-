"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getUserSnapshot, parseDemoUser } from "./demo-auth";
import {
  parseSaved,
  readStorage,
  storageKeys,
  subscribeStorage,
  writeStorage,
} from "./demo-storage";
import {
  getPublicPandals,
  getSubmissionsSnapshot,
  parseSubmissions,
} from "./demo-submissions";

const serverSnapshot = () => null;
const savedSnapshot = () => readStorage(storageKeys.saved);

export function useSavedPandals() {
  const pandals = usePublicPandals();
  const raw = useSyncExternalStore(
    subscribeStorage,
    savedSnapshot,
    serverSnapshot,
  );
  const ids = useMemo(
    () =>
      parseSaved(raw).filter((id) =>
        pandals.some((pandal) => pandal.id === id),
      ),
    [raw, pandals],
  );
  function toggle(id: string) {
    const current = parseSaved(savedSnapshot());
    return writeStorage(
      storageKeys.saved,
      JSON.stringify(
        current.includes(id)
          ? current.filter((saved) => saved !== id)
          : [...current, id],
      ),
    );
  }
  return { ids, toggle };
}

export function useDemoSubmissions() {
  const raw = useSyncExternalStore(
    subscribeStorage,
    getSubmissionsSnapshot,
    serverSnapshot,
  );
  return useMemo(() => parseSubmissions(raw), [raw]);
}

export function usePublicPandals() {
  const submissions = useDemoSubmissions();
  return useMemo(() => getPublicPandals(submissions), [submissions]);
}

export function useDemoUser() {
  const raw = useSyncExternalStore(
    subscribeStorage,
    getUserSnapshot,
    serverSnapshot,
  );
  return useMemo(() => parseDemoUser(raw), [raw]);
}
