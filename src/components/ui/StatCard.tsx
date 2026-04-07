import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'indigo' | 'green' | 'yellow' | 'red' | 'blue' | 'purple';
}

const colorMap: Record<StatCardProps['color'], { bg: string; icon: string; text: string }> = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-600' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  text: 'text-green-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', text: 'text-yellow-600' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    text: 'text-red-600' },
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   text: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-600' },
};

export default function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 flex items-center gap-4">
      <div className={`${c.bg} rounded-lg p-3 shrink-0`}>
        <Icon className={`${c.icon} w-5 h-5 sm:w-6 sm:h-6`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 truncate">{title}</p>
        <p className={`text-xl sm:text-2xl font-bold ${c.text} leading-tight`}>{value}</p>
      </div>
    </div>
  );
}
