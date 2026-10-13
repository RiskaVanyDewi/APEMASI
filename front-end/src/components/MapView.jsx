import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import { Button, Badge } from "./ui";

function fmt(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "0";
  return n.toFixed(3).replace(/\.000$/, "");
}

const createMarkerIcon = (color, isSelected = false) => {
  const size = isSelected ? 32 : 24;
  const innerSize = isSelected ? 16 : 12;

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid ${color};
        transform: translate(-50%, -50%);
      ">
        <div style="
          width: ${innerSize}px;
          height: ${innerSize}px;
          background-color: ${color};
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const standardIcon = createMarkerIcon("#3b82f6"); // Blue 500
const selectedIcon = createMarkerIcon("#1e1b4b", true); // Extra Dark Blue (Indigo 950)

function MapController({ selected, buildings }) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;
    if (selected.lat == null || selected.lng == null) return;
    if (!map) return;

    try {
      const zoomLevel = 15;

      map.flyTo([selected.lat, selected.lng], zoomLevel, {
        duration: 1.5,
        easeLinearity: 0.5,
      });

    } catch (err) {
      console.error("MapController error:", err);
    }
  }, [selected?.id, selected?.lat, selected?.lng, map]);

  return null;
}

export default function MapView({ buildings = [], selected = null, onSelectBuilding }) {
 
  const validBuildings = buildings.filter(b => b.lat != null && b.lng != null);

  const initialCenter = validBuildings.length
    ? [validBuildings[0].lat, validBuildings[0].lng]
    : [-7.4305903, 109.2483547]; // Default to Purwokerto/Banyumas area

  return (
    <MapContainer
      center={initialCenter}
      zoom={12}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {}
      <ZoomControl position="bottomright" />
      {}

      {}
      <MapController selected={selected} />

      {validBuildings.map((b) => {
        const isSelected = selected && b.id === selected.id;
        return (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={isSelected ? selectedIcon : standardIcon}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup>
              <div className="space-y-2">
                <div className="font-semibold">{b.code}</div>
                <div className="text-xs text-slate-600">
                  {b.lokasi} • HM {b.hm}
                </div>
                <Badge tone="info">Saluran {b.saluran}</Badge>
                {((b.luasPadi ?? 0) + (b.luasPalawija ?? 0) + (b.luasHorti ?? 0) + (b.luasKolam ?? 0) + (b.luasTebu ?? 0) > 0) && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
                    <div>Total area: {fmt((b.luasPadi ?? 0) + (b.luasPalawija ?? 0) + (b.luasHorti ?? 0) + (b.luasKolam ?? 0) + (b.luasTebu ?? 0))} Ha</div>
                    <div>ΣQ: {fmt(b.sumQ ?? 0)} lt/dt</div>
                  </div>
                )}
                <Button onClick={() => onSelectBuilding?.(b)} className="w-full">
                  Lihat Detail
                </Button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}