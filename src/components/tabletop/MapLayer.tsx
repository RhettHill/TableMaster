import { Group, Image } from "react-konva";
import useImage from "use-image";

interface MapLayerProps {
  width: number;
  height: number;
  src: string;
}

export default function MapLayer({ width, height, src }: MapLayerProps) {
  const [map, status] = useImage(src);

  // listening={false} — the map background never needs to receive pointer events
  return (
    <Group listening={false}>
      {status === "loaded" && map && (
        <Image
          image={map}
          width={width}
          height={height}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}
