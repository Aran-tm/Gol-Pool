// Map TxLINE team names → ISO 3166-1 alpha-2 codes (lowercase) for flag-icons.
// Emoji flags don't render on Windows, so we use real SVG flags via the `fi fi-xx` classes.
// England/Scotland/Wales use flag-icons' subdivision codes (gb-eng, gb-sct, gb-wls).
const CODES: Record<string, string> = {
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  "Bosnia & Herzegovina": "ba",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde": "cv",
  Colombia: "co",
  "Congo DR": "cd",
  Croatia: "hr",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Iran: "ir",
  Iraq: "iq",
  "Ivory Coast": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  Spain: "es",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  Ukraine: "ua",
  USA: "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
  Wales: "gb-wls",
};

/** ISO code for a team name, or null if unknown. */
export function flagCode(team: string): string | null {
  return CODES[team] ?? null;
}
