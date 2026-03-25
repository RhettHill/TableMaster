
export interface Scene {
  id: string
  game_id: string
  name: string
  map_url: string
  map_width: number
  map_height: number
}

export type MeasureTool = "ruler" | "circle" | "cone" | "line" | "square";
export type ActiveTool =
  | "select"
  | "pan"
  | "ruler"
  | "circle"
  | "cone"
  | "line"
  | "square"
  | "wall"
  | "door"
  | "fog_reveal"
  | "fog_hide";

export function isMeasureTool(tool: ActiveTool): tool is MeasureTool {
  return ["ruler", "circle", "cone", "line", "square"].includes(tool);
}

export interface TokenStats {
  hp?: number;
  maxHp?: number;
  ac?: number;
  /** GM-controlled flag — when true the HP bar and AC badge render on the token */
  showStats?: boolean;
  vision_radius: number;
}

export interface Token {
  id: string;
  scene_id: string;
  name: string;
  image_url: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  visible: boolean;
  player_editable: boolean;
  token_size: number;
  stats_json?: TokenStats | null;
  owner_id?: string;
}