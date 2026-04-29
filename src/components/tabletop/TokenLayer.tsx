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
  currentUserId: string;
  disableDrag: boolean;
  onMoveToken: (id: string, x: number, y: number) => void;
  onContextMenu: (token: TokenType, screenX: number, screenY: number) => void;
  onDeleteTokens: (ids: string[]) => void;
  onSelectionChange?: (ids: string[]) => void;
}

// Permission rules:
//   GM              → always full control
//   player_editable, no owner_id  → any player can control (unassigned)
//   player_editable, owner_id set → only that player can control
//   not player_editable           → no player control
function canControlToken(
  token: TokenType,
  isGM: boolean,
  currentUserId: string,
): boolean {
  if (isGM) return true;
  if (!token.player_editable) return false;
  if (!token.owner_id) return true; // unowned — any player
  return token.owner_id === currentUserId; // owned — only the owner
}

function canInteractWithToken(token: TokenType, isGM: boolean): boolean {
  return isGM || token.player_editable;
}

export default function TokenLayer({
  gridSize,
  gridType,
  snapEnabled,
  isGM,
  currentUserId,
  disableDrag,
  onMoveToken,
  onContextMenu,
  onDeleteTokens,
  onSelectionChange,
}: TokenLayerProps) {
  const tokens = useGameStore((s) => s.tokens);
  const storeMoveToken = useGameStore((s) => s.moveToken);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(new Set());

  const syncSelection = useCallback(
    (next: Set<string>) => {
      selectedIdsRef.current = next;
      setSelectedIds(next);
      onSelectionChange?.([...next]);
    },
    [onSelectionChange],
  );

  const handleSelect = useCallback(
    (token: TokenType, additive: boolean) => {
      if (!canInteractWithToken(token, isGM)) return;
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
    [isGM, syncSelection],
  );

  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const dragStartPrimary = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback(
    (token: TokenType) => {
      const current = selectedIdsRef.current;
      const activeIds = current.has(token.id) ? current : new Set([token.id]);
      if (!current.has(token.id)) syncSelection(activeIds);
      dragStartPrimary.current = { x: token.x, y: token.y };
      dragStartPositions.current = new Map(
        tokens
          .filter((t) => activeIds.has(t.id))
          .map((t) => [t.id, { x: t.x, y: t.y }]),
      );
    },
    [tokens, syncSelection],
  );

  const handleDragMove = useCallback(
    (
      primaryId: string,
      rawX: number,
      rawY: number,
      node: { x: (v: number) => void; y: (v: number) => void },
    ) => {
      const start = dragStartPrimary.current;
      if (!start) return;
      let sx = rawX,
        sy = rawY;
      if (snapEnabled) {
        const s = snapToGrid(rawX, rawY, gridSize, gridType);
        sx = s.x;
        sy = s.y;
        node.x(sx);
        node.y(sy);
      }
      const dx = sx - start.x,
        dy = sy - start.y;
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
      let fx = rawX,
        fy = rawY;
      if (snapEnabled) {
        const s = snapToGrid(rawX, rawY, gridSize, gridType);
        fx = s.x;
        fy = s.y;
      }
      const dx = fx - start.x,
        dy = fy - start.y;
      dragStartPositions.current.forEach((startPos, id) => {
        onMoveToken(id, startPos.x + dx, startPos.y + dy);
      });
      dragStartPrimary.current = null;
      dragStartPositions.current = new Map();
    },
    [snapEnabled, gridSize, gridType, onMoveToken],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const ids = selectedIdsRef.current;
      if (ids.size === 0) return;
      const toDelete = [...ids].filter((id) => {
        const token = tokens.find((t) => t.id === id);
        return token ? canControlToken(token, isGM, currentUserId) : false;
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
  }, [tokens, isGM, currentUserId, onDeleteTokens, syncSelection]);

  useEffect(() => {
    const tokenIds = new Set(tokens.map((t) => t.id));
    const current = selectedIdsRef.current;
    const filtered = new Set([...current].filter((id) => tokenIds.has(id)));
    if (filtered.size !== current.size) syncSelection(filtered);
  }, [tokens, syncSelection]);

  return (
    <Group>
      {tokens.map((token) => {
        const canControl = canControlToken(token, isGM, currentUserId);
        const canInteract = canInteractWithToken(token, isGM);
        return (
          <Token
            key={token.id}
            token={token}
            gridSize={gridSize}
            gridType={gridType}
            snapEnabled={snapEnabled}
            isGM={isGM}
            currentUserId={currentUserId}
            selected={selectedIds.has(token.id)}
            draggable={!disableDrag && canControl}
            onSelect={canInteract ? handleSelect : undefined}
            onContextMenu={canInteract ? onContextMenu : undefined}
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
