import { create } from "zustand"
import { Token, VisibilityMode } from "../types/Types"

export interface SceneSettings {
  gridSize: number
  gridOpacity: number
  gridColor: string
  gridType: "square" | "hex"
  snapToGrid: boolean
  bgColor: string
  mapWidth: number
  mapHeight: number
}

export interface GameSettings {
  gameName: string
  defaultGridSize: number
  bgColor: string
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
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  gameName: "",
  defaultGridSize: 70,
  bgColor: "#1a1a2e",
}

interface GameState {
  tokens: Token[]
  map: string
  zoom: number
  cameraX: number
  cameraY: number
  sceneSettings: SceneSettings
  gameSettings: GameSettings
  visibilityMode: VisibilityMode// default
  

  setTokens: (tokens: Token[]) => void
  addToken: (token: Token) => void
  moveToken: (id: string, x: number, y: number) => void
  updateToken: (id: string, patch: Partial<Token>) => void
  removeToken: (id: string) => void
  setZoom: (zoom: number) => void
  setCamera: (x: number, y: number) => void
  panCamera: (x: number, y: number) => void
  setZoomAndCamera: (zoom: number, x: number, y: number) => void
  setMap: (map: string) => void
  setSceneSettings: (settings: Partial<SceneSettings>) => void
  setGameSettings: (settings: Partial<GameSettings>) => void
}

export const useGameStore = create<GameState>((set) => ({
  tokens: [],
  map: "/testmap.jpg",
  zoom: 1,
  cameraX: 0,
  cameraY: 0,
  sceneSettings: DEFAULT_SCENE_SETTINGS,
  gameSettings: DEFAULT_GAME_SETTINGS,

  // NEW visibility mode state
  visibilityMode: "fog",
  setVisibilityMode: (mode:any) => set({ visibilityMode: mode }),

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
  setMap: (map) => set({ map }),
  setSceneSettings: (settings) =>
    set((state) => ({
      sceneSettings: { ...state.sceneSettings, ...settings },
    })),
  setGameSettings: (settings) =>
    set((state) => ({
      gameSettings: { ...state.gameSettings, ...settings },
    })),
}))