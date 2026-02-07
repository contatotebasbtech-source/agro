"use client";

import React, { useEffect, useMemo, useState } from "react";

type GeoResult = {
  name: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  lat: number;
  lon: number;
  label: string;
};

type ForecastDaily = {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
};

type ForecastHourly = {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  windspeed_10m: number[];
  weathercode: number[];
};

type ForecastCurrent = {
  time?: string;
  temperature_2m?: number;
  precipitation?: number;
  windspeed_10m?: number;
  weathercode?: number;
};

type ForecastResponse = {
  timezone?: string;
  current?: ForecastCurrent;
  daily?: ForecastDaily;
  hourly?: ForecastHourly;
};

type ThemeKey = "sunny" | "rain" | "cloudy" | "fog" | "night";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatBRDate(iso: string) {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  return `${pad2(d)}/${pad2(m)}`;
}

function formatBRTime(iso: string) {
  // iso: YYYY-MM-DDTHH:mm
  const parts = iso.split("T");
  if (parts.length < 2) return iso;
  return parts[1].slice(0, 5);
}

function codeLabel(code?: number) {
  if (code == null) return "—";
  // Open-Meteo weather codes
  if (code === 0) return "Céu limpo";
  if (code === 1 || code === 2) return "Poucas nuvens";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Neblina";
  if (code === 51 || code === 53 || code === 55) return "Garoa";
  if (code === 56 || code === 57) return "Garoa congelante";
  if (code === 61 || code === 63 || code === 65) return "Chuva";
  if (code === 66 || code === 67) return "Chuva congelante";
  if (code === 71 || code === 73 || code === 75) return "Neve";
  if (code === 77) return "Granizo";
  if (code === 80 || code === 81 || code === 82) return "Pancadas de chuva";
  if (code === 85 || code === 86) return "Pancadas de neve";
  if (code === 95) return "Tempestade";
  if (code === 96 || code === 99) return "Tempestade forte";
  return `Código ${code}`;
}

function codeIcon(code?: number) {
  if (code == null) return "❓";
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65].includes(code)) return "🌧️";
  if ([80, 81, 82].includes(code)) return "⛈️";
  if ([95, 96, 99].includes(code)) return "⚡";
  if ([71, 73, 75, 85, 86].includes(code)) return "🌨️";
  return "🌡️";
}

function themeFrom(code?: number, nowHour?: number): ThemeKey {
  const night = nowHour != null && (nowHour >= 18 || nowHour <= 5);
  if (night) return "night";

  if (code == null) return "cloudy";
  if (code === 0 || code === 1) return "sunny";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([61, 63, 65, 80, 81, 82, 95, 96, 99, 51, 53, 55].includes(code)) return "rain";
  return "cloudy";
}

