import { Group } from "react-konva";
import { useEffect, useState, useCallback, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import Token from "../tokens/Tokens";
import { Token as TokenType } from "../../types/Types";
import { snapToGrid, type GridType } from "../../utils/GridUtils";

interface TokenLayerProps {
  gridSize: number;
  gridType: GridType;
  snapEnabled: boolean;
  isGM: boolean;
  disableDrag: boolean;
  onMoveToken: (id: string, x: number, y: number) => void;
  onContextMenu: (token: TokenType, screenX: number, screenY: number) => void;
  onDeleteTokens: (ids: string[]) => void;
}

export default function TokenLayer({
  gridSize,
  gridType,
  snapEnabled,
  isGM,
  disableDrag,
  onMoveToken,
  onContextMenu,
  onDeleteTokens,
}: TokenLayerProps) {
  const tokens = useGameStore((s) => s.tokens);
  const storeMoveToken = useGameStore((s) => s.moveToken);

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(new Set());

  const syncSelection = (next: Set<string>) => {
    selectedIdsRef.current = next;
    setSelectedIds(next);
  };

  const handleSelect = useCallback(
    (token: TokenType, additive: boolean) => {
      if (!isGM && !token.player_editable) return;
      const prev = selectedIdsRef.current;
      const next = new Set(prev);
      if (additive) {
        if (next.has(token.id)) next.delete(token.id);
        else next.add(token.id);
      } else {
        if (next.size === 1 && next.has(token.id)) next.clear();
        else {
          next.clear();
          next.add(token.id);
        }
      }
      syncSelection(next);
    },
    [isGM],
  );

  // ── Multi-token drag ───────────────────────────────────────────────────────
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const dragStartPrimary = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback(
    (token: TokenType) => {
      const current = selectedIdsRef.current;
      let activeIds: Set<string>;
      if (!current.has(token.id)) {
        activeIds = new Set([token.id]);
        syncSelection(activeIds);
      } else {
        activeIds = current;
      }
      dragStartPrimary.current = { x: token.x, y: token.y };
      dragStartPositions.current = new Map(
        tokens
          .filter((t) => activeIds.has(t.id))
          .map((t) => [t.id, { x: t.x, y: t.y }]),
      );
    },
    [tokens],
  );

  const handleDragMove = useCallback(
    (
      primaryId: string,
      rawX: number,
      rawY: number,
      // Konva node ref so we can snap the visual position mid-drag
      node: { x: (v: number) => void; y: (v: number) => void },
    ) => {
      const start = dragStartPrimary.current;
      if (!start) return;

      // Snap the primary token's visual position while dragging
      let sx = rawX;
      let sy = rawY;
      if (snapEnabled) {
        const s = snapToGrid(rawX, rawY, gridSize, gridType);
        sx = s.x;
        sy = s.y;
        node.x(sx);
        node.y(sy);
      }

      // Move companions by the same delta as the snapped primary
      const dx = sx - start.x;
      const dy = sy - start.y;
      dragStartPositions.current.forEach((startPos, id) => {
        if (id === primaryId) return;
        storeMoveToken(id, startPos.x + dx, startPos.y + dy);
      });
    },
    [storeMoveToken, snapEnabled, gridSize, gridType],
  );

  const handleDragEnd = useCallback(
    (rawX: number, rawY: number) => {
      const start = dragStartPrimary.current;
      if (!start) return;

      // Final snapped position of primary
      let fx = rawX;
      let fy = rawY;
      if (snapEnabled) {
        const s = snapToGrid(rawX, rawY, gridSize, gridType);
        fx = s.x;
        fy = s.y;
      }

      const dx = fx - start.x;
      const dy = fy - start.y;

      // Persist all moved tokens
      dragStartPositions.current.forEach((startPos, id) => {
        onMoveToken(id, startPos.x + dx, startPos.y + dy);
      });

      dragStartPrimary.current = null;
      dragStartPositions.current = new Map();
    },
    [snapEnabled, gridSize, gridType, onMoveToken],
  );

  // ── Delete key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const ids = selectedIdsRef.current;
      if (ids.size === 0) return;
      const toDelete = [...ids].filter((id) => {
        if (isGM) return true;
        return tokens.find((t) => t.id === id)?.player_editable ?? false;
      });
      if (toDelete.length === 0) return;
      const names = toDelete
        .map((id) => tokens.find((t) => t.id === id)?.name ?? id)
        .join(", ");
      if (
        window.confirm(
          toDelete.length === 1
            ? `Delete ${names}?`
            : `Delete ${toDelete.length} tokens?`,
        )
      ) {
        onDeleteTokens(toDelete);
        syncSelection(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tokens, isGM, onDeleteTokens]);

  // Clean stale selections
  useEffect(() => {
    const tokenIds = new Set(tokens.map((t) => t.id));
    const current = selectedIdsRef.current;
    const filtered = new Set([...current].filter((id) => tokenIds.has(id)));
    if (filtered.size !== current.size) syncSelection(filtered);
  }, [tokens]);

  return (
    <Group>
      {tokens.map((token) => {
        const canInteract = isGM || token.player_editable;
        return (
          <Token
            key={token.id}
            token={token}
            gridSize={gridSize}
            gridType={gridType}
            snapEnabled={snapEnabled}
            isGM={isGM}
            selected={selectedIds.has(token.id)}
            draggable={!disableDrag && canInteract}
            onSelect={handleSelect}
            onContextMenu={onContextMenu}
            onDragStart={() => handleDragStart(token)}
            onDragMove={(e) => {
              const n = e.target;
              handleDragMove(token.id, n.x(), n.y(), {
                x: (v: number) => n.x(v),
                y: (v: number) => n.y(v),
              });
            }}
            onDragEnd={(e) => handleDragEnd(e.target.x(), e.target.y())}
          />
        );
      })}
    </Group>
  );
}
