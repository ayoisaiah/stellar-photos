const oneOf =
  <const T extends readonly unknown[]>(values: T) =>
  (v: unknown): v is T[number] =>
    values.includes(v);

function serialized<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return navigator.locks.request(name, fn);
}

function defineStore<T extends { version: 1 }>(
  area: "sync" | "local",
  key: string,
  defaults: T,
  is: { [K in keyof T]: (v: unknown) => v is T[K] },
  label = key,
) {
  const parse = (raw: unknown): T => {
    if (!raw || typeof raw !== "object") return defaults;

    const r = raw as Record<string, unknown>;
    if (typeof r.version === "number" && r.version > 1) {
      throw new Error(`Unsupported ${label} version: ${r.version}`);
    }

    return Object.fromEntries(
      Object.keys(defaults).map((k) => [
        k,
        is[k as keyof T](r[k]) ? r[k] : defaults[k as keyof T],
      ]),
    ) as unknown as T;
  };

  const get = async (): Promise<T> => {
    const result = await chrome.storage[area].get(key);
    return parse(result[key]);
  };

  const set = (patch: Partial<Omit<T, "version">>): Promise<T> =>
    serialized(key, async () => {
      const current = await get();
      const updated = { ...current, ...patch, version: 1 as const };
      await chrome.storage[area].set({ [key]: updated });
      return updated;
    });

  return { get, key, parse, set };
}

export { defineStore, oneOf, serialized };
