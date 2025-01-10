import { api } from "@/api";
import toast from "react-hot-toast";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LogsAssetCache, TableSize } from "./types";

/**
 * This store is responsible for storing global state related to logs.
 */
export interface State {
  tableSize: TableSize;
  /** Number of assets to fetch for autocompletion (per asset type). 0 - fetch all */
  assetCacheSize: number;
  assetCache: LogsAssetCache;
}

export interface Actions {
  updateTableSize: (size: TableSize) => void;
  updateAssetCacheSize: (size: number) => void;
  /** Fetch assets and populate assetCache */
  fetchAssets: () => Promise<void>;
}

export const useLogsStore = create<State & Actions>()(
  persist(
    (set) => ({
      tableSize: "table-md",
      assetCacheSize: 0,
      assetCache: {},
      fetchAssets: async () => {
        const cache = await fetchAssetsCache();
        set(() => ({ assetCache: cache }));
      },
      updateTableSize: (size: TableSize) => set(() => ({ tableSize: size })),
      updateAssetCacheSize: (size: number) => set(() => ({ assetCacheSize: size })),
    }),
    {
      name: "logs",
      partialize: (state) => ({ tableSize: state.tableSize, assetCacheSize: state.assetCacheSize }),
    }
  )
);

async function fetchAssetsCache(): Promise<LogsAssetCache> {
  // WIP - set asset cache size
  try {
    const hosts = await api.get("/api/assets/hosts").then((response) => response.data);
    const firewallRules = await api.get("/api/assets/firewall_rules").then((response) => response.data);
    const services = await api.get("/api/assets/services").then((response) => response.data);
    return {
      hosts: hosts,
      firewallRules: firewallRules,
      services: services,
    };
  } catch (e) {
    console.error(e);
    toast.error("Failed to load asset cache.");
    return {};
  }
}
