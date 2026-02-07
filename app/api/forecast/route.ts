import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const lat = Number(searchParams.get("lat"));
    const lon = Number(searchParams.get("lon"));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: "Parâmetros 'lat' e 'lon' são obrigatórios. Ex: /api/forecast?lat=-18.58&lon=-46.52" },
        { status: 400 }
      );
    }

    // Você pode ajustar aqui o timezone.
    // "auto" funciona bem e já tenta usar o local.
    const timezone = "auto";

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${encodeURIComponent(String(lat))}` +
      `&longitude=${encodeURIComponent(String(lon))}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m" +
      "&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max" +
      "&forecast_days=7" +
      `&timezone=${encodeURIComponent(timezone)}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json(
        { error: "Falha ao buscar previsão." },
        { status: 502 }
      );
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Erro interno no forecast." }, { status: 500 });
  }
}
