"use client";
import { useEffect, useState } from "react";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_KEYS, type ContextData } from "./context-map";

function FrameDistrict({ data }: { data: ContextData }) {
  const map = useMap();
  useEffect(() => {
    // El distrito incluye la Cartuja: empezar en la zona del caso evita un plano demasiado lejano.
    map.setView([37.383, -6.006], 14);
  }, [map, data]);
  return (
    <div className="absolute top-3 right-3 z-[1000]">
      <button
        type="button"
        className="rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow"
        onClick={() => {
          if (data.distritos)
            map.fitBounds(L.geoJSON(data.distritos).getBounds(), { padding: [24, 24] });
        }}
      >
        Ver todo Triana
      </button>
    </div>
  );
}

export default function ContextLeaflet({ data, active }: { data: ContextData; active: string[] }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {tilesFailed && (
        <p role="status" className="text-sm text-muted-foreground">
          El mapa base no se ha podido cargar. Los puntos y la tabla siguen disponibles.
        </p>
      )}
      <MapContainer
        center={[37.383, -6.006]}
        zoom={14}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-[28rem] w-full rounded-xl border"
        aria-label="Mapa de los servicios de Triana. Letras T, S, R, B y C según la leyenda; tabla equivalente debajo."
      >
        <ZoomControl zoomInTitle="Acercar" zoomOutTitle="Alejar" />
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={
            '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a> · Datos: Ayuntamiento de Sevilla'
          }
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />
        <FrameDistrict data={data} />
        {data.distritos && (
          <GeoJSON
            data={data.distritos}
            style={{ color: "#64748b", weight: 2, fillOpacity: 0.04 }}
          />
        )}
        {MAP_KEYS.filter((key) => active.includes(key.id)).flatMap(
          (key) =>
            data[key.id]?.features.flatMap((feature, index) => {
              if (feature.geometry.type !== "Point") return [];
              const [longitude, latitude] = feature.geometry.coordinates;
              const icon = L.divIcon({
                className: "",
                iconSize: [24, 24],
                // Separar símbolos coincidentes sin alterar las coordenadas reales.
                iconAnchor: [key.symbol === "B" ? 24 : key.symbol === "C" ? 0 : 12, 12],
                html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${key.color};color:white;border:2px solid white;font:bold 12px system-ui;box-shadow:0 1px 4px #0005">${key.symbol}</span>`,
              });
              return [
                <Marker
                  key={`${key.id}-${index}`}
                  position={[latitude, longitude]}
                  icon={icon}
                  title={`${key.label}: ${feature.properties.nombre}`}
                >
                  <Popup>
                    <strong>{feature.properties.nombre}</strong>
                    <p>{key.label}</p>
                    {feature.properties.detalle && <p>{feature.properties.detalle}</p>}
                  </Popup>
                </Marker>,
              ];
            }) ?? [],
        )}
      </MapContainer>
    </div>
  );
}
