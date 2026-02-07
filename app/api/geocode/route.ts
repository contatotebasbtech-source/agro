import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GeoItem = {
  name?: string;
  latitude?: number;
  longitude?: number;
  admin1?: string;
  admin2?: string;
  country?: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json(
        { error: "Parâmetro 'q' é obrigatório. Ex: /api/geocode?q=Patos%20de%20Minas" },
        { status: 400 }
      );
    }

    // Geocoding do Open-Meteo
    const url =
      "https://geocoding-api.open-meteo.com/v1/search" +
      `?name=${encodeURIComponent(q)}` +
      "&count=10&language=pt&format=json";

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json(
        { error: "Falha ao buscar geocoding." },
        { status: 502 }
      );
    }

    const data = (await r.json()) as { results?: GeoItem[] };

    const results =
      (data.results || [])
        .filter((x) => typeof x.latitude === "number" && typeof x.longitude === "number")
        .map((x) => ({
          name: x.name || "",
          lat: x.latitude as number,
          lon: x.longitude as number,
          admin1: x.admin1 || "",
          admin2: x.admin2 || "",
          country: x.country || "",
          label: [
            x.name,
            x.admin2 ? x.admin2 : "",
            x.admin1 ? x.admin1 : "",
            x.country ? x.country : "",
          ]
            .filter(Boolean)
            .join(" - "),
        })) || [];

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: "Erro interno no geocode." }, { status: 500 });
  }
}
