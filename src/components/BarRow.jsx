export default function BarRow({ label, value, valueLabel, max, color = '#f59f00', displayValue }) {
  const pct = max > 0 ? Math.max(6, (value / max) * 100) : 6;
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-xs font-bold w-[150px] flex-shrink-0 text-right text-gray-700 truncate">{label}</div>
      <div className="flex-1 h-[26px] bg-gray-100 rounded-lg overflow-hidden">
        <div
          className="h-full rounded-lg flex items-center pl-2.5 text-[11px] font-extrabold text-white whitespace-nowrap"
          style={{ width: `${pct}%`, background: color }}
        >
          {valueLabel}
        </div>
      </div>
      <div className="text-xs font-extrabold w-[70px] flex-shrink-0">{displayValue ?? value}</div>
    </div>
  );
}
