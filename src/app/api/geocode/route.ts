import { NextRequest, NextResponse } from "next/server";

interface IliganPlace {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
}

/**
 * Curated Iligan City landmarks, schools, malls, terminals, and barangays
 * for instant (<5ms) geocoding before falling back to OpenStreetMap Nominatim.
 */
const ILIGAN_PLACES: IliganPlace[] = [
  {
    name: "St. Peter's College, Sabayle, Iligan City",
    aliases: ["st peters college", "st peter college", "saint peters college", "saint peter college", "spc", "st peter"],
    lat: 8.2307,
    lng: 124.2367,
  },
  {
    name: "Tipanoy, Iligan City",
    aliases: ["tipanoy", "brgy tipanoy", "barangay tipanoy"],
    lat: 8.1912,
    lng: 124.2545,
  },
  {
    name: "MSU-IIT Main Gate, Tibanga, Iligan City",
    aliases: ["msu iit", "msu-iit", "iit", "mindanao state university"],
    lat: 8.2414,
    lng: 124.2442,
  },
  {
    name: "Robinsons Place Iligan, Tubod",
    aliases: ["robinsons", "robinsons iligan", "robinsons place", "robinsons mall"],
    lat: 8.2127,
    lng: 124.2371,
  },
  {
    name: "Gaisano Mall Iligan, Roxas Ave",
    aliases: ["gaisano", "gaisano mall", "gaisano iligan", "gaisano superstore"],
    lat: 8.2278,
    lng: 124.2419,
  },
  {
    name: "Iligan Integrated Bus Terminal, Tambo",
    aliases: ["tambo", "tambo terminal", "bus terminal", "north bound terminal", "iligan terminal"],
    lat: 8.2489,
    lng: 124.2549,
  },
  {
    name: "Iligan City Hall, Buhanginan Hills, Pala-o",
    aliases: ["city hall", "iligan city hall", "buhanginan hills"],
    lat: 8.2271,
    lng: 124.2557,
  },
  {
    name: "Poblacion (City Proper), Iligan City",
    aliases: ["poblacion", "city proper", "plaza", "iligan plaza", "public plaza"],
    lat: 8.228,
    lng: 124.2372,
  },
  {
    name: "Tibanga, Iligan City",
    aliases: ["tibanga", "brgy tibanga", "barangay tibanga"],
    lat: 8.2423,
    lng: 124.2465,
  },
  {
    name: "Tubod, Iligan City",
    aliases: ["tubod", "brgy tubod", "barangay tubod"],
    lat: 8.2155,
    lng: 124.2395,
  },
  {
    name: "Pala-o, Iligan City",
    aliases: ["pala o", "palao", "pala-o", "palao market", "pala-o market"],
    lat: 8.2255,
    lng: 124.2498,
  },
  {
    name: "Ubaldo D. Laya, Iligan City",
    aliases: ["ubaldo laya", "ubaldo d laya", "laya"],
    lat: 8.2145,
    lng: 124.2528,
  },
  {
    name: "Mahayahay, Iligan City",
    aliases: ["mahayahay", "brgy mahayahay"],
    lat: 8.2185,
    lng: 124.2355,
  },
  {
    name: "Villa Verde, Iligan City",
    aliases: ["villa verde", "villaverde"],
    lat: 8.2284,
    lng: 124.2448,
  },
  {
    name: "Tambacan, Iligan City",
    aliases: ["tambacan", "brgy tambacan"],
    lat: 8.2212,
    lng: 124.2309,
  },
  {
    name: "Suarez, Iligan City",
    aliases: ["suarez", "brgy suarez", "barangay suarez"],
    lat: 8.1986,
    lng: 124.2165,
  },
  {
    name: "Buru-un, Iligan City",
    aliases: ["buru un", "buruun", "buru-un", "brgy buruun"],
    lat: 8.1872,
    lng: 124.1674,
  },
  {
    name: "Maria Cristina Falls, Iligan City",
    aliases: ["maria cristina", "maria cristina falls", "npc"],
    lat: 8.1856,
    lng: 124.1924,
  },
  {
    name: "Del Carmen, Iligan City",
    aliases: ["del carmen", "brgy del carmen"],
    lat: 8.2348,
    lng: 124.2598,
  },
  {
    name: "Hinaplanon, Iligan City",
    aliases: ["hinaplanon", "brgy hinaplanon"],
    lat: 8.2485,
    lng: 124.2625,
  },
  {
    name: "Santiago, Iligan City",
    aliases: ["santiago", "brgy santiago"],
    lat: 8.2471,
    lng: 124.2412,
  },
  {
    name: "San Miguel, Iligan City",
    aliases: ["san miguel", "brgy san miguel"],
    lat: 8.2354,
    lng: 124.2429,
  },
  {
    name: "Saray, Iligan City",
    aliases: ["saray", "brgy saray"],
    lat: 8.2335,
    lng: 124.2351,
  },
  {
    name: "Santo Rosario, Iligan City",
    aliases: ["santo rosario", "sto rosario"],
    lat: 8.2377,
    lng: 124.2474,
  },
  {
    name: "Bagong Silang, Iligan City",
    aliases: ["bagong silang", "brgy bagong silang"],
    lat: 8.2389,
    lng: 124.2546,
  },
  {
    name: "Luinab, Iligan City",
    aliases: ["luinab", "brgy luinab"],
    lat: 8.2435,
    lng: 124.2682,
  },
  {
    name: "Sta. Filomena, Iligan City",
    aliases: ["sta filomena", "santa filomena", "filomena"],
    lat: 8.2685,
    lng: 124.2554,
  },
  {
    name: "Kiwalan, Iligan City",
    aliases: ["kiwalan", "brgy kiwalan"],
    lat: 8.2852,
    lng: 124.2597,
  },
  {
    name: "Dalipuga, Iligan City",
    aliases: ["dalipuga", "brgy dalipuga"],
    lat: 8.3085,
    lng: 124.2556,
  },
  {
    name: "Iligan Medical Center College (IMCC), Pala-o",
    aliases: ["imcc", "iligan medical center", "iligan medical"],
    lat: 8.2295,
    lng: 124.2473,
  },
  {
    name: "Adventist Medical Center (Sanitarium), San Miguel",
    aliases: ["adventist medical", "sanitarium", "amc iligan"],
    lat: 8.2362,
    lng: 124.2458,
  },
  {
    name: "Mercy Community Hospital, Camague, Tubod",
    aliases: ["mercy hospital", "mercy community", "camague"],
    lat: 8.2102,
    lng: 124.2349,
  },
  {
    name: "Iligan Capitol College (ICC), Mahayahay",
    aliases: ["icc", "iligan capitol college", "capitol college"],
    lat: 8.2206,
    lng: 124.2385,
  },
  {
    name: "St. Michael's College (SMC), Poblacion",
    aliases: ["smc", "st michaels college", "st michael college", "saint michaels college"],
    lat: 8.2286,
    lng: 124.2392,
  },
];

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findLocalPlace(query: string): IliganPlace | null {
  const q = normalize(query);
  if (q.length < 2) return null;

  // 1. Exact or alias match
  for (const place of ILIGAN_PLACES) {
    if (normalize(place.name) === q) return place;
    if (place.aliases.some((a) => a === q)) return place;
  }

  // 2. Substring match (either query contains alias or alias/name contains query)
  for (const place of ILIGAN_PLACES) {
    const normName = normalize(place.name);
    if (normName.includes(q)) return place;
    if (place.aliases.some((a) => a.includes(q) || (a.length >= 4 && q.includes(a)))) {
      return place;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  // 1. Instant local Iligan City landmark & barangay lookup
  const local = findLocalPlace(q);
  if (local) {
    return NextResponse.json({
      found: true,
      lat: local.lat,
      lng: local.lng,
      label: local.name,
      source: "iligan-local",
    });
  }

  // 2. Fallback to OpenStreetMap Nominatim scoped to Iligan City, Philippines
  try {
    const searchQuery = q.toLowerCase().includes("iligan")
      ? `${q}, Philippines`
      : `${q}, Iligan City, Philippines`;

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ph");
    url.searchParams.set("viewbox", "124.10,8.35,124.45,8.10");
    url.searchParams.set("q", searchQuery);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "SakayNa-Iligan-RideHailing/1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (res.ok) {
      const results = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      if (results.length > 0) {
        const hit = results[0];
        const lat = Number(hit.lat);
        const lng = Number(hit.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return NextResponse.json({
            found: true,
            lat,
            lng,
            label: hit.display_name.split(",").slice(0, 3).join(","),
            source: "nominatim",
          });
        }
      }
    }
  } catch {
    // Graceful fallback if Nominatim times out
  }

  return NextResponse.json({ found: false });
}
