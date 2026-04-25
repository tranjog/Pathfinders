export function cyclingOverpassQuery(bbox: string): string {
  return `
    [out:json][timeout:15];
    (
      way["highway"="cycleway"](${bbox});
      way["cycleway"="track"](${bbox});
      way["cycleway"="lane"](${bbox});
      way["bicycle"="designated"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;
}

export function runningOverpassQuery(bbox: string): string {
  return `
    [out:json][timeout:15];
    (
      way["highway"="path"](${bbox});
      way["highway"="footway"](${bbox});
      way["highway"="track"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;
}
