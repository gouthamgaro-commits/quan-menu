import type { LevelId, Status } from "./catalog";

export type Project = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  features: string[];
  branches: string[];
  category: string;
  level: LevelId;
  difficulty: 1 | 2 | 3 | 4;
  price: number;
  tech: string[];
  includes: string[];
  deliveryDays: number;
  imageUrl: string;
  /** YouTube, Vimeo, Loom, Google Drive, Instagram or a video file. Shown on the project page. */
  demoUrl: string;
  /** A deployed copy students can try. */
  liveUrl: string;
  featured: boolean;
  active: boolean;
  ordersCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/** What the student asked for, kept with the order. */
export type OrderDetails = {
  idea?: string;
  category?: string;
  difficulty?: number;
  budget?: number | null;
  reference?: string;
  addons?: { id: string; name: string; price: number }[];
  notes?: string;
  teamSize?: number;
  /** Catalogue orders: the project's own price when ordered. */
  basePrice?: number;
  /** Listed price (project + extras) when the student made an offer instead. */
  listPrice?: number;
  rushPercent?: number;
};

export type Payment = {
  id: number;
  orderId: number;
  amount: number;
  utr: string;
  method: string;
  status: "submitted" | "verified" | "rejected";
  createdAt: Date;
  decidedAt: Date | null;
  /** Squad orders: which teammate paid (1 is the student who ordered). */
  seat: number | null;
};

export type Order = {
  id: number;
  code: string;
  token: string;
  kind: "catalog" | "custom";
  projectId: number | null;
  projectSlug: string | null;
  title: string;
  details: OrderDetails;
  studentName: string;
  phone: string;
  email: string;
  college: string;
  branch: string;
  year: string;
  status: Status;
  price: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  advancePercent: number;
  deadline: string | null;
  noteForStudent: string;
  adminNotes: string;
  deliveryLink: string;
  createdAt: Date;
  updatedAt: Date;
  /** Sum of verified payments. */
  paid: number;
  /** Sum of payments waiting for the owner to check. */
  pending: number;
  /** The student wrote since the owner last opened the order. */
  unread: boolean;
  /** This order's own referral code, to share with friends. */
  refCode: string;
  /** The order whose code was used on this one. */
  referredBy: number | null;
  /** Taken off the agreed price: a friend's code, referral rewards, or the owner's own discount. */
  discount: number;
};

export type Message = {
  id: number;
  orderId: number;
  sender: "student" | "owner";
  body: string;
  offer: number | null;
  offerStatus: "open" | "accepted" | "declined" | "replaced" | null;
  createdAt: Date;
};

export type Review = {
  id: number;
  orderId: number;
  projectId: number | null;
  rating: number;
  body: string;
  name: string;
  context: string;
  status: "pending" | "approved" | "hidden";
  reply: string;
  createdAt: Date;
  updatedAt: Date;
  /** Filled when listing: the project (or idea) the review is about. */
  title?: string;
  projectSlug?: string | null;
  orderCode?: string;
};

export type SquadMember = {
  id: number;
  orderId: number;
  seat: number;
  name: string;
  token: string;
};

export type ReferralReward = {
  id: number;
  referrerOrderId: number;
  referredOrderId: number;
  amount: number;
  status: "applied" | "owed" | "paid";
  createdAt: Date;
  /** Filled when listing. */
  friendName?: string;
  referrerName?: string;
  referrerCode?: string;
  referredCode?: string;
};
