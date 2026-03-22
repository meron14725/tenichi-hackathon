export function formatTime(isoString: string): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getJPDay(date: Date | string): string {
  const d = new Date(date);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[d.getDay()];
}
