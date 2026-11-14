import type { Status } from "./catalog";

export type Project = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  features: string[];
  branches: string[];
  category: string;
  level: "mini" | "major";
  difficulty: 1 | 2 | 3 | 4;
  price: number;
  tech: string[];
  includes: string[];
  deliveryDays: number;
  imageUrl: string;
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
};
