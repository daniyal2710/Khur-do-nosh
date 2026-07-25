export function fmtPKR(n) {
  const num = Number(n) || 0;
  return 'Rs ' + num.toLocaleString('en-PK', { maximumFractionDigits: 0 });
}

export function fmtCompact(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export function tierOf(orders) {
  if (orders >= 15) return 'gold';
  if (orders >= 5) return 'silver';
  return 'new';
}

export const tierLabel = { gold: '⭐ Regular', silver: '🥈 Silver', new: '🆕 New' };
export const tierClass = {
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-gray-200 text-gray-700',
  new: 'bg-green-100 text-green-800',
};

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}
