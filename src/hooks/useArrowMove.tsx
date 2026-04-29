// src/hooks/useArrowKeyTokenMove.ts
import { useEffect } from "react";

interface Options {
  selectedTokenIds: string[];
  gridSize: number;
  snapToGrid: boolean;
  tokens: Array<{
    id: string;
    x: number;
    y: number;
    owner_id?: string | null;
    player_editable?: boolean;
  }>;
  isGM: boolean;
  currentUserId: string;
  onMoveToken: (id: string, x: number, y: number) => void;
}

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export function useArrowKeyTokenMove({
  selectedTokenIds,
  gridSize,
  snapToGrid,
  tokens,
  isGM,
  currentUserId,
  onMoveToken,
}: Options) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!ARROW_KEYS.has(e.key)) return;

      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;

      if (selectedTokenIds.length === 0) return;

      e.preventDefault();

      const step = snapToGrid ? gridSize : e.shiftKey ? 10 : 1;
      const dx =
        e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

      for (const id of selectedTokenIds) {
        const token = tokens.find((t) => t.id === id);
        if (!token) continue;

        if (!isGM) {
          if (!token.player_editable) continue;
          // Unowned = any player can move; owned = only the assigned player
          if (token.owner_id && token.owner_id !== currentUserId) continue;
        }

        let newX = token.x + dx;
        let newY = token.y + dy;

        if (snapToGrid && gridSize > 0) {
          const half = gridSize / 2;
          newX = Math.round((newX - half) / gridSize) * gridSize + half;
          newY = Math.round((newY - half) / gridSize) * gridSize + half;
        }

        onMoveToken(id, newX, newY);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedTokenIds,
    gridSize,
    snapToGrid,
    tokens,
    isGM,
    currentUserId,
    onMoveToken,
  ]);
}
