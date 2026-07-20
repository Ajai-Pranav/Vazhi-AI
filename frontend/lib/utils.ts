import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getDifficultyClass(difficulty: string): string {
  const d = difficulty.toLowerCase();
  if (d.includes("beginner")) return "diff-beginner";
  if (d.includes("advanced")) return "diff-advanced";
  return "diff-intermediate";
}
