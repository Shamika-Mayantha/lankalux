import geo from "@/content/geo/srilanka.json";

export type Place = keyof typeof geo.places;
export const MAP_VIEWBOX = geo.viewBox;
export const MAP_OUTLINE = geo.outline;
export const place = (p: Place) => geo.places[p] as [number, number];

/** A smooth curve (Catmull-Rom as cubic Béziers) through the given places, as an SVG path. */
export function routePath(stops: Place[]): string {
  const pts = stops.map(place);
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export const PLACE_NAMES: Record<Place, string> = {
  airport: "Colombo Airport",
  colombo: "Colombo",
  sigiriya: "Sigiriya",
  polonnaruwa: "Polonnaruwa",
  dambulla: "Dambulla",
  kandy: "Kandy",
  nuwaraEliya: "Nuwara Eliya",
  ella: "Ella",
  yala: "Yala",
  udawalawe: "Udawalawe",
  sinharaja: "Sinharaja",
  wilpattu: "Wilpattu",
  arugamBay: "Arugam Bay",
  mirissa: "Mirissa",
  galle: "Galle",
  westCoast: "West coast",
};
