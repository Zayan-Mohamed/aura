/**
 * Seasonal mode - when the calendar lands on a Sri Lankan gifting occasion, the
 * landing hero greets the shopper with a themed ribbon and a few curated prompts
 * so the demo (and real customers) feel local and alive on the day. Returns null
 * outside any occasion window, so the app stays in its evergreen state most of
 * the year.
 *
 * Dates are evaluated in Asia/Colombo. Windows are deliberately a little wide so
 * the theme appears in the run-up, not just on the day itself.
 */
export type Season = {
  id: string;
  /** Short ribbon label, e.g. "Poson season". */
  label: string;
  /** One warm line under the ribbon. */
  blurb: string;
  /** Curated opening prompts, prepended to the hero suggestions. */
  suggestions: { label: string; text: string }[];
};

type Window = { season: Season; from: [number, number]; to: [number, number] };

// month is 1-based here for readability.
const WINDOWS: Window[] = [
  {
    from: [4, 1],
    to: [4, 16],
    season: {
      id: "avurudu",
      label: "Avurudu season",
      blurb: "Sinhala & Tamil New Year is here - sweetmeats, gifts for the family, and deliveries that arrive on time.",
      suggestions: [
        { label: "Avurudu sweets hamper", text: "Help me put together an Avurudu sweets hamper - kokis, kavum, aluwa and the like." },
        { label: "New Year gift for my parents", text: "I want an Avurudu gift for my parents, budget around Rs 8,000." },
      ],
    },
  },
  {
    from: [5, 1],
    to: [5, 24],
    season: {
      id: "vesak",
      label: "Vesak season",
      blurb: "Vesak is near - lanterns, sweets, and thoughtful gifts to share the season of giving.",
      suggestions: [
        { label: "Vesak lanterns & decor", text: "Show me Vesak lanterns and decorations for my home." },
        { label: "A gift to share for Vesak", text: "I'd like a nice sweets or gift box to share with neighbours for Vesak." },
      ],
    },
  },
  {
    from: [6, 1],
    to: [6, 14],
    season: {
      id: "poson",
      label: "Poson season",
      blurb: "Poson Poya is here - sweets, white offerings, and gifts for loved ones, delivered fresh.",
      suggestions: [
        { label: "Poson sweets & treats", text: "Show me sweets and treats I can gift for Poson." },
        { label: "A thoughtful Poson gift", text: "I want a thoughtful Poson gift for a family member, around Rs 5,000." },
      ],
    },
  },
  {
    from: [12, 1],
    to: [12, 26],
    season: {
      id: "christmas",
      label: "Christmas season",
      blurb: "It's the season of giving - cakes, hampers, and gifts that reach loved ones in time for Christmas.",
      suggestions: [
        { label: "Christmas cake & hampers", text: "Help me find a Christmas cake and a hamper to gift." },
        { label: "Secret Santa under Rs 3,000", text: "I need a fun Secret Santa gift under Rs 3,000." },
      ],
    },
  },
];

function colomboMonthDay(date: Date): [number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");
  return [month, day];
}

const inWindow = (md: [number, number], from: [number, number], to: [number, number]) => {
  const v = md[0] * 100 + md[1];
  return v >= from[0] * 100 + from[1] && v <= to[0] * 100 + to[1];
};

/** The active season for the given date (default: now), or null if none. */
export function currentSeason(date: Date = new Date()): Season | null {
  const md = colomboMonthDay(date);
  return WINDOWS.find((w) => inWindow(md, w.from, w.to))?.season ?? null;
}