function AnimatedBackground({ theme }: { theme: ThemeKey }) {
  // Fica por cima do background do body, mas atrás do conteúdo
  return (
    <>
      <div className={`fixed inset-0 z-0 pointer-events-none bg-wrap theme-${theme}`}>
        <div className="layer grad" />
        <div className="layer noise" />
        {(theme === "sunny" || theme === "cloudy") && (
          <>
            <div className="sun" />
            <div className="cloud c1" />
            <div className="cloud c2" />
            <div className="cloud c3" />
          </>
        )}
        {(theme === "rain" || theme === "fog") && (
          <>
            <div className="cloud c1 dark" />
            <div className="cloud c2 dark" />
            <div className="cloud c3 dark" />
            {theme === "rain" && (
              <>
                <div className="rain r1" />
                <div className="rain r2" />
                <div className="rain r3" />
              </>
            )}
            {theme === "fog" && (
              <>
                <div className="fog f1" />
                <div className="fog f2" />
              </>
            )}
          </>
        )}
        {theme === "night" && (
          <>
            <div className="stars" />
            <div className="moon" />
            <div className="cloud c2 night" />
          </>
        )}
      </div>

      <style jsx global>{`
        .bg-wrap {
          overflow: hidden;
        }

        /* Gradientes por tema */
        .bg-wrap .grad {
          position: absolute;
          inset: 0;
          opacity: 1;
        }
        .theme-sunny .grad {
          background: radial-gradient(1200px 700px at 15% 10%, rgba(255, 220, 120, 0.75), transparent 60%),
            radial-gradient(900px 600px at 85% 30%, rgba(120, 255, 200, 0.25), transparent 60%),
            linear-gradient(180deg, rgba(10, 60, 35, 0.98), rgba(4, 32, 18, 0.98));
        }
        .theme-cloudy .grad {
          background: radial-gradient(1200px 700px at 25% 10%, rgba(200, 220, 210, 0.35), transparent 60%),
            linear-gradient(180deg, rgba(10, 50, 35, 0.98), rgba(4, 32, 18, 0.98));
        }
        .theme-rain .grad {
          background: radial-gradient(1100px 650px at 40% 10%, rgba(130, 170, 160, 0.22), transparent 60%),
            linear-gradient(180deg, rgba(6, 35, 25, 0.98), rgba(2, 20, 12, 0.98));
        }
        .theme-fog .grad {
          background: radial-gradient(1100px 650px at 40% 10%, rgba(210, 230, 225, 0.22), transparent 60%),
            linear-gradient(180deg, rgba(6, 35, 25, 0.98), rgba(2, 20, 12, 0.98));
        }
        .theme-night .grad {
          background: radial-gradient(1200px 800px at 70% 20%, rgba(120, 170, 255, 0.08), transparent 60%),
            linear-gradient(180deg, rgba(2, 10, 22, 0.98), rgba(2, 20, 12, 0.98));
        }

        /* Grain */
        .bg-wrap .noise {
          position: absolute;
          inset: -30%;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E");
          opacity: 0.12;
          transform: rotate(2deg);
          mix-blend-mode: overlay;
        }

        /* Sol */
        .sun {
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          left: -40px;
          top: -50px;
          background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.9), rgba(255, 220, 120, 0.85) 35%, rgba(255, 180, 80, 0.4) 60%, transparent 70%);
          filter: blur(0.2px);
          animation: float 7s ease-in-out infinite;
          opacity: 0.9;
        }

        /* Nuvens */
        .cloud {
          position: absolute;
          width: 420px;
          height: 140px;
          border-radius: 999px;
          background: rgba(220, 240, 230, 0.14);
          filter: blur(6px);
          animation: drift 26s linear infinite;
        }
        .cloud:before,
        .cloud:after {
          content: "";
          position: absolute;
          background: inherit;
          width: 220px;
          height: 120px;
          border-radius: 999px;
          top: -40px;
        }
        .cloud:before {
          left: 40px;
        }
        .cloud:after {
          left: 160px;
          top: -20px;
          width: 260px;
          height: 130px;
        }
        .cloud.dark {
          background: rgba(190, 210, 205, 0.10);
        }
        .cloud.night {
          background: rgba(160, 190, 220, 0.07);
        }
        .c1 {
          top: 80px;
          left: -480px;
          animation-duration: 34s;
        }
        .c2 {
          top: 180px;
          left: -520px;
          animation-duration: 42s;
          transform: scale(0.9);
        }
        .c3 {
          top: 260px;
          left: -560px;
          animation-duration: 48s;
          transform: scale(0.75);
        }

        /* Chuva */
        .rain {
          position: absolute;
          inset: -30% 0 0 0;
          background-image: linear-gradient(transparent, rgba(255, 255, 255, 0.28));
          background-size: 2px 14px;
          background-repeat: repeat;
          transform: skewX(-12deg);
          opacity: 0.18;
          animation: rain 0.55s linear infinite;
        }
        .r1 {
          left: -10%;
        }
        .r2 {
          left: 0%;
          opacity: 0.14;
          animation-duration: 0.7s;
        }
        .r3 {
          left: 10%;
          opacity: 0.10;
          animation-duration: 0.85s;
        }

        /* Nevoeiro */
        .fog {
          position: absolute;
          left: -30%;
          right: -30%;
          height: 120px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          filter: blur(18px);
          animation: fog 10s ease-in-out infinite;
        }
        .f1 {
          top: 220px;
        }
        .f2 {
          top: 320px;
          opacity: 0.06;
          animation-duration: 13s;
        }

        /* Noite */
        .stars {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.75) 1px, transparent 1px);
          background-size: 36px 36px;
          opacity: 0.12;
          animation: twinkle 6s ease-in-out infinite;
        }
        .moon {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          right: 40px;
          top: 40px;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.95), rgba(210, 230, 255, 0.55) 55%, transparent 70%);
          opacity: 0.9;
          animation: float 8s ease-in-out infinite;
        }

        @keyframes drift {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(100vw + 900px));
          }
        }
        @keyframes rain {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 0 16px;
          }
        }
        @keyframes fog {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(80px);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(10px);
          }
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.10;
          }
          50% {
            opacity: 0.16;
          }
        }
      `}</style>
    </>
  );
}

