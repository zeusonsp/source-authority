"use client";

import { geoCentroid } from "d3-geo";
import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import {
  NUMERIC_TO_ALPHA2,
  countryDisplayName,
} from "@/lib/relatorios/countries";
import type { CountryCount } from "@/lib/relatorios/types";

const ACCENT = "#C9A94B";
const MUTED = "#1F1F1F";
const BORDER = "#2A2A2A";

type Props = {
  topCountries: CountryCount[];
};

type Geo = {
  rsmKey: string;
  id: string;
  properties: { name?: string };
};

export function WorldMap({ topCountries }: Props) {
  const countryMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of topCountries) m.set(c.country, c.clicks);
    return m;
  }, [topCountries]);

  const maxClicks = useMemo(
    () => topCountries.reduce((max, c) => Math.max(max, c.clicks), 1),
    [topCountries],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <ComposableMap
        projectionConfig={{ scale: 145 }}
        width={900}
        height={420}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography="/world-110m.json">
          {({ geographies }: { geographies: Geo[] }) => (
            <>
              {geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={MUTED}
                  stroke={BORDER}
                  strokeWidth={0.4}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#262626", outline: "none" },
                    pressed: { fill: "#262626", outline: "none" },
                  }}
                />
              ))}
              {geographies.map((geo) => {
                const alpha2 = NUMERIC_TO_ALPHA2[geo.id];
                if (!alpha2) return null;
                const clicks = countryMap.get(alpha2);
                if (!clicks) return null;
                // Raio logarítmico em [4, 16]px pra evitar que países com
                // muitos cliques dominem visualmente.
                const ratio = Math.log(clicks + 1) / Math.log(maxClicks + 1);
                const radius = 4 + ratio * 12;
                const centroid = geoCentroid(geo as never) as [number, number];
                return (
                  <Marker key={`marker-${alpha2}`} coordinates={centroid}>
                    <circle
                      r={radius}
                      fill={ACCENT}
                      fillOpacity={0.7}
                      stroke={ACCENT}
                      strokeWidth={1}
                    >
                      <title>
                        {countryDisplayName(alpha2)} — {clicks}{" "}
                        {clicks === 1 ? "clique" : "cliques"}
                      </title>
                    </circle>
                  </Marker>
                );
              })}
            </>
          )}
        </Geographies>
      </ComposableMap>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {captionFor(topCountries.length)}
      </p>
    </div>
  );
}

function captionFor(n: number): string {
  if (n === 0) return "Sem dados de geolocalização no período.";
  if (n === 1) {
    return "1 país no período. Marcador proporcional ao número de cliques.";
  }
  return `Top ${Math.min(n, 5)} países no período. Marcadores proporcionais ao número de cliques.`;
}
