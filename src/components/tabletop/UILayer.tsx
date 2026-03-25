import { Text } from "react-konva";
import { useGameStore } from "../../store/gameStore";

export default function UILayer() {
  const zoom = useGameStore((s) => s.zoom);

  return (
    <Text
      text={`Zoom: ${zoom.toFixed(2)}`}
      x={20}
      y={20}
      fontSize={18}
      fill="white"
    />
  );
}
