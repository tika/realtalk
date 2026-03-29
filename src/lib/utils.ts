import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/**
 * Formats elapsed time in milliseconds as a string in the format MM:SS
 *
 * @param elapsedMilliseconds Number of milliseconds passed
 * @returns Formatted time string in the format MM:SS
 */
export const formatElapsedTime = (elapsedMilliseconds: number) => {
  const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};
