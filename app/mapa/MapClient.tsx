"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// IMPORTANTE: react-leaflet só no client via dynamic
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

type Center = [number, number];

export default function MapClient() {
  const [mounted, setMounted] = useState(false);
  const [center, setCenter] = useState<Center>([-20.0, -45.0]); // fallback (ajuste se quiser)
  const [zoom, setZoom] = useState(12);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Corrige ícones padrão do Leaflet no Next (senão marker pode quebrar em produção)
  useEffect(() => {
    if (!mounted) return;

    (async () => {
      const L = await import("leaflet");

      // @ts-expect-error - typings do leaflet permitem isso em runtime
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
        iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
        shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
      });
    })();
  }, [mounted]);

  // Pega localização do usuário
  useEffect(() => {
    if (!mounted) return;
    if (!("geolocation" in navigator)) {
      setGeoError("Seu navegador não suporta geolocalização.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter([lat, lng]);
        setZoom(15);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message || "Não foi possível obter sua localização.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }, [mounted]);

  const mapStyle = useMemo(
    () => ({
      height: "70vh",
      width: "100%",
      borderRadius: "18px",
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      border: "1px solid rgba(255,255,255,.10)",
    }),
    []
  );

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <main className="pat-shell">
          <div className="pat-header">
            <div className="pat-title">Mapa</div>
            <div className="pat-subtitle">
              Visualização da fazenda e sua localização atual
            </div>
          </div>

          {geoError ? (
            <div className="pat-card" style={{ marginBottom: 14 }}>
              <div className="pat-card-title">Aviso</div>
              <div className="pat-card-value" style={{ fontSize: 14, opacity: 0.95 }}>
                {geoError}
              </div>
            </div>
          ) : null}

          <div style={mapStyle}>
            {mounted ? (
              <MapContainer
                // aqui é o ponto que quebrava no Vercel
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={center}>
                  <Popup>Sua localização atual</Popup>
                </Marker>
              </MapContainer>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
