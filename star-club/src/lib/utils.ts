import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function calculateLevel(xp: number): number {
  // Each level requires progressively more XP
  // Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, etc.
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 500) return 3;
  if (xp < 850) return 4;
  if (xp < 1300) return 5;
  if (xp < 1900) return 6;
  if (xp < 2600) return 7;
  if (xp < 3500) return 8;
  if (xp < 4600) return 9;
  return 10;
}

export function xpForLevel(level: number): number {
  const thresholds = [0, 0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600];
  return thresholds[level] ?? 4600;
}

export function xpForNextLevel(level: number): number {
  const thresholds = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 999999];
  return thresholds[level] ?? 999999;
}

export function xpProgress(xp: number, level: number): number {
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForNextLevel(level);
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

export const LEVEL_TITLES = [
  "",
  "Rookie",       // Level 1
  "Aspirante",    // Level 2
  "Contendiente", // Level 3
  "Rising Star",  // Level 4
  "Estrella",     // Level 5
  "All-Star",     // Level 6
  "MVP",          // Level 7
  "Élite",        // Level 8
  "Leyenda",      // Level 9
  "Super Star",   // Level 10
];

/** Returns stars string for a given level (1-5 regular, 6-10 gold). */
export function getLevelStars(level: number): string {
  const n = Math.min(Math.max(level, 1), 10);
  if (n <= 5) return "P".repeat(n);
  return "<".repeat(n - 5);
}
