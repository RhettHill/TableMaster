// src/store/gameStore.ts
import { create } from "zustand";
import { Token, VisibilityMode } from "../types/Types";

export interface SceneSettings {
  gridSize: number;
  gridOpacity: number;
  gridColor: string;
  gridType: "square" | "hex";
  snapToGrid: boolean;
  bgColor: string;
  mapWidth: number;
  mapHeight: number;
}

export interface GameSettings {
  gameName: string;
  defaultGridSize: number;
  bgColor: string;
}

// Cached metadata for the currently loaded game — avoids re-fetching on tab switch
export interface GameMeta {
  gameId: string;
  ownerId: string;
  systemId: string | null;
  systemSlug: string;
}

export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  gridSize: 70,
  gridOpacity: 0.2,
  gridColor: "#ffffff",
  gridType: "square",
  snapToGrid: true,
  bgColor: "#1a1a2e",
  mapWidth: 3500,
  mapHeight: 3500,
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  gameName: "",
  defaultGridSize: 70,
  bgColor: "#1a1a2e",
};

interface GameState {
  tokens: Token[];
  map: string;
  mapMimeType: string | null;
  mapIsAnimated: boolean;
  mapIsVideo: boolean;
  zoom: number;
  cameraX: number;
  cameraY: number;
  sceneSettings: SceneSettings;
  gameSettings: GameSettings;
  visibilityMode: VisibilityMode;

  // ── Game metadata cache ───────────────────────────────────────────────────
  // Populated once when entering a game session. Cleared when leaving.
  // Prevents redundant fetches on window focus / re-render.
  gameMeta: GameMeta | null;

  setTokens: (tokens: Token[]) => void;
  addToken: (token: Token) => void;
  moveToken: (id: string, x: number, y: number) => void;
  updateToken: (id: string, patch: Partial<Token>) => void;
  removeToken: (id: string) => void;
  setZoom: (zoom: number) => void;
  setCamera: (x: number, y: number) => void;
  panCamera: (x: number, y: number) => void;
  setZoomAndCamera: (zoom: number, x: number, y: number) => void;
  setMap: (map: string, mimeType?: string | null, isAnimatedFallback?: boolean, isVideoFallback?: boolean) => void;
  setSceneSettings: (settings: Partial<SceneSettings>) => void;
  setGameSettings: (settings: Partial<GameSettings>) => void;
  setVisibilityMode: (mode: VisibilityMode) => void;
  setGameMeta: (meta: GameMeta | null) => void;
}

const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);
const GIF_MIME = new Set(["image/gif"]);

export const useGameStore = create<GameState>((set) => ({
  tokens: [],
  map: "/testmap.jpg",
  mapMimeType: null,
  mapIsAnimated: false,
  mapIsVideo: false,
  zoom: 1,
  cameraX: 0,
  cameraY: 0,
  sceneSettings: DEFAULT_SCENE_SETTINGS,
  gameSettings: DEFAULT_GAME_SETTINGS,
  visibilityMode: "fog",
  gameMeta: null,

  setVisibilityMode: (mode) => set({ visibilityMode: mode }),
  setGameMeta: (meta) => set({ gameMeta: meta }),

  setTokens: (tokens) => set({ tokens }),
  addToken: (token) => set((state) => ({ tokens: [...state.tokens, token] })),
  moveToken: (id, x, y) =>
    set((state) => ({
      tokens: state.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)),
    })),
  updateToken: (id, patch) =>
    set((state) => ({
      tokens: state.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeToken: (id) =>
    set((state) => ({
      tokens: state.tokens.filter((t) => t.id !== id),
    })),
  setZoom: (zoom) => set({ zoom }),
  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
  panCamera: (x, y) => set({ cameraX: x, cameraY: y }),
  setZoomAndCamera: (zoom, x, y) => set({ zoom, cameraX: x, cameraY: y }),

  setMap: (map, mimeType = null, isAnimatedFallback = false, isVideoFallback = false) =>
    set({
      map,
      mapMimeType: mimeType,
      mapIsVideo: mimeType ? VIDEO_MIME.has(mimeType) : isVideoFallback,
      mapIsAnimated: mimeType
        ? GIF_MIME.has(mimeType)
        : isAnimatedFallback && !isVideoFallback,
    }),

  setSceneSettings: (settings) =>
    set((state) => ({
      sceneSettings: { ...state.sceneSettings, ...settings },
    })),
  setGameSettings: (settings) =>
    set((state) => ({
      gameSettings: { ...state.gameSettings, ...settings },
    })),
}));