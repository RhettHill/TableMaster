import { create } from "zustand"

export type SnapMode = "corner" | "center"
export type MeasureTool = "none" | "ruler" | "circle" | "cone" | "line" | "square"

export interface Point {
  x: number
  y: number
}

export interface MeasureState {
  // GM-configured grid scale
  feetPerSquare: number

  // Shared player/GM settings
  snapMode: SnapMode
  activeTool: MeasureTool

  // Live drawing state (origin + cursor)
  origin: Point | null
  cursor: Point | null

  // Cone needs an angle parameter (degrees, default 60)
  coneAngle: number

  // Line/square need a width (squares)
  lineWidth: number  // in grid squares, default 1

  // Actions
  setFeetPerSquare: (ft: number) => void
  setSnapMode: (mode: SnapMode) => void
  setActiveTool: (tool: MeasureTool) => void
  setOrigin: (pt: Point | null) => void
  setCursor: (pt: Point | null) => void
  setConeAngle: (deg: number) => void
  setLineWidth: (sq: number) => void
  clearMeasure: () => void
}

export const useMeasurementStore = create<MeasureState>((set) => ({
  feetPerSquare: 5,
  snapMode: "center",
  activeTool: "none",
  origin: null,
  cursor: null,
  coneAngle: 60,
  lineWidth: 1,

  setFeetPerSquare: (ft) => set({ feetPerSquare: ft }),
  setSnapMode: (mode) => set({ snapMode: mode }),
  setActiveTool: (tool) =>
    set({ activeTool: tool, origin: null, cursor: null }),
  setOrigin: (pt) => set({ origin: pt }),
  setCursor: (pt) => set({ cursor: pt }),
  setConeAngle: (deg) => set({ coneAngle: deg }),
  setLineWidth: (sq) => set({ lineWidth: sq }),
  clearMeasure: () => set({ origin: null, cursor: null }),
}))