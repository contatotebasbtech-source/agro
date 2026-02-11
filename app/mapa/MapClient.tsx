"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

type LatLng = { lat: number; lng: number };

// Carrega componentes do react-leaflet só no client (evita SSR/hydration)
const MapContainer = dynamic(
  async () => (await import("react-leaflet")).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, {
  ssr: false,
});
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, {
  ssr: false,
});
const Popup = dynamic(async () => (await import("react-leaflet")).Popup, {
  ssr: false,
});

export default function MapClient() {
  const [mounted, setMounted] = useState(false);
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<string>("");

  const [zoom, setZoom] = useState<number>(14);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Corrige ícones do Leaflet no build (Vercel)
  useEffect(() => {
    if (!mounted) return;

    (async () => {
      try {
        const L = await import("leaflet");

        // @ts-ignore
        delete (L as any).Icon.Default.prototype._getIconUrl;

        // @ts-ignore
        (L as any).Icon.Default.mergeOptions({
          iconRetinaUrl: "/leaflet/marker-icon-2x.png",
          iconUrl: "/leaflet/marker-icon.png",
          shadowUrl: "/leaflet/marker-shadow.png",
        });
      } catch (e) {
        // sem travar a tela
        console.warn("Leaflet icon patch failed:", e);
      }
    })();
  }, [mounted]);

  function pedirLocalizacao() {
    if (!navigator.geolocation) {
      setStatus("Geolocalização não suportada no seu navegador.");
      return;
    }

    setStatus("Obtendo sua localização...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(next);
        setStatus("");
      },
      (err) => {
        console.warn(err);
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("Permissão negada. Ative a localização no navegador.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus("Localização indisponível.");
        } else if (err.code === err.TIMEOUT) {
          setStatus("Tempo esgotado ao obter localização.");
        } else {
          setStatus("Falha ao obter localização.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  useEffect(() => {
    // tenta pegar a localização automaticamente ao abrir
    if (!mounted) return;
    pedirLocalizacao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const center = useMemo<LatLng>(() => {
    // fallback (Brasil) até pegar a localização real
    return loc ?? { lat: -15.793889, lng: -47.882778 }; // Brasília
  }, [loc]);

  if (!mounted) {
    return (
      <div className="pat-card" style={{ padding: 16 }}>
        Carregando mapa...
      </div>
    );
  }

  return (
    <div className="pat-card" style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Mapa</div>
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            Mostra sua posição atual (quando permitido)
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="pat-btn" type="button" onClick={pedirLocalizacao}>
            Usar minha localização
          </button>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ opacity: 0.85, fontSize: 13 }}>Zoom</span>
            <select
              className="pat-input"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: 90 }}
            >
              {[6, 8, 10, 12, 14, 16, 18].map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {status ? (
        <div
          className="pat-card"
          style={{
            padding: 12,
            marginBottom: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.12)",
          }}
        >
          {status}
        </div>
      ) : null}

      <div
        style={{
          height: 520,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {loc ? (
            <Marker position={[loc.lat, loc.lng]}>
              <Popup>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Você está aqui
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Lat: {loc.lat.toFixed(6)}
                  <br />
                  Lng: {loc.lng.toFixed(6)}
                </div>
              </Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
        Dica: se aparecer um ponto errado, clique em “Usar minha localização”
        novamente.
      </div>
    </div>
  );
}
