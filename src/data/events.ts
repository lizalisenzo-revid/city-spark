import rooftop from "@/assets/poster-rooftop.jpg";
import market from "@/assets/poster-market.jpg";
import livemusic from "@/assets/poster-livemusic.jpg";
import hike from "@/assets/poster-hike.jpg";
import ramen from "@/assets/poster-ramen.jpg";
import comedy from "@/assets/poster-comedy.jpg";
import pottery from "@/assets/poster-pottery.jpg";
import cinema from "@/assets/poster-cinema.jpg";
import brunch from "@/assets/poster-brunch.jpg";
import boardgames from "@/assets/poster-boardgames.jpg";
import techno from "@/assets/poster-techno.jpg";
import gallery from "@/assets/poster-gallery.jpg";

export type City = "Centurion" | "Pretoria" | "Johannesburg";
export type TimeOfDay = "day" | "night";
export type Vibe = "solo" | "friends" | "visiting" | "bored";
export type Category = "events" | "eats" | "nightlife" | "outdoors";

export interface CityEvent {
  id: string;
  title: string;
  blurb: string;
  city: City;
  area: string;
  category: Category;
  time: TimeOfDay;
  startHour: number; // 0-23, used by Plan My Day
  durationHours: number;
  price: string;
  vibes: Vibe[];
  poster: string;
  accent: "coral" | "tangerine" | "lemon" | "mint" | "sky" | "lilac" | "magenta";
  rotation: number; // -3..3 deg for collage feel
}

export const EVENTS: CityEvent[] = [
  {
    id: "market-cent",
    title: "Saturday Artisan Market",
    blurb: "Fresh pastries, slow coffee, local makers. The cosiest Saturday morning ritual.",
    city: "Centurion", area: "Irene Village",
    category: "eats", time: "day", startHour: 9, durationHours: 3,
    price: "Free entry",
    vibes: ["solo", "friends", "visiting", "bored"],
    poster: market, accent: "mint", rotation: -2,
  },
  {
    id: "hike-groen",
    title: "Groenkloof Trail Walk",
    blurb: "Easy 6km loop, zebras and proteas, stretch the legs before the day kicks off.",
    city: "Pretoria", area: "Groenkloof Reserve",
    category: "outdoors", time: "day", startHour: 7, durationHours: 2,
    price: "R45",
    vibes: ["solo", "friends", "visiting"],
    poster: hike, accent: "mint", rotation: 1,
  },
  {
    id: "brunch-park",
    title: "Sunday Brunch & Mimosas",
    blurb: "Buttery pancakes, bottomless OJ, neighbourhood buzz on 4th Avenue.",
    city: "Johannesburg", area: "Parkhurst",
    category: "eats", time: "day", startHour: 10, durationHours: 2,
    price: "R180 pp",
    vibes: ["friends", "visiting", "bored"],
    poster: brunch, accent: "coral", rotation: -1,
  },
  {
    id: "gallery-pta",
    title: "Art Gallery Opening",
    blurb: "New South African painters, free wine, easy conversation with strangers.",
    city: "Pretoria", area: "Hatfield",
    category: "events", time: "day", startHour: 16, durationHours: 2,
    price: "Free",
    vibes: ["solo", "visiting", "bored"],
    poster: gallery, accent: "lilac", rotation: 2,
  },
  {
    id: "boardgames-cent",
    title: "Board Game Café Afternoon",
    blurb: "300+ games, bottomless filter coffee, terrible at Catan welcomed.",
    city: "Centurion", area: "Eldoraigne",
    category: "events", time: "day", startHour: 14, durationHours: 3,
    price: "R60 pp",
    vibes: ["friends", "bored"],
    poster: boardgames, accent: "tangerine", rotation: -2,
  },
  {
    id: "pottery-jhb",
    title: "Pottery & Wine Workshop",
    blurb: "Throw a wonky mug, sip rosé, leave with something you actually made.",
    city: "Johannesburg", area: "Linden",
    category: "events", time: "day", startHour: 13, durationHours: 2,
    price: "R450",
    vibes: ["solo", "friends", "bored"],
    poster: pottery, accent: "lilac", rotation: 1,
  },
  {
    id: "rooftop-pta",
    title: "Rooftop Sunset DJ",
    blurb: "Golden hour, house music, skyline views and a very dangerous cocktail menu.",
    city: "Pretoria", area: "Menlyn Maine",
    category: "nightlife", time: "night", startHour: 18, durationHours: 4,
    price: "R120",
    vibes: ["friends", "visiting", "bored"],
    poster: rooftop, accent: "coral", rotation: -1,
  },
  {
    id: "ramen-cent",
    title: "Ramen & Cocktails",
    blurb: "Steaming tonkotsu and yuzu highballs in a tiny neon-lit booth.",
    city: "Centurion", area: "Wierda Park",
    category: "eats", time: "night", startHour: 19, durationHours: 2,
    price: "R220 pp",
    vibes: ["solo", "friends", "visiting"],
    poster: ramen, accent: "magenta", rotation: 2,
  },
  {
    id: "livemusic-jhb",
    title: "Live Indie Night",
    blurb: "Three local bands, sticky floors, the kind of night you'll talk about Monday.",
    city: "Johannesburg", area: "Braamfontein",
    category: "nightlife", time: "night", startHour: 20, durationHours: 3,
    price: "R100",
    vibes: ["friends", "bored", "visiting"],
    poster: livemusic, accent: "magenta", rotation: -2,
  },
  {
    id: "comedy-pta",
    title: "Open Mic Comedy",
    blurb: "Brave amateurs, two-drink minimum, guaranteed at least one viral moment.",
    city: "Pretoria", area: "Brooklyn",
    category: "nightlife", time: "night", startHour: 20, durationHours: 2,
    price: "R80",
    vibes: ["solo", "friends", "bored"],
    poster: comedy, accent: "lemon", rotation: 1,
  },
  {
    id: "cinema-cent",
    title: "Outdoor Cinema Under the Stars",
    blurb: "Bring a blanket, classic film on a giant inflatable screen, popcorn included.",
    city: "Centurion", area: "Centurion Lake",
    category: "events", time: "night", startHour: 19, durationHours: 3,
    price: "R90",
    vibes: ["solo", "friends", "visiting", "bored"],
    poster: cinema, accent: "sky", rotation: -1,
  },
  {
    id: "techno-jhb",
    title: "Underground Techno",
    blurb: "Warehouse, lasers, bass you feel in your chest. Doors at 11pm, sleep is optional.",
    city: "Johannesburg", area: "Maboneng",
    category: "nightlife", time: "night", startHour: 23, durationHours: 5,
    price: "R200",
    vibes: ["friends", "bored"],
    poster: techno, accent: "magenta", rotation: 2,
  },
];

export const CITIES: City[] = ["Centurion", "Pretoria", "Johannesburg"];
export const VIBES: { id: Vibe; label: string; emoji: string }[] = [
  { id: "solo", label: "Solo", emoji: "🌿" },
  { id: "friends", label: "With Friends", emoji: "🎉" },
  { id: "visiting", label: "Just Visiting", emoji: "🧳" },
  { id: "bored", label: "Just Bored", emoji: "😮‍💨" },
];
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "events", label: "Events" },
  { id: "eats", label: "Eats" },
  { id: "nightlife", label: "Nightlife" },
  { id: "outdoors", label: "Outdoors" },
];
