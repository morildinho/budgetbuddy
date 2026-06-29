// Merchant icon mapping for Norwegian bank transactions.
// Maps transaction description patterns to merchant branding (name, color, initials).

export interface MerchantInfo {
  name: string;
  initials: string;
  bg: string;    // background color
  text: string;  // text/foreground color
  logo?: string; // URL to uploaded icon image
}

// DB icon shape (from useMerchantIcons hook)
export interface DbMerchantIcon {
  pattern: string;
  name: string;
  icon_url: string | null;
}

// Patterns are matched case-insensitively against the transaction description.
// Order matters: first match wins, so put more specific patterns before general ones.
const MERCHANT_PATTERNS: [string, MerchantInfo][] = [
  // ── Grocery stores ──
  ["REMA 1000",     { name: "Rema 1000",     initials: "R",   bg: "#004B93", text: "#fff" }],
  ["REMA",          { name: "Rema 1000",     initials: "R",   bg: "#004B93", text: "#fff" }],
  ["KIWI",          { name: "Kiwi",          initials: "K",   bg: "#6DB33F", text: "#fff" }],
  ["MENY",          { name: "Meny",          initials: "M",   bg: "#E2001A", text: "#fff" }],
  ["COOP OBS",      { name: "Coop Obs",      initials: "OBS", bg: "#00543E", text: "#fff" }],
  ["COOP EXTRA",    { name: "Coop Extra",    initials: "EX",  bg: "#00543E", text: "#fff" }],
  ["COOP PRIX",     { name: "Coop Prix",     initials: "CP",  bg: "#00543E", text: "#fff" }],
  ["COOP MEGA",     { name: "Coop Mega",     initials: "CM",  bg: "#00543E", text: "#fff" }],
  ["COOP",          { name: "Coop",          initials: "C",   bg: "#00543E", text: "#fff" }],
  ["BUNNPRIS",      { name: "Bunnpris",      initials: "B",   bg: "#ED1C24", text: "#fff" }],
  ["SPAR ",         { name: "Spar",          initials: "S",   bg: "#007A3D", text: "#fff" }],
  ["JOKER ",        { name: "Joker",         initials: "J",   bg: "#E30613", text: "#fff" }],
  ["EUROSPAR",      { name: "Eurospar",      initials: "ES",  bg: "#007A3D", text: "#fff" }],

  // ── Other retail ──
  ["IKEA",          { name: "IKEA",          initials: "IK",  bg: "#0051BA", text: "#FBDA0C" }],
  ["JULA ",         { name: "Jula",          initials: "JU",  bg: "#E30613", text: "#fff" }],
  ["CLAS OHLSON",   { name: "Clas Ohlson",   initials: "CO",  bg: "#0072BC", text: "#fff" }],
  ["EUROPRIS",      { name: "Europris",      initials: "EP",  bg: "#00479D", text: "#fff" }],
  ["NILLE",         { name: "Nille",         initials: "N",   bg: "#D5006D", text: "#fff" }],
  ["XXL ",          { name: "XXL",           initials: "XXL", bg: "#111",    text: "#00C853" }],
  ["H&M",           { name: "H&M",          initials: "HM",  bg: "#E50010", text: "#fff" }],
  ["ZARA",          { name: "Zara",          initials: "Z",   bg: "#000",    text: "#fff" }],
  ["NORMAL ",       { name: "Normal",        initials: "N",   bg: "#C8E84E", text: "#1a1a1a" }],
  ["ELKJØP",        { name: "Elkjøp",       initials: "EK",  bg: "#0A7B24", text: "#fff" }],
  ["POWER ",        { name: "Power",         initials: "PW",  bg: "#FF6900", text: "#fff" }],
  ["APOTEK 1",      { name: "Apotek 1",      initials: "A1",  bg: "#00843D", text: "#fff" }],
  ["VITUSAPOTEK",   { name: "Vitusapotek",   initials: "VA",  bg: "#0072CE", text: "#fff" }],
  ["BOOTS",         { name: "Boots",         initials: "BO",  bg: "#0072CE", text: "#fff" }],
  ["VINMONOPOLET",  { name: "Vinmonopolet",  initials: "V",   bg: "#6E0B14", text: "#fff" }],
  ["NORLI",         { name: "Norli",         initials: "NL",  bg: "#D12B2B", text: "#fff" }],
  ["ARK ",          { name: "ARK",           initials: "ARK", bg: "#1B3A5C", text: "#fff" }],

  // ── Food delivery ──
  ["WOLT",          { name: "Wolt",          initials: "W",   bg: "#009DE0", text: "#fff" }],
  ["FOODORA",       { name: "Foodora",       initials: "FO",  bg: "#D70F64", text: "#fff" }],
  ["JUST EAT",      { name: "Just Eat",      initials: "JE",  bg: "#FF8000", text: "#fff" }],

  // ── Restaurants / cafés ──
  ["STARBUCKS",     { name: "Starbucks",     initials: "SB",  bg: "#00704A", text: "#fff" }],
  ["MCDONALDS",     { name: "McDonald's",    initials: "MC",  bg: "#FFC72C", text: "#DA291C" }],
  ["MCDONALD",      { name: "McDonald's",    initials: "MC",  bg: "#FFC72C", text: "#DA291C" }],
  ["BURGER KING",   { name: "Burger King",   initials: "BK",  bg: "#FF8732", text: "#502314" }],
  ["PEPPES PIZZA",  { name: "Peppes Pizza",  initials: "PP",  bg: "#CE1126", text: "#fff" }],
  ["SUBWAY",        { name: "Subway",        initials: "SW",  bg: "#008C15", text: "#FFC600" }],

  // ── Streaming / digital ──
  ["SPOTIFY",       { name: "Spotify",       initials: "SP",  bg: "#1DB954", text: "#fff" }],
  ["NETFLIX",       { name: "Netflix",       initials: "N",   bg: "#E50914", text: "#fff" }],
  ["YOUTUBE",       { name: "YouTube",       initials: "YT",  bg: "#FF0000", text: "#fff" }],
  ["DISNEY",        { name: "Disney+",       initials: "D+",  bg: "#113CCF", text: "#fff" }],
  ["VIAPLAY",       { name: "Viaplay",       initials: "VP",  bg: "#BE0046", text: "#fff" }],
  ["HBO",           { name: "HBO Max",       initials: "HBO", bg: "#5822B4", text: "#fff" }],
  ["APPLE.COM",     { name: "Apple",         initials: "A",   bg: "#000",    text: "#fff" }],
  ["APPLE",         { name: "Apple",         initials: "A",   bg: "#000",    text: "#fff" }],
  ["GOOGLE",        { name: "Google",        initials: "G",   bg: "#4285F4", text: "#fff" }],
  ["MICROSOFT",     { name: "Microsoft",     initials: "MS",  bg: "#00A4EF", text: "#fff" }],
  ["AMAZON",        { name: "Amazon",        initials: "AM",  bg: "#FF9900", text: "#232F3E" }],
  ["PODME",         { name: "Podme",         initials: "PM",  bg: "#7C3AED", text: "#fff" }],
  ["DI.FM",         { name: "DI.FM",         initials: "DI",  bg: "#1a1a1a", text: "#fff" }],
  ["DISCOVERY",     { name: "Discovery+",    initials: "D+",  bg: "#0033A0", text: "#fff" }],

  // ── Transport ──
  ["SKYSS",         { name: "Skyss",         initials: "SK",  bg: "#E4002B", text: "#fff" }],
  ["RUTER",         { name: "Ruter",         initials: "RT",  bg: "#E60000", text: "#fff" }],
  ["ESSO",          { name: "Esso",          initials: "ES",  bg: "#0B3D91", text: "#fff" }],
  ["SHELL",         { name: "Shell",         initials: "SH",  bg: "#FFD500", text: "#DD1D21" }],
  ["CIRCLE K",      { name: "Circle K",      initials: "CK",  bg: "#ED1C24", text: "#fff" }],
  ["YX ",           { name: "YX",            initials: "YX",  bg: "#002855", text: "#fff" }],
  ["SAS ",          { name: "SAS",           initials: "SAS", bg: "#000066", text: "#fff" }],
  ["NORWEGIAN",     { name: "Norwegian",     initials: "NO",  bg: "#D81939", text: "#fff" }],
  ["WIDERØE",       { name: "Widerøe",      initials: "WF",  bg: "#007C4D", text: "#fff" }],
  ["FLYTOGET",      { name: "Flytoget",      initials: "FT",  bg: "#0069B4", text: "#fff" }],
  ["VY ",           { name: "Vy",            initials: "VY",  bg: "#5B2D8E", text: "#fff" }],
  ["NSB",           { name: "Vy",            initials: "VY",  bg: "#5B2D8E", text: "#fff" }],
  ["VIPPS",         { name: "Vipps",         initials: "V",   bg: "#FF5B24", text: "#fff" }],

  // ── Fitness ──
  ["SATS ",         { name: "SATS",          initials: "S",   bg: "#E31837", text: "#fff" }],
  ["NR1 FITNESS",   { name: "Nr1 Fitness",   initials: "N1",  bg: "#E30613", text: "#fff" }],
  ["ACTIC",         { name: "Actic",         initials: "AC",  bg: "#FF6600", text: "#fff" }],

  // ── Telecom / ISP ──
  ["TELENOR",       { name: "Telenor",       initials: "TN",  bg: "#0093D0", text: "#fff" }],
  ["TELIA",         { name: "Telia",         initials: "TL",  bg: "#990AE3", text: "#fff" }],
  ["ICE ",          { name: "ice",           initials: "ICE", bg: "#30D586", text: "#1a1a1a" }],
  ["ALTIBOX",       { name: "Altibox",       initials: "AB",  bg: "#00B0F0", text: "#fff" }],
  ["GET ",          { name: "Telia/Get",     initials: "GT",  bg: "#990AE3", text: "#fff" }],

  // ── Insurance / finance ──
  ["TRYG",          { name: "Tryg",          initials: "TG",  bg: "#003B71", text: "#fff" }],
  ["IF ",           { name: "If",            initials: "IF",  bg: "#0054A4", text: "#fff" }],
  ["GJENSIDIGE",    { name: "Gjensidige",    initials: "GJ",  bg: "#003C71", text: "#fff" }],
  ["STOREBRAND",    { name: "Storebrand",    initials: "SB",  bg: "#0D3B66", text: "#fff" }],
];

