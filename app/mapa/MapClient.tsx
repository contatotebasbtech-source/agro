"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

type Center = [number, number];

const MapContainer = dynamic(async () => (await import("react-leaflet")).MapContainer, { ssr: false });
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, { ssr: false });
const FeatureGroup = dynamic(async () => (await import("react-leaflet")).FeatureGroup, { ssr: false });
const GeoJSON = dynamic(async () => (await import("react-leaflet")).GeoJSON, { ssr: false });
const EditControl = dynamic(async () => (await import("react-leaflet-draw")).EditControl, { ssr: false });

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function MapClient() {
  const [mounted, setMounted] = useState(false);
  const [center, setCenter] = useState<Center>([-15.793889, -47.882778]);
  const [zoom, setZoom] = useState(15);

  const [areas, setAreas] = useState<any[]>([]); // GeoJSON Features
  const [status, setStatus] = useState("");

  useEffect(() => setMounted(true), []);

  // Carrega áreas do localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem("agro_mapa_areas");
      if (raw) setAreas(JSON.parse(raw));
    } catch {}
  }, [mounted]);

  // Salva áreas no localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("agro_mapa_areas", JSON.stringify(areas));
    } catch {}
  }, [areas, mounted]);

  // Fix ícones padrão do Leaflet em produção
  useEffect(() => {
    if (!mounted) return;

    (async () => {
      const L = await import("leaflet");
      // @ts-ignore
      delete (L as any).Icon.Default.prototype._getIconUrl;
      // @ts-ignore
      (L as any).Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });
    })();
  }, [mounted]);

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      setStatus("Geolocalização não suportada no navegador.");
      return;
    }
    setStatus("Obtendo localização...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setZoom(17);
        setStatus("");
      },
      (err) => {
        console.warn(err);
        setStatus("Não foi possível obter localização. Verifique a permissão do navegador.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function onCreated(e: any) {
    const layer = e.layer;
    const feature = layer.toGeoJSON();
    feature.properties = { ...(feature.properties || {}), id: uid() };
    setAreas((prev) => [feature, ...prev]);
  }

  function onEdited(e: any) {
    const updated: any[] = [];
    e.layers.eachLayer((layer: any) => {
      const feature = layer.toGeoJSON();
      const id = layer?.feature?.properties?.id || feature?.properties?.id;
      feature.properties = { ...(feature.properties || {}), id };
      updated.push(feature);
    });

    if (!updated.length) return;

    setAreas((prev) => {
      const prevById = new Map(prev.map((f: any) => [f?.properties?.id, f]));
      for (const f of updated) prevById.set(f?.properties?.id, f);
      return Array.from(prevById.values());
    });
  }

  function onDeleted(e: any) {
    const ids: string[] = [];
    e.layers.eachLayer((layer: any) => {
      const id = layer?.feature?.properties?.id;
      if (id) ids.push(id);
    });
    if (!ids.length) return;
    setAreas((prev) => prev.filter((f: any) => !ids.includes(f?.properties?.id)));
  }

  if (!mounted) return <div style={{ padding: 16 }}>Carregando mapa...</div>;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <button className="pat-btn" onClick={usarMinhaLocalizacao}>Usar minha localização</button>
        <button className="pat-btn" onClick={() => location.reload()}>Recarregar</button>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.85 }}>Zoom</span>
          <select className="pat-input" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
            {[12, 14, 15, 16, 17, 18].map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </label>

        {status ? <span style={{ opacity: 0.85 }}>{status}</span> : null}
      </div>

      <div style={{ height: 520, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render das áreas salvas */}
          {areas.map((f: any) => (
            <GeoJSON key={f?.properties?.id} data={f} />
          ))}

          {/* FERRAMENTAS DE DESENHO */}
          <FeatureGroup>
            <EditControl
              position="topleft"
              onCreated={onCreated}
              onEdited={onEdited}
              onDeleted={onDeleted}
              draw={{
                polygon: true,
                rectangle: true,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
              }}
              edit={{
                edit: true,
                remove: true,
              }}
            />
          </FeatureGroup>
        </MapContainer>
      </div>

      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
        Dica: use os ícones no canto superior esquerdo do mapa para desenhar/editar/apagar.
      </div>
    </div>
  );
}
