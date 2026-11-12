import type { VideoMeta } from "../types";
import { remember } from "../lib/store";

export interface Category {
  key: string;
  label: string;
  videos: VideoMeta[];
}

const v = (id: string, title: string, channel: string, extra: Partial<VideoMeta> = {}): VideoMeta => ({
  id,
  title,
  channel,
  ...extra,
});

export const CATEGORIES: Category[] = [
  {
    key: "learn",
    label: "Learn",
    videos: [
      v("h6fcK_fRYaI", "The Egg - A Short Story", "Kurzgesagt – In a Nutshell"),
      v("aircAruvnKk", "But what is a neural network? | Deep learning chapter 1", "3Blue1Brown"),
      v("SrU9YDoXE88", "How To Count Past Infinity", "Vsauce"),
      v("bHIhgxav9LY", "The Biggest Misconception About Electricity", "Veritasium"),
      v("lXfEK8G8CUI", "How The Immune System ACTUALLY Works – IMMUNE", "Kurzgesagt – In a Nutshell"),
      v("nQHBAdShgYI", "Why Teleportation Would Kill You", "CGP Grey"),
      v("spUNpyF58BY", "But what is the Fourier Transform? A visual introduction.", "3Blue1Brown"),
      v("42QuXLucH3Q", "Is Most Published Research Wrong?", "Veritasium"),
      v("DHjqpvDnNGE", "JavaScript in 100 Seconds", "Fireship"),
      v("rfscVS0vtbw", "Learn Python - Full Course for Beginners [Tutorial]", "freeCodeCamp.org"),
      v("YoXxevp1WRQ", "CS50 2020 - Lecture 0 - Scratch", "CS50"),
      v("xoxhDk-hwuo", "Glitter Bomb 1.0 vs Porch Pirates", "Mark Rober"),
    ],
  },
  {
    key: "talks",
    label: "Talks",
    videos: [
      v("iG9CE55wbtY", "Do schools kill creativity? | Sir Ken Robinson | TED", "TED"),
      v("UF8uR6Z6KLc", "Steve Jobs' 2005 Stanford Commencement Address", "Stanford"),
      v("qp0HIF3SfI4", "How Great Leaders Inspire Action | Simon Sinek | TED", "TED"),
      v("X4Qm9cGRub0", "The power of vulnerability | Brené Brown | TEDxHouston", "TEDx Talks"),
      v("Ks-_Mh1QhMc", "Your Body Language May Shape Who You Are | Amy Cuddy | TED", "TED"),
      v("ji5_MqicxSo", "Randy Pausch's Last Lecture: Achieving Your Childhood Dreams", "Carnegie Mellon University"),
      v("wupToqz1e2g", "Carl Sagan - Pale Blue Dot", "carlsagandotcom"),
    ],
  },
  {
    key: "music",
    label: "Music",
    videos: [
      v("fJ9rUzIMcZQ", "Queen – Bohemian Rhapsody (Official Video Remastered)", "Queen Official"),
      v("4NRXx6U8ABQ", "The Weeknd - Blinding Lights (Official Video)", "TheWeekndVEVO"),
      v("dQw4w9WgXcQ", "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)", "Rick Astley"),
      v("hTWKbfoikeg", "Nirvana - Smells Like Teen Spirit (Official Music Video)", "NirvanaVEVO"),
      v("OPf0YbXqDm0", "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars", "MarkRonsonVEVO"),
      v("Zi_XLOBDo_Y", "Michael Jackson - Billie Jean (Official Video)", "michaeljacksonVEVO"),
      v("kXYiU_JCYtU", "Numb (Official Music Video) [4K UPGRADE] – Linkin Park", "Linkin Park"),
      v("YQHsXMglC9A", "Adele - Hello (Official Music Video)", "Adele"),
      v("JGwWNGJdvx8", "Ed Sheeran - Shape of You (Official Music Video)", "Ed Sheeran"),
      v("btPJPFnesV4", "Survivor - Eye Of The Tiger (Official HD Video)", "SurvivorVEVO"),
      v("60ItHLz5WEA", "Alan Walker - Faded", "Alan Walker"),
      v("9bZkp7q19f0", "PSY - GANGNAM STYLE(강남스타일) M/V", "officialpsy"),
    ],
  },
  {
    key: "films",
    label: "Short films",
    videos: [
      v("aqz-KE-bpKQ", "Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film", "Blender"),
      v("eRsGyueVLvQ", "Sintel - Open Movie by Blender Foundation", "Blender"),
      v("R6MlUcmOul8", "Tears of Steel - Blender VFX Open Movie", "Blender"),
      v("kNw8V_Fkw28", "Hair Love | Oscar®-Winning Short Film (Full)", "Sony Pictures Animation"),
      v("Y-rmzh0PI3c", "Cosmos Laundromat - First Cycle. Official Blender Foundation release.", "Blender"),
      v("WhWc3b3KhnY", "Spring - Blender Open Movie", "Blender Studio"),
      v("SkVqJ1SGeL0", "Caminandes 3: Llamigos", "Blender"),
      v("mN0zPOpADL4", "Agent 327: Operation Barbershop", "Blender Studio"),
      v("UXqq0ZvbOnk", "CHARGE - Blender Open Movie", "Blender Studio"),
      v("TLkA0RELQ1g", "Elephants Dream", "Blender"),
    ],
  },
  {
    key: "chill",
    label: "Chill & focus",
    videos: [
      v("5qap5aO4i9A", "lofi hip hop radio - beats to relax/study to", "Lofi Girl", { live: true }),
      v("4xDzrJKXOOY", "synthwave radio 🌌 beats to chill/game to", "Lofi Girl", { live: true }),
      v("DWcJFNfaw9c", "lofi hip hop radio - beats to sleep/chill to", "Lofi Girl", { live: true }),
      v("S_MOd40zlYU", "dark ambient radio 🌃 music to escape/dream to", "Lofi Girl", { live: true }),
      v("lTRiuFIWV54", "1 A.M Study Session 📚 [lofi hip hop]", "Lofi Girl"),
      v("Dx5qFachd3A", "Relaxing Jazz Piano Radio - Slow Jazz Music - 24/7 Live Stream", "Cafe Music BGM channel", {
        live: true,
      }),
      v("M5QY2_8704o", "Lock In and Start Coding — Deep Focus Chillstep", "Chill Music Lab"),
      v("WPni755-Krg", "Study Music Alpha Waves: Relaxing Studying Music, Brain Power, Focus Concentration", "Yellow Brick Cinema"),
    ],
  },
  {
    key: "nature",
    label: "Nature & travel",
    videos: [
      v("LXb3EKWsInQ", "COSTA RICA IN 4K 60fps HDR (ULTRA HD)", "Jacob + Katie Schwarz"),
      v("tO01J-M3g0U", "The World in HDR in 4K (ULTRA HD)", "Jacob + Katie Schwarz"),
      v("Scxs7L0vhZ4", "NORWAY - A Time-Lapse Adventure 4K", "Morten Rustad"),
      v("xDMP3i36naA", "WILDLIFE IN 4K (ULTRA HD) 60fps", "Jacob + Katie Schwarz"),
      v("1La4QzGeaaQ", "Peru 8K HDR 60FPS (FUHD)", "Jacob + Katie Schwarz"),
      v("BHACKCNDMW8", "3 Hours of Amazing Nature Scenery & Relaxing Music for Stress Relief.", "Cat Trumpet"),
    ],
  },
];

/** Round-robin across categories so "All" feels varied. */
function interleave(categories: Category[]): VideoMeta[] {
  const out: VideoMeta[] = [];
  const max = Math.max(...categories.map((c) => c.videos.length));
  for (let i = 0; i < max; i++) {
    for (const c of categories) if (c.videos[i]) out.push(c.videos[i]);
  }
  return out;
}

export const ALL_CURATED: VideoMeta[] = interleave(CATEGORIES);

remember(ALL_CURATED);

export const FEATURED: VideoMeta = ALL_CURATED.find((x) => x.id === "aqz-KE-bpKQ") ?? ALL_CURATED[0];
