import { TimeHM, convertMinutesFn } from "./route.types";

/**
 * Converts total minutes into hours and minutes.
 */
export const convertMinutes: convertMinutesFn = (
  totalMinutes: number
): TimeHM => {
  if (totalMinutes < 0) throw new Error("totalMinutes cannot be negative");
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
};