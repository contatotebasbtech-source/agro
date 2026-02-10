"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

/**
 * Leaflet só no client (evita SSR/hydration)
 */
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

/**
 * Componente helper para "recentralizar" o mapa quando muda o center.
 * (useMap só existe no client)
 */
const Recenter = dynamic(
  async () => {
    const { useMap } = await import("react-leaflet");
    return function RecenterInner({
      lat,
      lng,
      zoom,
    }: {
      lat: number;
      lng: number;
      zoom?: number;
    }) {
      const map = useMap();
      useEffect(() => {
        map.setView([lat, lng], zoom ?? map.getZoom(), { animate: true });
      }, [lat, lng, zoom, map]);
      return null;
    };
  },
  { ssr: false }
);

type Pin = {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  tipo: "Area" | "Ponto" | "Talhao" | "Outro";
  obs?: string;
  createdAt: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

export default function MapaPage() {
  // Centro inicial (troque depois para sua fazenda)
  const defaultCenter = useMemo(() => ({ lat: -21.551, lng: -45.43 }), []);
  const defaultZoom = 12;

  const [mounted, setMounted] = useState(false);

  const [pins, setPins] = useState<Pin[]>([]);
  const [showModal, setShowModal] = useState(false);

  // center atual do mapa (pode mudar com "usar minha localização")
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);

  // GPS
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    lat: String(defaultCenter.lat),
    lng: String(defaultCenter.lng),
    tipo: "Ponto" as Pin["tipo"],
    obs: "",
  });

  const [busca, setBusca] = useState("");

  useEffect(() => {
    setMounted(true);

    // Pins
    try {
      const raw = localStorage.getItem("agro_mapa_pins");
      if (raw) setPins(JSON.parse(raw));
    } catch {}

    // Centro salvo (opcional)
    try {
      const rawCenter = localStorage.getItem("agro_mapa_center");
      if (rawCenter) {
        const c = JSON.parse(rawCenter);
        if (typeof c?.lat === "number" && typeof c?.lng === "number") {
          setMapCenter({ lat: c.lat, lng: c.lng });
        }
        if (typeof c?.zoom === "number") setMapZoom(c.zoom);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("agro_mapa_pins", JSON.stringify(pins));
    } catch {}
  }, [pins, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        "agro_mapa_center",
        JSON.stringify({ lat: mapCenter.lat, lng: mapCenter.lng, zoom: mapZoom })
      );
    } catch {}
  }, [mapCenter, mapZoom, mounted]);

  const pinsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter((p) => {
      const hay = `${p.nome} ${p.tipo} ${p.obs || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [pins, busca]);

  const meta = useMemo(() => {
    const total = pins.length;
    const areas = pins.filter((p) => p.tipo === "Area" || p.tipo === "Talhao").length;
    const pontos = pins.filter((p) => p.tipo === "Ponto").length;
    return { total, areas, pontos };
  }, [pins]);

  function openAdd() {
    setGpsError(null);
    setForm({
      nome: "",
      lat: String(mapCenter.lat),
      lng: String(mapCenter.lng),
      tipo: "Ponto",
      obs: "",
    });
    setShowModal(true);
  }

  function salvar() {
    const nome = form.nome.trim();
    const lat = Number(form.lat);
    const lng = Number(form.lng);

    if (!nome) return alert("Informe o nome.");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return alert("Latitude/Longitude inválidas.");
    }

    const pin: Pin = {
      id: uid(),
      nome,
      lat: round6(lat),
      lng: round6(lng),
      tipo: form.tipo,
      obs: form.obs?.trim() || "",
      createdAt: new Date().toISOString(),
    };

    setPins((prev) => [pin, ...prev]);
    setShowModal(false);

    // recenter no pin recém criado
    setMapCenter({ lat: pin.lat, lng: pin.lng });
    setMapZoom(16);
  }

  function remover(id: string) {
    if (!confirm("Remover este ponto?")) return;
    setPins((prev) => prev.filter((p) => p.id !== id));
  }

  function usarMinhaLocalizacao() {
    setGpsError(null);

    if (!("geolocation" in navigator)) {
      setGpsError("Seu navegador não suporta geolocalização.");
      return;
    }

    setGpsBusy(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = round6(pos.coords.latitude);
        const lng = round6(pos.coords.longitude);

        setMapCenter({ lat, lng });
        setMapZoom(16);

        // se modal aberto, preenche os campos também
        setForm((s) => ({ ...s, lat: String(lat), lng: String(lng) }));

        setGpsBusy(false);
      },
      (err) => {
        // mensagens amigáveis
        let msg = "Não foi possível obter sua localização.";
        if (err.code === err.PERMISSION_DENIED) msg = "Permissão de localização negada.";
        if (err.code === err.POSITION_UNAVAILABLE) msg = "Localização indisponível.";
        if (err.code === err.TIMEOUT) msg = "Tempo esgotado ao obter localização.";
        setGpsError(msg);
        setGpsBusy(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  }

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
              <button className="pat-btn" onClick={usarMinhaLocalizacao} disabled={gpsBusy}>
                {gpsBusy ? "Localizando..." : "Usar minha localização"}
              </button>

              <button className="pat-btn" onClick={() => location.reload()}>
                Recarregar
              </button>

              <button className="pat-btn pat-btn-primary" onClick={openAdd}>
                + Adicionar
              </button>
            </div>
          </div>

          {gpsError ? (
            <div className="pat-card" style={{ marginTop: 12 }}>
              <div className="pat-muted" style={{ color: "#fff", opacity: 0.9 }}>
                ⚠️ {gpsError}
              </div>
            </div>
          ) : null}

          {/* Cards */}
          <div className="pat-grid-3">
            <div className="pat-metric">
              <div className="pat-metric-label">Pins</div>
              <div className="pat-metric-value">{meta.total}</div>
              <div className="pat-metric-help">Pontos/áreas cadastrados</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Áreas/Talhões</div>
              <div className="pat-metric-value">{meta.areas}</div>
              <div className="pat-metric-help">Marcação por área</div>
            </div>

            <div className="pat-metric">
              <div className="pat-metric-label">Pontos</div>
              <div className="pat-metric-value">{meta.pontos}</div>
              <div className="pat-metric-help">Barracão, porteira, açude...</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="pat-card">
            <div className="pat-card-title">Filtros</div>

            <div className="pat-filters">
              <div className="pat-field">
                <label>Buscar</label>
                <input
                  className="pat-input"
                  placeholder="Digite: talhão, barracão, porteira..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <div className="pat-filter-actions">
                <button className="pat-btn" onClick={() => setBusca("")}>
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Mapa + lista */}
          <div className="pat-grid-2">
            <div className="pat-card" style={{ minHeight: 520 }}>
              <div className="pat-card-title">Mapa</div>

              <div style={{ height: 460, marginTop: 10 }}>
                {mounted ? (
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={mapZoom}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <Recenter lat={mapCenter.lat} lng={mapCenter.lng} zoom={mapZoom} />

                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {pinsFiltrados.map((p) => (
                      <Marker key={p.id} position={[p.lat, p.lng]}>
                        <Popup>
                          <div style={{ fontWeight: 800, marginBottom: 4 }}>{p.nome}</div>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>
                            Tipo: {p.tipo}
                            <br />
                            Lat/Lng: {p.lat}, {p.lng}
                            {p.obs ? (
                              <>
                                <br />
                                Obs: {p.obs}
                              </>
                            ) : null}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="pat-muted">Carregando mapa...</div>
                )}
              </div>

              <div className="pat-muted" style={{ marginTop: 10 }}>
                Centro atual: {mapCenter.lat.toFixed(5)}, {mapCenter.lng.toFixed(5)} (zoom {mapZoom})
              </div>
            </div>

            <div className="pat-card">
              <div className="pat-card-title">Pins cadastrados</div>

              {pinsFiltrados.length === 0 ? (
                <div className="pat-muted" style={{ marginTop: 10 }}>
                  Nenhum pin encontrado. Clique em <b>+ Adicionar</b>.
                </div>
              ) : (
                <div className="pat-table-wrap" style={{ marginTop: 10 }}>
                  <table className="pat-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Lat</th>
                        <th>Lng</th>
                        <th style={{ textAlign: "right" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pinsFiltrados.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 800 }}>{p.nome}</td>
                          <td>{p.tipo}</td>
                          <td>{p.lat.toFixed(5)}</td>
                          <td>{p.lng.toFixed(5)}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="pat-btn"
                              onClick={() => {
                                setMapCenter({ lat: p.lat, lng: p.lng });
                                setMapZoom(17);
                              }}
                            >
                              Ir
                            </button>{" "}
                            <button className="pat-btn" onClick={() => remover(p.id)}>
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pat-muted" style={{ marginTop: 10 }}>
                Fonte: localStorage (por enquanto).
              </div>
            </div>
          </div>

          {/* Modal */}
          {showModal ? (
            <div className="pat-modal-backdrop" onClick={() => setShowModal(false)}>
              <div className="pat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pat-modal-header">
                  <div>
                    <div className="pat-modal-title">Adicionar pin</div>
                    <div className="pat-modal-subtitle">Cadastre um ponto/área pelo GPS</div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="pat-btn" onClick={usarMinhaLocalizacao} disabled={gpsBusy}>
                      {gpsBusy ? "Localizando..." : "Usar minha localização"}
                    </button>
                    <button className="pat-btn" onClick={() => setShowModal(false)}>
                      Fechar
                    </button>
                  </div>
                </div>

                {gpsError ? (
                  <div style={{ padding: "0 18px 10px 18px" }}>
                    <div className="pat-muted" style={{ color: "#fff", opacity: 0.9 }}>
                      ⚠️ {gpsError}
                    </div>
                  </div>
                ) : null}

                <div className="pat-modal-body">
                  <div className="pat-form-grid">
                    <div className="pat-field">
                      <label>Nome</label>
                      <input
                        className="pat-input"
                        value={form.nome}
                        onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
                        placeholder="Ex: Barracão, Talhão 3, Açude..."
                      />
                    </div>

                    <div className="pat-field">
                      <label>Tipo</label>
                      <select
                        className="pat-select"
                        value={form.tipo}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, tipo: e.target.value as Pin["tipo"] }))
                        }
                      >
                        <option value="Ponto">Ponto</option>
                        <option value="Area">Área</option>
                        <option value="Talhao">Talhão</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div className="pat-field">
                      <label>Latitude</label>
                      <input
                        className="pat-input"
                        value={form.lat}
                        onChange={(e) => setForm((s) => ({ ...s, lat: e.target.value }))}
                        placeholder="-21.551"
                      />
                    </div>

                    <div className="pat-field">
                      <label>Longitude</label>
                      <input
                        className="pat-input"
                        value={form.lng}
                        onChange={(e) => setForm((s) => ({ ...s, lng: e.target.value }))}
                        placeholder="-45.43"
                      />
                    </div>

                    <div className="pat-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Observação</label>
                      <input
                        className="pat-input"
                        value={form.obs}
                        onChange={(e) => setForm((s) => ({ ...s, obs: e.target.value }))}
                        placeholder="Ex: entrada pelo lado norte, perto da cerca..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pat-modal-footer">
                  <button className="pat-btn" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button className="pat-btn pat-btn-primary" onClick={salvar}>
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