export default function ClimaPage() {
  const [query, setQuery] = useState("");
  const [geo, setGeo] = useState<GeoResult[]>([]);
  const [picked, setPicked] = useState<GeoResult | null>(null);

  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingWx, setLoadingWx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wx, setWx] = useState<ForecastResponse | null>(null);

  const tz = "America/Sao_Paulo";

  // Buscar cidades (sem depender de localização)
  async function searchCities(q: string) {
    if (!q.trim()) {
      setGeo([]);
      return;
    }
    setLoadingGeo(true);
    setError(null);
    try {
      // 1) tenta sua API local
      const local = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (local.ok) {
        const data = await local.json();
        const results: GeoResult[] = (data?.results ?? []).map((r: any) => ({
          name: r.name,
          admin1: r.admin1,
          admin2: r.admin2,
          country: r.country,
          lat: Number(r.lat),
          lon: Number(r.lon),
          label: r.label ?? `${r.name}${r.admin1 ? " - " + r.admin1 : ""}${r.country ? " - " + r.country : ""}`,
        }));
        setGeo(results);
        return;
      }

      // 2) fallback direto Open-Meteo (caso sua rota não exista)
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=pt&format=json`
      );
      const data = await r.json();
      const results: GeoResult[] = (data?.results ?? []).map((r: any) => ({
        name: r.name,
        admin1: r.admin1,
        admin2: r.admin2,
        country: r.country,
        lat: Number(r.latitude),
        lon: Number(r.longitude),
        label: `${r.name}${r.admin1 ? " - " + r.admin1 : ""}${r.country ? " - " + r.country : ""}`,
      }));
      setGeo(results);
    } catch (e: any) {
      setError("Falha ao buscar cidades.");
    } finally {
      setLoadingGeo(false);
    }
  }

  async function loadForecast(lat: number, lon: number) {
    setLoadingWx(true);
    setError(null);
    try {
      // 1) tenta sua API local
      const local = await fetch(`/api/forecast?lat=${lat}&lon=${lon}&tz=${encodeURIComponent(tz)}`);
      if (local.ok) {
        const data = await local.json();
        setWx(data);
        return;
      }

      // 2) fallback direto Open-Meteo
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&timezone=${encodeURIComponent(tz)}` +
        `&current=temperature_2m,precipitation,windspeed_10m,weathercode` +
        `&hourly=temperature_2m,precipitation,windspeed_10m,weathercode` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum`;

      const r = await fetch(url);
      const data = await r.json();
      setWx({
        timezone: data.timezone,
        current: data.current,
        hourly: data.hourly,
        daily: data.daily,
      });
    } catch (e: any) {
      setError("Falha ao carregar previsão do tempo.");
    } finally {
      setLoadingWx(false);
    }
  }

  // Debounce simples
  useEffect(() => {
    const t = setTimeout(() => {
      searchCities(query);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const current = wx?.current;
  const daily = wx?.daily;
  const hourly = wx?.hourly;

  const nowHour = useMemo(() => {
    try {
      const d = new Date();
      return d.getHours();
    } catch {
      return undefined;
    }
  }, []);

  const theme = useMemo(() => themeFrom(current?.weathercode, nowHour), [current?.weathercode, nowHour]);

  const next12h = useMemo(() => {
    if (!hourly?.time?.length) return [];
    const now = new Date();
    const idx = hourly.time.findIndex((t) => new Date(t) >= now);
    const start = idx >= 0 ? idx : 0;
    const end = Math.min(start + 12, hourly.time.length);
    const rows = [];
    for (let i = start; i < end; i++) {
      rows.push({
        time: hourly.time[i],
        temp: hourly.temperature_2m?.[i],
        rain: hourly.precipitation?.[i],
        wind: hourly.windspeed_10m?.[i],
        code: hourly.weathercode?.[i],
      });
    }
    return rows;
  }, [hourly]);

  const days7 = useMemo(() => {
    if (!daily?.time?.length) return [];
    const rows = [];
    for (let i = 0; i < Math.min(7, daily.time.length); i++) {
      rows.push({
        date: daily.time[i],
        code: daily.weathercode?.[i],
        tmin: daily.temperature_2m_min?.[i],
        tmax: daily.temperature_2m_max?.[i],
        rainSum: daily.precipitation_sum?.[i],
      });
    }
    return rows;
  }, [daily]);

  function pickFromText(value: string) {
    const found = geo.find((g) => g.label === value);
    if (found) {
      setPicked(found);
      loadForecast(found.lat, found.lon);
    }
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Seu navegador não suporta localização.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setPicked({
          name: "Minha localização",
          lat,
          lon,
          label: "Minha localização",
          country: "Brasil",
        });
        loadForecast(lat, lon);
      },
      () => setError("Não foi possível obter sua localização.")
    );
  }

  return (
    <div className="relative z-10 min-h-[calc(100vh-56px)]">
      <AnimatedBackground theme={theme} />

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Clima</h1>
              <p className="text-white/80">
                {picked ? picked.label : "Selecione uma cidade (sem depender da localização)."}
              </p>
            </div>

            {/* Resumo topo */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="text-2xl">{codeIcon(current?.weathercode)}</span>
              <div className="text-sm leading-tight">
                <div className="font-semibold">{codeLabel(current?.weathercode)}</div>
                <div className="text-white/80">
                  {current?.temperature_2m != null ? `${current.temperature_2m.toFixed(1)}°C` : "—"}{" "}
                  {current?.precipitation != null ? `• ${current.precipitation.toFixed(1)} mm` : ""}{" "}
                  {current?.windspeed_10m != null ? `• ${current.windspeed_10m.toFixed(1)} km/h` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Busca */}
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <div className="space-y-1">
              <label className="text-sm text-white/80">Escolher cidade</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 outline-none placeholder:text-white/40 focus:border-white/30"
                placeholder="Digite a cidade (ex: Patos de Minas)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                list="citylist"
                onBlur={(e) => pickFromText(e.target.value)}
              />
              <datalist id="citylist">
                {geo.map((g) => (
                  <option key={`${g.lat}-${g.lon}-${g.label}`} value={g.label} />
                ))}
              </datalist>
              <div className="text-xs text-white/60">
                {loadingGeo ? "Buscando cidades..." : "Dica: digite e depois selecione uma opção da lista."}
              </div>
            </div>

            <button
              className="h-[42px] mt-6 md:mt-[22px] rounded-xl border border-white/15 bg-white/10 px-4 text-sm hover:bg-white/15"
              onClick={() => pickFromText(query)}
              disabled={!query.trim()}
            >
              Buscar
            </button>

            <button
              className="h-[42px] mt-6 md:mt-[22px] rounded-xl border border-white/15 bg-white/10 px-4 text-sm hover:bg-white/15"
              onClick={useMyLocation}
            >
              Usar minha localização
            </button>

            <button
              className="h-[42px] mt-6 md:mt-[22px] rounded-xl border border-white/15 bg-white/10 px-4 text-sm hover:bg-white/15"
              onClick={() => {
                setQuery("");
                setGeo([]);
                setPicked(null);
                setWx(null);
                setError(null);
              }}
            >
              Limpar
            </button>
          </div>

          {error && <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm">{error}</div>}
        </div>

        {/* Agora */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Agora</h2>
              <div className="text-xs text-white/70">
                {current?.time ? `Atualizado: ${current.time.replace("T", " ")} (${wx?.timezone ?? tz})` : "—"}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-white/70">Temperatura</div>
                <div className="mt-1 text-2xl font-bold">
                  {current?.temperature_2m != null ? `${current.temperature_2m.toFixed(1)}°C` : "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-white/70">Chuva (agora)</div>
                <div className="mt-1 text-2xl font-bold">
                  {current?.precipitation != null ? `${current.precipitation.toFixed(1)} mm` : "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-white/70">Vento</div>
                <div className="mt-1 text-2xl font-bold">
                  {current?.windspeed_10m != null ? `${current.windspeed_10m.toFixed(1)} km/h` : "—"}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{codeIcon(current?.weathercode)}</span>
                <div className="font-semibold">{codeLabel(current?.weathercode)}</div>
              </div>
              <div className="text-sm text-white/70 mt-1">
                Fundo animado muda automaticamente pelo clima (sol/chuva/nublado/neblina/noite).
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-5">
            <h2 className="text-xl font-bold">Alertas</h2>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
              ✅ Sem alertas críticos exibidos pela API do Open-Meteo.
              <div className="text-white/70 mt-2">(Se quiser depois, conectamos alertas oficiais por estado/município.)</div>
            </div>
          </div>
        </div>

        {/* Previsão 7 dias */}
        <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-5">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold">Previsão — 7 dias</h2>
            <div className="text-xs text-white/70">mín / máx • chuva (mm) • condição</div>
          </div>

          {!picked && <div className="mt-3 text-sm text-white/70">Faça uma busca de cidade para ver os 7 dias.</div>}

          {picked && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {days7.map((d) => (
                <div key={d.date} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{formatBRDate(d.date)}</div>
                    <div className="text-xl">{codeIcon(d.code)}</div>
                  </div>

                  <div className="mt-2 text-sm text-white/80">{codeLabel(d.code)}</div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="text-white/70">Mín/Máx</div>
                    <div className="font-semibold">
                      {d.tmin != null ? d.tmin.toFixed(1) : "—"}° / {d.tmax != null ? d.tmax.toFixed(1) : "—"}°
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <div className="text-white/70">Chuva</div>
                    <div className="font-semibold">{d.rainSum != null ? `${d.rainSum.toFixed(1)} mm` : "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas 12 horas */}
        <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-5">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold">Próximas 12 horas</h2>
            <div className="text-xs text-white/70">hora • temp • chuva • vento • condição</div>
          </div>

          {!picked && <div className="mt-3 text-sm text-white/70">Faça uma busca de cidade para ver as próximas horas.</div>}

          {picked && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[680px] w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-left font-semibold">Hora</th>
                    <th className="py-2 pr-4 text-left font-semibold">Temp</th>
                    <th className="py-2 pr-4 text-left font-semibold">Chuva</th>
                    <th className="py-2 pr-4 text-left font-semibold">Vento</th>
                    <th className="py-2 pr-4 text-left font-semibold">Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {next12h.map((h) => (
                    <tr key={h.time} className="border-b border-white/5">
                      <td className="py-3 pr-4">{formatBRTime(h.time)}</td>
                      <td className="py-3 pr-4">{h.temp != null ? `${h.temp.toFixed(1)}°C` : "—"}</td>
                      <td className="py-3 pr-4">{h.rain != null ? `${h.rain.toFixed(1)} mm` : "—"}</td>
                      <td className="py-3 pr-4">{h.wind != null ? `${h.wind.toFixed(1)} km/h` : "—"}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span>{codeIcon(h.code)}</span>
                          <span className="text-white/80">{codeLabel(h.code)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!next12h.length && (
                    <tr>
                      <td className="py-3 text-white/70" colSpan={5}>
                        Carregando horas...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 text-xs text-white/60">
            Fonte: Open-Meteo (geocoding + forecast). Sem chave de API.
            {loadingWx ? " • Carregando previsão..." : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
