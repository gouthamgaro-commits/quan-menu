/** Fixed lists the whole app shares: branches, project domains, difficulty levels, what a project includes. */

export const BRANCHES = [
  { id: "cse", name: "Computer Science (CSE)", short: "CSE" },
  { id: "it", name: "Information Technology (IT)", short: "IT" },
  { id: "aiml", name: "AI & Data Science / AIML", short: "AI & DS" },
  { id: "ece", name: "Electronics & Communication (ECE)", short: "ECE" },
  { id: "eee", name: "Electrical & Electronics (EEE)", short: "EEE" },
  { id: "mech", name: "Mechanical", short: "Mech" },
  { id: "civil", name: "Civil", short: "Civil" },
] as const;
export type BranchId = (typeof BRANCHES)[number]["id"];

/**
 * Project domains. `factor` is the default price multiplier used for custom ideas
 * (the owner can change every factor in Admin → Settings).
 */
export const CATEGORIES = [
  { id: "software", name: "Web & mobile apps", short: "Web & apps", factor: 1 },
  { id: "ai", name: "AI, ML & data science", short: "AI & ML", factor: 1.25 },
  { id: "security", name: "Cyber security & blockchain", short: "Security", factor: 1.3 },
  { id: "iot", name: "IoT, embedded & robotics", short: "IoT & embedded", factor: 1.5, hardware: true },
  { id: "electrical", name: "Power, energy & EV", short: "Power & EV", factor: 1.5, hardware: true },
  { id: "vlsi", name: "VLSI, FPGA & signal processing", short: "VLSI & DSP", factor: 1.35 },
  { id: "design", name: "CAD, simulation & analysis", short: "CAD & analysis", factor: 1.1 },
  { id: "fabrication", name: "Fabrication & working models", short: "Fabrication", factor: 2, hardware: true },
  { id: "study", name: "Experimental & research studies", short: "Research study", factor: 1 },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const DIFFICULTIES = [
  { level: 1, name: "Easy", hint: "1–2 modules: a basic app or a simple circuit. Good for mini projects." },
  { level: 2, name: "Medium", hint: "Several modules, a database or a few sensors, a ready-made ML model." },
  { level: 3, name: "Hard", hint: "Complex logic, a trained deep-learning model, or multi-sensor IoT with a cloud dashboard." },
  { level: 4, name: "Expert", hint: "Research level: new algorithms, LLMs, FPGA or custom hardware." },
] as const;
export type Difficulty = 1 | 2 | 3 | 4;

export const LEVELS = [
  { id: "mini", name: "Mini project" },
  { id: "major", name: "Final-year project" },
] as const;
export type LevelId = (typeof LEVELS)[number]["id"];

export const INCLUDES = {
  code: "Full source code",
  report: "Project report (documentation)",
  ppt: "Presentation slides (PPT)",
  abstract: "Abstract & synopsis",
  video: "Demo video",
  setup: "Setup help on your laptop",
  viva: "Viva questions & answers",
  kit: "Hardware kit, assembled & tested",
  circuit: "Circuit diagram & component list",
  model: "Working model",
  drawings: "CAD drawings & design files",
  data: "Test results & observations",
} as const;
export type IncludeId = keyof typeof INCLUDES;

export const YEARS = ["2nd year", "3rd year", "Final year", "M.Tech / PG", "Diploma"] as const;

export const STATUSES = {
  requested: { name: "Waiting for quote", student: "We're reviewing your idea", tone: "amber" },
  quoted: { name: "Waiting for advance", student: "Pay the advance to start", tone: "blue" },
  in_progress: { name: "In progress", student: "We're building your project", tone: "violet" },
  ready: { name: "Ready", student: "Your project is ready", tone: "teal" },
  delivered: { name: "Delivered", student: "Delivered", tone: "green" },
  cancelled: { name: "Cancelled", student: "Cancelled", tone: "gray" },
} as const;
export type Status = keyof typeof STATUSES;
export const STATUS_ORDER: Status[] = ["requested", "quoted", "in_progress", "ready", "delivered", "cancelled"];

export const BUDGETS = [
  { id: "u3", name: "Under ₹3,000", min: 0, max: 2999 },
  { id: "3-6", name: "₹3,000 – ₹6,000", min: 3000, max: 6000 },
  { id: "6-10", name: "₹6,000 – ₹10,000", min: 6001, max: 10000 },
  { id: "10+", name: "Above ₹10,000", min: 10001, max: 10_000_000 },
] as const;

export function branchName(id: string, short = false) {
  const b = BRANCHES.find((x) => x.id === id);
  return b ? (short ? b.short : b.name) : id;
}
export function categoryName(id: string, short = false) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? (short ? c.short : c.name) : id;
}
export function difficultyName(level: number) {
  return DIFFICULTIES.find((d) => d.level === level)?.name ?? "Medium";
}
export function levelName(id: string) {
  return LEVELS.find((l) => l.id === id)?.name ?? id;
}
export function isHardware(category: string) {
  return CATEGORIES.some((c) => c.id === category && "hardware" in c && c.hardware);
}
export function isStatus(s: string): s is Status {
  return s in STATUSES;
}
