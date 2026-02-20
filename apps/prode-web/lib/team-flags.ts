const TEAM_FLAGS: Record<string, string> = {
  argentina: "🇦🇷",
  australia: "🇦🇺",
  belgium: "🇧🇪",
  bolivia: "🇧🇴",
  brazil: "🇧🇷",
  cameroon: "🇨🇲",
  canada: "🇨🇦",
  chile: "🇨🇱",
  colombia: "🇨🇴",
  costa_rica: "🇨🇷",
  croatia: "🇭🇷",
  denmark: "🇩🇰",
  ecuador: "🇪🇨",
  egypt: "🇪🇬",
  england: "🏴",
  france: "🇫🇷",
  germany: "🇩🇪",
  ghana: "🇬🇭",
  iran: "🇮🇷",
  iraq: "🇮🇶",
  italy: "🇮🇹",
  japan: "🇯🇵",
  mexico: "🇲🇽",
  morocco: "🇲🇦",
  netherlands: "🇳🇱",
  nigeria: "🇳🇬",
  norway: "🇳🇴",
  panama: "🇵🇦",
  paraguay: "🇵🇾",
  peru: "🇵🇪",
  poland: "🇵🇱",
  portugal: "🇵🇹",
  qatar: "🇶🇦",
  saudi_arabia: "🇸🇦",
  senegal: "🇸🇳",
  serbia: "🇷🇸",
  south_africa: "🇿🇦",
  south_korea: "🇰🇷",
  spain: "🇪🇸",
  switzerland: "🇨🇭",
  tunisia: "🇹🇳",
  turkey: "🇹🇷",
  uruguay: "🇺🇾",
  usa: "🇺🇸",
  united_states: "🇺🇸",
  venezuela: "🇻🇪",

  arg: "🇦🇷",
  mex: "🇲🇽",
  bra: "🇧🇷",
  esp: "🇪🇸",
  fra: "🇫🇷",
  ger: "🇩🇪",
  usa_code: "🇺🇸"
};

function normalizeTeamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isPlaceholder(name: string): boolean {
  const trimmed = name.trim();
  return (
    /^winner\b/i.test(trimmed) ||
    /^w\d+$/i.test(trimmed) ||
    /^ru\d+$/i.test(trimmed) ||
    /^\d+[a-z]+$/i.test(trimmed) ||
    /^\d+[a-z0-9]+$/i.test(trimmed)
  );
}

export function getTeamFlag(teamName: string): string {
  if (!teamName) {
    return "🏳️";
  }

  if (isPlaceholder(teamName)) {
    return "🏳️";
  }

  const normalized = normalizeTeamName(teamName);
  if (normalized === "usa") {
    return TEAM_FLAGS.usa;
  }

  return TEAM_FLAGS[normalized] ?? "🏳️";
}
