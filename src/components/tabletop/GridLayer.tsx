import { Group, Line, RegularPolygon } from "react-konva";
import { useGameStore } from "../../store/gameStore";

// Hex grid uses offset coordinates. We draw pointy-top hexagons.
function hexPoints(cx: number, cy: number, size: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
  }
  return pts;
}

interface GridLayerProps {
  width: number;
  height: number;
}

export default function GridLayer({ width, height }: GridLayerProps) {
  const { gridSize, gridOpacity, gridColor, gridType } = useGameStore(
    (s) => s.sceneSettings,
  );

  const stroke = gridColor;
  const opacity = gridOpacity;
  const lineProps = {
    stroke,
    strokeWidth: 1,
    opacity,
    perfectDrawEnabled: false,
    listening: false,
  };

  if (gridType === "hex") {
    // Pointy-top hex: width = sqrt(3) * size, height = 2 * size
    const size = gridSize / 2;
    const hexW = Math.sqrt(3) * size;
    const hexH = 2 * size;
    const rows = Math.ceil(height / (hexH * 0.75)) + 1;
    const cols = Math.ceil(width / hexW) + 1;
    const hexes: React.ReactNode[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = c * hexW + (r % 2 === 1 ? hexW / 2 : 0);
        const cy = r * hexH * 0.75;
        hexes.push(
          <Line
            key={`h-${r}-${c}`}
            points={[
              ...hexPoints(cx, cy, size),
              hexPoints(cx, cy, size)[0],
              hexPoints(cx, cy, size)[1],
            ]}
            closed
            {...lineProps}
          />,
        );
      }
    }
    return <Group listening={false}>{hexes}</Group>;
  }

  // Square grid
  const lines: React.ReactNode[] = [];
  const cols = Math.floor(width / gridSize);
  const rows = Math.floor(height / gridSize);

  for (let i = 0; i <= cols; i++) {
    lines.push(
      <Line
        key={`v${i}`}
        points={[i * gridSize, 0, i * gridSize, height]}
        {...lineProps}
      />,
    );
  }
  for (let j = 0; j <= rows; j++) {
    lines.push(
      <Line
        key={`h${j}`}
        points={[0, j * gridSize, width, j * gridSize]}
        {...lineProps}
      />,
    );
  }

  return <Group listening={false}>{lines}</Group>;
}