// Simple hash to generate a consistent color for unknown merchants
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 35%)`;
}

export function getMerchantInfo(description: string): MerchantInfo {
  const upper = description.toUpperCase();

  for (const [pattern, info] of MERCHANT_PATTERNS) {
    if (upper.includes(pattern.toUpperCase())) {
      return info;
    }
  }

  // Fallback: generate from first word of description
  const firstWord = description.trim().split(/\s+/)[0] || "?";
  const initial = firstWord.charAt(0).toUpperCase();

  return {
    name: description,
    initials: initial,
    bg: hashColor(description.toUpperCase()),
    text: "#fff",
  };
}

// Enhanced version that checks DB icons first (uploaded logos), then falls back to hardcoded patterns
export function getMerchantInfoWithIcons(
  description: string,
  dbIcons: DbMerchantIcon[],
): MerchantInfo {
  const upper = description.toUpperCase();

  // Check DB icons first (uploaded logos take priority)
  for (const icon of dbIcons) {
    if (upper.includes(icon.pattern.toUpperCase())) {
      // Get base info from hardcoded patterns for colors/initials
      const base = getMerchantInfo(description);
      return {
        ...base,
        name: icon.name,
        logo: icon.icon_url || undefined,
      };
    }
  }

  // Fall back to hardcoded patterns
  return getMerchantInfo(description);
}
