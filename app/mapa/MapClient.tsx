"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// CSS do Leaflet + Draw (IMPORTANTE para aparecer ícones/botões)
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// react-leaflet e react-leaflet-draw precisam rodar só no client
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), {
  ssr: false,
});
const FeatureGroup = dynamic(
  () => import("react-leaflet").then((m) => m.FeatureGroup),
  { ssr: false }
);
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

// EditControl vem do react-leaflet-draw
const EditControl = dynamic(
  () => import("react-leaflet-draw").then((m) => m.EditControl),
  { ssr: false }
);

type PinTipo = "Ponto" | "Area";

export type Pin = {
  id: string;
  nome: string;
  tipo: PinTipo;
  lat: number;
  lng: number;
  // quando for área (polígono/retângulo), guardamos GeoJSON
  geojson?: any;
};

type Props = {
  center: { lat: number; lng: number };
  zoom: number;
  pins: Pin[];
  onPinsChange: (next: Pin[]) => void;
  height?: number | string;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function MapClient({
  center,
  zoom,
  pins,
  onPinsChange,
  height = 380,
}: Props) {
  const mountedRef = useRef(false);
  const fgRef = useRef<any>(null);

  // Corrige ícones padrão do Leaflet (sem precisar colocar arquivos no /public)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const L: any = await import("leaflet");

        // Evita erro em hot-reload
        if (cancelled) return;

        delete L.Icon.Default.prototype._getIconUrl;

        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
      } catch {
        // se falhar, não quebra o app
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Só renderiza mapa depois de montar (evita mismatch)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mapCenter = useMemo(() => [center.lat, center.lng] as [number, number], [center]);

  function addPin(pin: Pin) {
    const next = [pin, ...pins];
    onPinsChange(next);
  }

  function removePin(id: string) {
    const next = pins.filter((p) => p.id !== id);
    onPinsChange(next);
  }

  // Quando desenha algo no mapa
  async function handleCreated(e: any) {
    try {
      const layer = e.layer;
      const layerType = e.layerType; // "marker", "polygon", "rectangle", etc

      if (layerType === "marker") {
        const latlng = layer.getLatLng();
        const nome = prompt("Nome do ponto:", "Novo ponto") || "Novo ponto";

        addPin({
          id: uid(),
          nome,
          tipo: "Ponto",
          lat: Number(latlng.lat),
          lng: Number(latlng.lng),
        });
        return;
      }

      // Áreas (polígono/retângulo)
      if (layerType === "polygon" || layerType === "rectangle") {
        const nome = prompt("Nome da área/talhão:", "Nova área") || "Nova área";

        // GeoJSON da área
        const geojson = layer.toGeoJSON();

        // centro aproximado para listar
        const b = layer.getBounds();
        const c = b.getCenter();

        addPin({
          id: uid(),
          nome,
          tipo: "Area",
          lat: Number(c.lat),
          lng: Number(c.lng),
          geojson,
        });
        return;
      }
    } catch (err) {
      alert("Falha ao registrar desenho no mapa.");
      console.error(err);
    }
  }

  // Quando editar: vamos ler tudo do FeatureGroup e atualizar pins
  // (simples e funciona bem para MVP)
  function handleEdited() {
    try {
      const fg = fgRef.current;
      if (!fg) return;

      // Se quiser sincronizar edição de áreas com pins,
      // aqui daria para mapear layerId <-> pin.id (mais avançado).
      // Por enquanto, só avisa:
      alert("Edição aplicada. (MVP: sincronização completa pode ser o próximo passo)");
    } catch (err) {
      console.error(err);
    }
  }

  // Quando deletar: apenas remove do estado se a remoção veio de popup/botão.
  // A remoção via toolbar do Leaflet Draw é mais chata de mapear sem IDs.
  function handleDeleted() {
    alert("Remoção aplicada. (MVP: se quiser, a gente sincroniza com a lista no próximo passo)");
  }

  if (!mounted) return null;

  return (
    <div
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: "100%",
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FeatureGroup ref={fgRef}>
          <EditControl
            position="topleft"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            draw={{
              polyline: false,
              circle: false,
              circlemarker: false,
              // habilita os botões
              marker: true,
              polygon: true,
              rectangle: true,
            }}
            // ✅ CORREÇÃO: edit NÃO pode ser "true"
            // deixe um objeto (habilita) e remove:true para permitir excluir
            edit={{
              remove: true,
            }}
          />

          {/* Renderiza PONTOS como markers */}
          {pins
            .filter((p) => p.tipo === "Ponto")
            .map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]}>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 700 }}>{p.nome}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>Tipo: {p.tipo}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>
                      {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
                    </div>
                    <button
                      onClick={() => removePin(p.id)}
                      style={{
                        marginTop: 10,
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.15)",
                        cursor: "pointer",
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}
