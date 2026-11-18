/** Fixed lists the whole app shares: fields of study, project tracks, difficulty, levels, what a project includes. */

/** Fields of study (called "branches" in Indian colleges). Used to filter the catalogue. */
export const BRANCHES = [
  { id: "cse", name: "Computer Science", short: "CS" },
  { id: "it", name: "IT & Software Engineering", short: "IT" },
  { id: "aiml", name: "AI & Data Science", short: "AI & Data" },
  { id: "ece", name: "Electronics (ECE)", short: "ECE" },
  { id: "eee", name: "Electrical (EEE)", short: "EEE" },
  { id: "mech", name: "Mechanical", short: "Mech" },
  { id: "civil", name: "Civil", short: "Civil" },
] as const;
export type BranchId = (typeof BRANCHES)[number]["id"];

/**
 * Project tracks. `factor` is the default price multiplier used for custom ideas
 * (the owner can change every factor in Admin → Settings). `emoji` shows on the student site.
 */
export const CATEGORIES = [
  { id: "web", name: "Web apps & bots", short: "Web", emoji: "🌐", factor: 1 },
  { id: "mobile", name: "Mobile apps", short: "Mobile", emoji: "📱", factor: 1.1 },
  { id: "ai", name: "AI & machine learning", short: "AI / ML", emoji: "🤖", factor: 1.15 },
  { id: "data", name: "Data science & analytics", short: "Data", emoji: "📊", factor: 1 },
  { id: "security", name: "Cybersecurity", short: "Cyber", emoji: "🔐", factor: 1.15 },
  { id: "web3", name: "Blockchain & web3", short: "Web3", emoji: "⛓️", factor: 1.2 },
  { id: "games", name: "Game development", short: "Games", emoji: "🎮", factor: 1.1 },
  { id: "cloud", name: "Cloud & DevOps", short: "Cloud", emoji: "☁️", factor: 1.1 },
  { id: "systems", name: "Systems & core CS", short: "Core CS", emoji: "🧠", factor: 1.15 },
  { id: "iot", name: "IoT, embedded & robotics", short: "IoT", emoji: "🔌", factor: 1.25, hardware: true },
  { id: "electrical", name: "Power, energy & EV", short: "Power & EV", emoji: "⚡", factor: 1.25, hardware: true },
  { id: "vlsi", name: "VLSI, FPGA & signal processing", short: "VLSI", emoji: "💾", factor: 1.2 },
  { id: "design", name: "CAD, simulation & analysis", short: "CAD", emoji: "📐", factor: 1 },
  { id: "fabrication", name: "Mechanical builds", short: "Mech builds", emoji: "🛠️", factor: 1.5, hardware: true },
  { id: "study", name: "Research & lab studies", short: "Research", emoji: "🧪", factor: 1 },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const DIFFICULTIES = [
  { level: 1, name: "Easy", hint: "1–2 features done properly. Great first project or mini project." },
  { level: 2, name: "Medium", hint: "Several features, a database or API, maybe a ready-made ML model." },
  { level: 3, name: "Hard", hint: "Real-time stuff, auth + payments, trained deep-learning models, multi-sensor IoT." },
  { level: 4, name: "Expert", hint: "Research-grade: compilers, distributed systems, LLMs, FPGA or custom hardware." },
] as const;
export type Difficulty = 1 | 2 | 3 | 4;

export const LEVELS = [
  { id: "mini", name: "Mini / course project", short: "mini project" },
  { id: "major", name: "Final-year / capstone", short: "capstone" },
  { id: "portfolio", name: "Portfolio / bootcamp", short: "portfolio" },
] as const;
export type LevelId = (typeof LEVELS)[number]["id"];

export const INCLUDES = {
  code: "Full source code",
  report: "Project report (documentation)",
  ppt: "Presentation slides (PPT)",
  abstract: "Abstract & synopsis",
  video: "Demo video",
  setup: "Setup help on your laptop",
  viva: "Viva / interview questions & answers",
  readme: "README & deployment guide",
  deploy: "Live deployment help",
  kit: "Hardware kit, assembled & tested",
  circuit: "Circuit diagram & component list",
  model: "Working model",
  drawings: "CAD drawings & design files",
  data: "Test results & observations",
} as const;
export type IncludeId = keyof typeof INCLUDES;

export const YEARS = ["School / beginner", "1st–2nd year", "3rd year", "Final year", "Master's / PG", "Bootcamp / self-taught", "Diploma"] as const;

export const STATUSES = {
  requested: { name: "Price to agree", student: "haggling the price 🤝", tone: "amber" },
  quoted: { name: "Waiting for advance", student: "pay the advance to start 💸", tone: "blue" },
  in_progress: { name: "In progress", student: "we're cooking 🧑‍🍳", tone: "violet" },
  ready: { name: "Ready", student: "ready, come see 👀", tone: "teal" },
  delivered: { name: "Delivered", student: "delivered 🎉", tone: "green" },
  cancelled: { name: "Cancelled", student: "cancelled", tone: "gray" },
} as const;
export type Status = keyof typeof STATUSES;
export const STATUS_ORDER: Status[] = ["requested", "quoted", "in_progress", "ready", "delivered", "cancelled"];

export const BUDGETS = [
  { id: "u15", name: "Up to ₹15,000", min: 0, max: 15000 },
  { id: "15-20", name: "₹15,000 – ₹20,000", min: 15001, max: 20000 },
  { id: "20-30", name: "₹20,000 – ₹30,000", min: 20001, max: 30000 },
  { id: "30+", name: "Above ₹30,000", min: 30001, max: 10_000_000 },
] as const;

export function branchName(id: string, short = false) {
  const b = BRANCHES.find((x) => x.id === id);
  return b ? (short ? b.short : b.name) : id;
}
export function categoryName(id: string, short = false) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? (short ? c.short : c.name) : id;
}
export function categoryEmoji(id: string) {
  return CATEGORIES.find((x) => x.id === id)?.emoji ?? "✨";
}
export function difficultyName(level: number) {
  return DIFFICULTIES.find((d) => d.level === level)?.name ?? "Medium";
}
export function levelName(id: string, short = false) {
  const l = LEVELS.find((x) => x.id === id);
  return l ? (short ? l.short : l.name) : id;
}
export function isHardware(category: string) {
  return CATEGORIES.some((c) => c.id === category && "hardware" in c && c.hardware);
}
export function isStatus(s: string): s is Status {
  return s in STATUSES;
}
