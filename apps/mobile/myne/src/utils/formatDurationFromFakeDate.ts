

export const formatDurationFromMinutes = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes === 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours > 0 ? `${hours}h ` : ""}${minutes > 0 ? `${minutes}m` : ""}`.trim();
};
