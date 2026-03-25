import { Circle, Text, Group, Image, Line, Rect } from "react-konva";
import { Token } from "../../types/Types";
import { KonvaEventObject } from "konva/lib/Node";
import useImage from "use-image";
import {
  tokenRadius,
  tokenOffset,
  snapToGrid,
  type GridType,
} from "../../utils/GridUtils";

interface TokenProps {
  token: Token;
  gridSize: number;
  gridType: GridType;
  snapEnabled: boolean;
  isGM: boolean;
  selected?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  onContextMenu?: (token: Token, screenX: number, screenY: number) => void;
  onSelect?: (token: Token, additive: boolean) => void;
}

function TokenImage({ src, radius }: { src: string; radius: number }) {
  const [image, status] = useImage(src, "anonymous");
  if (status !== "loaded" || !image) return null;
  return (
    <Image
      image={image}
      width={radius * 2}
      height={radius * 2}
      x={-radius}
      y={-radius}
      clipFunc={(ctx: any) => ctx.arc(0, 0, radius, 0, Math.PI * 2)}
      perfectDrawEnabled={false}
      listening={false}
    />
  );
}

function DashedCircle({ radius }: { radius: number }) {
  const segments = 48;
  const pts: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  return (
    <Line
      points={pts}
      closed
      stroke="rgba(255,255,255,0.5)"
      strokeWidth={2}
      dash={[6, 5]}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function HpBar({
  hp,
  maxHp,
  radius,
}: {
  hp: number;
  maxHp: number;
  radius: number;
}) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const barW = radius * 2;
  const barH = Math.max(4, radius * 0.18);
  const barX = -radius;
  const barY = -radius - barH - 4;
  const fill =
    pct > 0.5
      ? "rgba(52,211,153,0.9)"
      : pct > 0.25
        ? "rgba(251,191,36,0.9)"
        : "rgba(239,68,68,0.9)";
  return (
    <Group listening={false}>
      <Rect
        x={barX}
        y={barY}
        width={barW}
        height={barH}
        fill="rgba(0,0,0,0.55)"
        cornerRadius={barH / 2}
        perfectDrawEnabled={false}
      />
      {pct > 0 && (
        <Rect
          x={barX}
          y={barY}
          width={barW * pct}
          height={barH}
          fill={fill}
          cornerRadius={barH / 2}
          perfectDrawEnabled={false}
        />
      )}
      <Text
        x={barX}
        y={barY - 13}
        width={barW}
        text={`${hp}/${maxHp}`}
        fontSize={Math.max(8, radius * 0.28)}
        fill="rgba(255,255,255,0.75)"
        align="center"
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}

function AcBadge({ ac, radius }: { ac: number; radius: number }) {
  const badgeR = Math.max(8, radius * 0.28);
  return (
    <Group x={radius * 0.65} y={-radius * 0.65} listening={false}>
      <Circle
        radius={badgeR}
        fill="rgba(30,30,50,0.92)"
        stroke="rgba(148,163,184,0.7)"
        strokeWidth={1}
        perfectDrawEnabled={false}
      />
      <Text
        text={String(ac)}
        fontSize={Math.max(7, badgeR * 0.95)}
        fontStyle="bold"
        fill="rgba(203,213,225,0.95)"
        align="center"
        verticalAlign="middle"
        width={badgeR * 2}
        height={badgeR * 2}
        x={-badgeR}
        y={-badgeR}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}

function SelectionRing({ radius }: { radius: number }) {
  return (
    <Circle
      radius={radius + 4}
      fill="transparent"
      stroke="rgba(99,179,237,0.9)"
      strokeWidth={2}
      dash={[6, 3]}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

export default function Token({
  token,
  gridSize,
  gridType,
  snapEnabled,
  isGM,
  selected = false,
  draggable = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  onContextMenu,
  onSelect,
}: TokenProps) {
  const size = token.token_size ?? 1;
  const radius = tokenRadius(size, gridSize, gridType);
  const offset = tokenOffset(size, gridSize, gridType);

  if (!token.visible && !isGM) return null;

  const isHidden = !token.visible;
  const canDrag = draggable && (isGM || token.player_editable);
  const stats = token.stats_json;
  const showStats = stats?.showStats === true; // visible to everyone when enabled

  const handleContextMenu = (e: KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (!onContextMenu) return;

    // GM can right-click any token.
    // Players can only right-click tokens they can edit.
    if (!isGM && !token.player_editable) return;

    const stage = e.target.getStage();
    const container = stage?.container();
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    onContextMenu(token, rect.left + pos.x, rect.top + pos.y);
  };

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!onSelect) return;
    onSelect(token, e.evt.shiftKey);
  };

  return (
    <Group
      x={token.x}
      y={token.y}
      rotation={token.rotation}
      scaleX={token.scale}
      scaleY={token.scale}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      opacity={isHidden ? 0.4 : 1}
      perfectDrawEnabled={false}
    >
      <Group x={offset} y={offset}>
        {selected && <SelectionRing radius={radius} />}
        <Circle
          radius={radius}
          fill="#2c2c3e"
          stroke={
            selected
              ? "rgba(99,179,237,0.9)"
              : isHidden
                ? "transparent"
                : "rgba(255,255,255,0.6)"
          }
          strokeWidth={selected ? 2.5 : 2}
          shadowColor="black"
          shadowBlur={isHidden ? 0 : 8}
          shadowOpacity={0.6}
          perfectDrawEnabled={false}
        />
        {isHidden && <DashedCircle radius={radius} />}
        {token.image_url ? (
          <TokenImage src={token.image_url} radius={radius} />
        ) : (
          <Text
            text={token.name?.charAt(0).toUpperCase() ?? "?"}
            fontSize={Math.max(10, radius * 0.8)}
            fontStyle="bold"
            fill="white"
            align="center"
            verticalAlign="middle"
            width={radius * 2}
            height={radius * 2}
            x={-radius}
            y={-radius}
            listening={false}
          />
        )}
        {isHidden && (
          <Text
            text="🚫"
            fontSize={Math.max(8, radius * 0.35)}
            x={radius * 0.5}
            y={-radius}
            listening={false}
          />
        )}
        {showStats && stats?.maxHp != null && stats?.hp != null && (
          <HpBar hp={stats.hp} maxHp={stats.maxHp} radius={radius} />
        )}
        {showStats && stats?.ac != null && (
          <AcBadge ac={stats.ac} radius={radius} />
        )}
        <Text
          text={token.name ?? ""}
          fontSize={11}
          fill={isHidden ? "rgba(255,255,255,0.4)" : "white"}
          align="center"
          width={radius * 4}
          x={-radius * 2}
          y={radius + 4}
          listening={false}
          shadowColor="black"
          shadowBlur={4}
          shadowOpacity={0.9}
        />
      </Group>
    </Group>
  );
}
