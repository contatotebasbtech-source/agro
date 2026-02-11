"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";

import type { Pin, Area } from "./MapClient";

const MapClient = dynamic(() => import("./MapClient"), { ssr: false });

type TipoFiltro = "Todos" | "Ponto" | "Area";

function brNow() {
  try {
    return new Date().toLocaleString("pt-BR");
  } catch {
    return "";
  }
}

export default function MapaPage() {
  // ✅ evita erro de hidratação: só define data depois que montar
  const [mounted, setMounted] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  // dados
  const [pins, setPins] = useState<Pin[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  // filtros
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<TipoFiltro>("Todos");

  // UI
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: -21.551,
    lng: -45.43,
  });
  const [mapZoom, setMapZoom] = useState(13);

  const [showModal, setShowModal] = useState(false);
  const [modoAdd, setModoAdd] = useState<"Ponto" | "Area">("Ponto");

  useEffect(() => {
    setMounted(true);
    setUpdatedAt(brNow());
  }, []);

  // contadores
  const stats = useMemo(() => {
    const totalPins = pins.length + areas.length;
    const totalAreas = areas.length;
    const totalPontos = pins.length;

    const pontosNomes = pins
      .slice(0, 3)
      .map((p) => p.nome)
      .filter(Boolean)
      .join(", ");

    return {
      totalPins,
      totalAreas,
      totalPontos,
      pontosResumo: pontosNomes || "Barracão, porteira, açude...",
    };
  }, [pins, areas]);

  // filtros aplicados
  const pinsFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();

    const filtraTexto = (s?: string | null) => (s || "").toLowerCase().includes(term);

    let p = pins;
    let a = areas;

    if (tipo === "Ponto") a = [];
    if (tipo === "Area") p = [];

    if (!term) return { pins: p, areas: a };

    return {
      pins: p.filter((x) => filtraTexto(x.nome) || filtraTexto(x.tipo)),
      areas: a.filter((x) => filtraTexto(x.nome) || filtraTexto(x.tipo)),
    };
  }, [pins, areas, q, tipo]);

  function onReload(nextPins: Pin[], nextAreas: Area[]) {
    setPins(nextPins);
    setAreas(nextAreas);
    setUpdatedAt(brNow());
  }

  async function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMapZoom(16);
      },
      (err) => {
        alert("Não foi possível obter sua localização: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="px-4 pb-10">
      {/* Cabeçalho */}
      <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Mapa
            </h1>
            <p className="mt-2 text-white/80">
              Visualização da fazenda, áreas e pontos de referência (talhões, barracão, açudes, etc.)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={usarMinhaLocalizacao}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Usar minha localização
            </button>

            <button
              onClick={() => {
                // MapClient vai recarregar do localStorage quando mounted
                setUpdatedAt(brNow());
                window.dispatchEvent(new CustomEvent("agro:mapa:reload"));
              }}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Recarregar
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              + Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-white/70">Pins</div>
          <div className="mt-1 text-4xl font-extrabold text-white">{stats.totalPins}</div>
          <div className="mt-1 text-white/80">Pontos/áreas cadastrados</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-white/70">Áreas/Talhões</div>
          <div className="mt-1 text-4xl font-extrabold text-white">{stats.totalAreas}</div>
          <div className="mt-1 text-white/80">Marcação por área</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-white/70">Pontos</div>
          <div className="mt-1 text-4xl font-extrabold text-white">{stats.totalPontos}</div>
          <div className="mt-1 text-white/80">{stats.pontosResumo}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-bold text-white/80">Filtros</div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 md:items-end">
          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-white/70">Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Digite: talhão, barracão, porteira..."
              className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-emerald-500/60"
            />
            <div className="mt-2 text-sm text-white/60">
              Atualizado{" "}
              <span suppressHydrationWarning className="font-semibold text-white/80">
                {mounted ? updatedAt : ""}
              </span>
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-white/70">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoFiltro)}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-500/60"
            >
              <option value="Todos">Todos</option>
              <option value="Ponto">Pontos</option>
              <option value="Area">Áreas</option>
            </select>
          </div>

          <div className="md:col-span-1 flex gap-2">
            <button
              onClick={() => {
                setQ("");
                setTipo("Todos");
              }}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Mapa + Lista */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-lg font-bold text-white/80">Mapa</div>

          {/* MapClient controla Leaflet e mantém storage */}
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <MapClient
              center={mapCenter}
              zoom={mapZoom}
              onReload={onReload}
              filterPins={pinsFiltrados.pins}
              filterAreas={pinsFiltrados.areas}
            />
          </div>

          <div className="mt-2 text-sm text-white/70">Fonte: localStorage (por enquanto).</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-lg font-bold text-white/80">Pins cadastrados</div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-black/30 text-white/80">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Lat</th>
                    <th className="px-4 py-3">Lng</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-white/85">
                  {pinsFiltrados.pins.map((p) => (
                    <tr key={p.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold">{p.nome}</td>
                      <td className="px-4 py-3">{p.tipo || "Ponto"}</td>
                      <td className="px-4 py-3">{p.lat.toFixed(6)}</td>
                      <td className="px-4 py-3">{p.lng.toFixed(6)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("agro:mapa:delete", { detail: { id: p.id, kind: "pin" } }))}
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}

                  {pinsFiltrados.areas.map((a) => (
                    <tr key={a.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold">{a.nome}</td>
                      <td className="px-4 py-3">{a.tipo || "Área"}</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("agro:mapa:delete", { detail: { id: a.id, kind: "area" } }))}
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}

                  {pinsFiltrados.pins.length === 0 && pinsFiltrados.areas.length === 0 && (
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-4 text-white/70" colSpan={5}>
                        Nenhum pin encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
            Dica: para marcar áreas, use o botão “+ Adicionar” e escolha “Área”. (No MapClient você vai
            criar clicando no mapa os vértices e salvando.)
          </div>
        </div>
      </div>

      {/* Modal adicionar */}
      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#061b10] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-extrabold text-white">Adicionar</div>
                <div className="text-white/70">
                  Escolha o que você quer adicionar e depois clique no mapa.
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  setModoAdd("Ponto");
                  window.dispatchEvent(new CustomEvent("agro:mapa:mode", { detail: { mode: "pin" } }));
                  setShowModal(false);
                }}
                className={`rounded-2xl border px-4 py-4 text-left ${
                  modoAdd === "Ponto"
                    ? "border-emerald-500/60 bg-emerald-500/15"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <div className="text-lg font-bold text-white">Ponto</div>
                <div className="text-sm text-white/70">Ex: barracão, porteira, açude.</div>
              </button>

              <button
                onClick={() => {
                  setModoAdd("Area");
                  window.dispatchEvent(new CustomEvent("agro:mapa:mode", { detail: { mode: "area" } }));
                  setShowModal(false);
                }}
                className={`rounded-2xl border px-4 py-4 text-left ${
                  modoAdd === "Area"
                    ? "border-emerald-500/60 bg-emerald-500/15"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <div className="text-lg font-bold text-white">Área/Talhão</div>
                <div className="text-sm text-white/70">Clique para criar os vértices.</div>
              </button>
            </div>

            <div className="mt-5 text-sm text-white/70">
              Depois de selecionar, o MapClient entra no modo de criação.  
              Você pode sair do modo clicando novamente em “+ Adicionar”.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
