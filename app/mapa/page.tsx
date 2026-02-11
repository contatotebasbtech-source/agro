"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

export const runtime = "nodejs";

type Pin = {
  id: string;
  nome: string;
  tipo: "Ponto" | "Área";
  lat: number;
  lng: number;
  createdAt: string;
};

type Center = [number, number];

const MapContainer = dynamic(async () => (await import("react-leaflet")).MapContainer, { ssr: false });
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, { ssr: false });
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, { ssr: false });
const Popup = dynamic(async () => (await import("react-leaflet")).Popup, { ssr: false });
const FeatureGroup = dynamic(async () => (await import("react-leaflet")).FeatureGroup, { ssr: false });
const GeoJSON = dynamic(async () => (await import("react-leaflet")).GeoJSON, { ssr: false });
const EditControl = dynamic(async () => (await import("react-leaflet-draw")).EditControl, { ssr: false });

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatLatLng(n: number) {
  return Number(n).toFixed(6);
}

export default function MapaPage() {
  // Centro inicial (pode trocar depois)
  const defaultCenter = useMemo(() => ({ lat: -21.551, lng: -45.43 }), []);
  const defaultZoom = 13;

  const [mounted, setMounted] = useState(false);

  // Pins (pontos) e Áreas (polígonos/retângulos) em GeoJSON
  const [pins, setPins] = useState<Pin[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  // UI
  const [mapCenter, setMapCenter] = useState<Center>([defaultCenter.lat, defaultCenter.lng]);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");

  // Modal simples (adicionar ponto)
  const [showModal, setShowModal] = useState(false);
  const [formNome, setFormNome] = useState("");
  const [formTipo, setFormTipo] = useState<"Ponto" | "Área">("Ponto");
  const [formLat, setFormLat] = useState<string>(String(defaultCenter.lat));
  const [formLng, setFormLng] = useState<string>(String(defaultCenter.lng));

  useEffect(() => setMounted(true), []);

  // Fix ícones do Leaflet em produção (usa /public/leaflet/*)
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

  // Load localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const rawPins = localStorage.getItem("agro_mapa_pins");
      if (rawPins) setPins(JSON.parse(rawPins));
      const rawAreas = localStorage.getItem("agro_mapa_areas");
      if (rawAreas) setAreas(JSON.parse(rawAreas));
    } catch {}
  }, [mounted]);

  // Save localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("agro_mapa_pins", JSON.stringify(pins));
      localStorage.setItem("agro_mapa_areas", JSON.stringify(areas));
    } catch {}
  }, [pins, areas, mounted]);

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      setStatus("Geolocalização não suportada no navegador.");
      return;
    }
    setStatus("Obtendo localização...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapCenter([lat, lng]);
        setMapZoom(17);
        setFormLat(String(lat));
        setFormLng(String(lng));
        setStatus("");
      },
      () => setStatus("Não foi possível obter localização. Verifique a permissão do navegador."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function recarregar() {
    location.reload();
  }

  function limpar() {
    setBusca("");
  }

  const pinsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter((p) => {
      return (
        p.nome.toLowerCase().includes(q) ||
        p.tipo.toLowerCase().includes(q) ||
        String(p.lat).includes(q) ||
        String(p.lng).includes(q)
      );
    });
  }, [pins, busca]);

  function salvarPonto() {
    const nome = formNome.trim();
    const lat = Number(formLat);
    const lng = Number(formLng);

    if (!nome) {
      alert("Informe o nome do ponto.");
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("Lat/Lng inválidos.");
      return;
    }

    const novo: Pin = {
      id: uid(),
      nome,
      tipo: formTipo,
      lat,
      lng,
      createdAt: new Date().toISOString(),
    };

    setPins((prev) => [novo, ...prev]);
    setShowModal(false);
    setFormNome("");
  }

  // Leaflet Draw handlers
  function onCreated(e: any) {
    // Quando desenhar polígono/retângulo
    const layer = e.layer;
    const feature = layer.toGeoJSON();
    feature.properties = { ...(feature.properties || {}), id: uid(), nome: "Área", tipo: "Área" };
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
      const map = new Map(prev.map((f: any) => [f?.properties?.id, f]));
      for (const f of updated) map.set(f?.properties?.id, f);
      return Array.from(map.values());
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

  if (!mounted) return <div style={{ padding: 16 }}>Carregando…</div>;

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <main className="pat-shell">
          {/* Header */}
          <div className="pat-header">
            <div>
              <div className="pat-title">Mapa</div>
              <div className="pat-subtitle">
                Visualização da fazenda, áreas e pontos de referência (talhões, barracão, açudes, etc.)
              </div>
            </div>

            <div className="pat-actions">
              <button className="pat-btn" onClick={usarMinhaLocalizacao}>
                Usar minha localização
              </button>
              <button className="pat-btn" onClick={recarregar}>
                Recarregar
              </button>
              <button className="pat-btn pat-btn-primary" onClick={() => setShowModal(true)}>
                + Adicionar
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="pat-grid3" style={{ marginTop: 14 }}>
            <div className="pat-card">
              <div className="pat-card-label">Pins</div>
              <div className="pat-card-value" style={{ color: "#fff" }}>
                {pins.length}
              </div>
              <div className="pat-card-sub">Pontos/áreas cadastrados</div>
            </div>

            <div className="pat-card">
              <div className="pat-card-label">Áreas/Talhões</div>
              <div className="pat-card-value" style={{ color: "#fff" }}>
                {areas.length}
              </div>
              <div className="pat-card-sub">Marcação por área</div>
            </div>

            <div className="pat-card">
              <div className="pat-card-label">Pontos</div>
              <div className="pat-card-value" style={{ color: "#fff" }}>
                {pins.filter((p) => p.tipo === "Ponto").length}
              </div>
              <div className="pat-card-sub">Barracão, porteira, açude…</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="pat-panel" style={{ marginTop: 14 }}>
            <div className="pat-panel-title">Filtros</div>
            <div className="pat-row" style={{ marginTop: 10 }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="pat-label">Buscar</div>
                <input
                  className="pat-input"
                  placeholder="Digite: talhão, barracão, porteira..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <button className="pat-btn" onClick={limpar} style={{ alignSelf: "end" }}>
                Limpar
              </button>
              {status ? <div style={{ opacity: 0.85, alignSelf: "end" }}>{status}</div> : null}
            </div>
          </div>

          {/* Conteúdo: mapa + tabela */}
          <div className="pat-grid2" style={{ marginTop: 14 }}>
            <div className="pat-panel">
              <div className="pat-panel-title">Mapa</div>

              <div
                style={{
                  height: 520,
                  marginTop: 10,
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={true}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {areas.map((f: any) => (
                    <GeoJSON key={f?.properties?.id} data={f} />
                  ))}

                  {pins.map((p) => (
                    <Marker key={p.id} position={[p.lat, p.lng]}>
                      <Popup>
                        <b>{p.nome}</b>
                        <br />
                        {p.tipo}
                        <br />
                        Lat: {formatLatLng(p.lat)}
                        <br />
                        Lng: {formatLatLng(p.lng)}
                      </Popup>
                    </Marker>
                  ))}

                  {/* BARRA DE DESENHO (POLÍGONO/RETÂNGULO/EDITAR/LIXEIRA) */}
                  <FeatureGroup>
                    <EditControl
                      position="topleft"
                      onCreated={onCreated}
                      onEdited={onEdited}
                      onDeleted={onDeleted}
                      draw={{
                        polygon: true,
                        rectangle: true,
                        polyline: false,
                        circle: false,
                        circlemarker: false,
                        marker: false,
                      }}
                      edit={{ edit: true, remove: true }}
                    />
                  </FeatureGroup>
                </MapContainer>
              </div>

              <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
                Dica: use os ícones no canto superior esquerdo do mapa para desenhar/editar/apagar áreas.
              </div>
            </div>

            <div className="pat-panel">
              <div className="pat-panel-title">Pins cadastrados</div>

              <div className="pat-table-wrap" style={{ marginTop: 10 }}>
                <table className="pat-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Lat</th>
                      <th>Lng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pinsFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ opacity: 0.75 }}>
                          Nenhum pin encontrado.
                        </td>
                      </tr>
                    ) : (
                      pinsFiltrados.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700 }}>{p.nome}</td>
                          <td>{p.tipo}</td>
                          <td>{formatLatLng(p.lat)}</td>
                          <td>{formatLatLng(p.lng)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
                Fonte: localStorage (por enquanto).
              </div>
            </div>
          </div>

          {/* Modal adicionar ponto */}
          {showModal ? (
            <div className="pat-modal-backdrop" onClick={() => setShowModal(false)}>
              <div className="pat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pat-modal-header">
                  <div>
                    <div className="pat-modal-title">Adicionar pin</div>
                    <div className="pat-modal-subtitle">Cadastre um ponto de referência (ou área manual).</div>
                  </div>
                  <button className="pat-btn" onClick={() => setShowModal(false)}>
                    Fechar
                  </button>
                </div>

                <div className="pat-form">
                  <div className="pat-field">
                    <div className="pat-label">Nome</div>
                    <input className="pat-input" value={formNome} onChange={(e) => setFormNome(e.target.value)} />
                  </div>

                  <div className="pat-field">
                    <div className="pat-label">Tipo</div>
                    <select
                      className="pat-input"
                      value={formTipo}
                      onChange={(e) => setFormTipo(e.target.value as any)}
                    >
                      <option value="Ponto">Ponto</option>
                      <option value="Área">Área</option>
                    </select>
                  </div>

                  <div className="pat-grid2" style={{ marginTop: 10 }}>
                    <div className="pat-field">
                      <div className="pat-label">Lat</div>
                      <input className="pat-input" value={formLat} onChange={(e) => setFormLat(e.target.value)} />
                    </div>
                    <div className="pat-field">
                      <div className="pat-label">Lng</div>
                      <input className="pat-input" value={formLng} onChange={(e) => setFormLng(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="pat-modal-actions">
                  <button className="pat-btn" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button className="pat-btn pat-btn-primary" onClick={salvarPonto}>
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
