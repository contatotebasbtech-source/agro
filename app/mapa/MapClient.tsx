"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";

// ====== TIPOS EXPORTADOS (usados no page.tsx) ======
export type Pin = {
  id: string;
  nome: string;
  tipo: string; // ex: "Ponto"
  lat: number;
  lng: number;
  createdAt: string;
};

export type Area = {
  id: string;
  nome: string;
  tipo: string; // ex: "Área"
  points: Array<[number, number]>; // [lat,lng]
  createdAt: string;
};

// ====== STORAGE ======
const STORAGE_KEY = "agro_mapa_v2"; // novo pra evitar lixo antigo

type StorageShape = {
  pins: Pin[];
  areas: Area[];
};

function safeParseStorage(raw: string | null): StorageShape {
  if (!raw) return { pins: [], areas: [] };
  try {
    const obj = JSON.parse(raw);

    const pins = Array.isArray(obj?.pins) ? obj.pins : [];
    const areas = Array.isArray(obj?.areas) ? obj.areas : [];

    return { pins, areas };
  } catch {
    return { pins: [], areas: [] };
  }
}

function saveStorage(data: StorageShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function brNow() {
  try {
    return new Date().toLocaleString("pt-BR");
  } catch {
    return "";
  }
}

// ====== PROPS ======
export default function MapClient(props: {
  center: { lat: number; lng: number };
  zoom: number;
  onReload: (pins: Pin[], areas: Area[]) => void;
  filterPins: Pin[];
  filterAreas: Area[];
}) {
  const { center, zoom, onReload, filterPins, filterAreas } = props;

  const [pins, setPins] = useState<Pin[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [mode, setMode] = useState<"idle" | "pin" | "area">("idle");

  // area “em construção”
  const [draftAreaPoints, setDraftAreaPoints] = useState<Array<[number, number]>>([]);
  const draftAreaPointsRef = useRef<Array<[number, number]>>([]);
  useEffect(() => {
    draftAreaPointsRef.current = draftAreaPoints;
  }, [draftAreaPoints]);

  // ====== carregar do storage ======
  function reloadFromStorage() {
    const s = safeParseStorage(localStorage.getItem(STORAGE_KEY));

    // garante arrays sempre
    const nextPins = Array.isArray(s.pins) ? s.pins : [];
    const nextAreas = Array.isArray(s.areas) ? s.areas : [];

    setPins(nextPins);
    setAreas(nextAreas);
    onReload(nextPins, nextAreas);

    // “conserta” storage se estava quebrado
    saveStorage({ pins: nextPins, areas: nextAreas });
  }

  useEffect(() => {
    reloadFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== listeners (events do page.tsx) ======
  useEffect(() => {
    const onMode = (ev: any) => {
      const m = ev?.detail?.mode;
      if (m === "pin") {
        setMode("pin");
        setDraftAreaPoints([]);
      } else if (m === "area") {
        setMode("area");
        setDraftAreaPoints([]);
      } else {
        setMode("idle");
        setDraftAreaPoints([]);
      }
    };

    const onReloadEvt = () => reloadFromStorage();

    const onDelete = (ev: any) => {
      const id = String(ev?.detail?.id || "");
      const kind = ev?.detail?.kind as "pin" | "area";
      if (!id) return;

      const s = safeParseStorage(localStorage.getItem(STORAGE_KEY));
      let nextPins = Array.isArray(s.pins) ? s.pins : [];
      let nextAreas = Array.isArray(s.areas) ? s.areas : [];

      if (kind === "pin") nextPins = nextPins.filter((p) => p.id !== id);
      if (kind === "area") nextAreas = nextAreas.filter((a) => a.id !== id);

      saveStorage({ pins: nextPins, areas: nextAreas });
      setPins(nextPins);
      setAreas(nextAreas);
      onReload(nextPins, nextAreas);
    };

    window.addEventListener("agro:mapa:mode" as any, onMode);
    window.addEventListener("agro:mapa:reload" as any, onReloadEvt);
    window.addEventListener("agro:mapa:delete" as any, onDelete);

    return () => {
      window.removeEventListener("agro:mapa:mode" as any, onMode);
      window.removeEventListener("agro:mapa:reload" as any, onReloadEvt);
      window.removeEventListener("agro:mapa:delete" as any, onDelete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== salvar helpers ======
  function persist(nextPins: Pin[], nextAreas: Area[]) {
    saveStorage({ pins: nextPins, areas: nextAreas });
    setPins(nextPins);
    setAreas(nextAreas);
    onReload(nextPins, nextAreas);
  }

  function addPin(lat: number, lng: number) {
    const nome = prompt("Nome do ponto (ex: Barracão, Porteira, Açude):", "Ponto");
    if (!nome) return;

    const p: Pin = {
      id: uid("pin"),
      nome: nome.trim(),
      tipo: "Ponto",
      lat,
      lng,
      createdAt: brNow(),
    };

    const nextPins = [p, ...pins];
    persist(nextPins, areas);
    setMode("idle");
  }

  function addAreaVertex(lat: number, lng: number) {
    // adiciona pontos para formar polígono
    setDraftAreaPoints((prev) => [...prev, [lat, lng]]);
  }

  function finishArea() {
    const pts = draftAreaPointsRef.current;
    if (!pts || pts.length < 3) {
      alert("Para criar uma área, clique no mapa pelo menos 3 vezes (3 vértices).");
      return;
    }

    const nome = prompt("Nome da área/talhão:", "Talhão 1");
    if (!nome) return;

    const a: Area = {
      id: uid("area"),
      nome: nome.trim(),
      tipo: "Área",
      points: pts,
      createdAt: brNow(),
    };

    const nextAreas = [a, ...areas];
    persist(pins, nextAreas);

    setDraftAreaPoints([]);
    setMode("idle");
  }

  function cancelArea() {
    setDraftAreaPoints([]);
    setMode("idle");
  }

  // ====== componente que captura cliques no mapa ======
  function ClickHandler() {
    useMapEvents({
      click(e) {
        if (mode === "pin") addPin(e.latlng.lat, e.latlng.lng);
        if (mode === "area") addAreaVertex(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  // usa os filtrados vindos do page, mas se vierem errados, cai pro estado interno
  const safePinsToShow = useMemo(() => (Array.isArray(filterPins) ? filterPins : pins), [filterPins, pins]);
  const safeAreasToShow = useMemo(() => (Array.isArray(filterAreas) ? filterAreas : areas), [filterAreas, areas]);

  // ====== UI do topo do mapa (modo) ======
  const modeBanner =
    mode === "pin"
      ? "Modo: adicionar PONTO (clique no mapa)."
      : mode === "area"
      ? `Modo: criar ÁREA (${draftAreaPoints.length} vértices). Clique para adicionar vértices.`
      : "";

  return (
    <div className="relative">
      {/* Banner de modo */}
      {mode !== "idle" && (
        <div className="absolute left-3 top-3 z-[1000] max-w-[92%] rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-sm font-semibold text-white shadow">
          <div>{modeBanner}</div>

          {mode === "area" && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={finishArea}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Salvar área
              </button>
              <button
                onClick={cancelArea}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: 420, width: "100%" }}
      >
        <ClickHandler />

        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* áreas salvas */}
        {safeAreasToShow.map((a) => (
          <Polygon key={a.id} positions={a.points}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 800 }}>{a.nome}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>{a.tipo}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                  Criado: {a.createdAt}
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* polígono em construção */}
        {mode === "area" && draftAreaPoints.length >= 2 && (
          <Polygon positions={draftAreaPoints} />
        )}

        {/* pins */}
        {safePinsToShow.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 800 }}>{p.nome}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>{p.tipo}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                  Lat: {p.lat.toFixed(6)} <br />
                  Lng: {p.lng.toFixed(6)} <br />
                  Criado: {p.createdAt}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
