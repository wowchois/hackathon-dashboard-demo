type BadgeStatus = 'approved' | 'pending' | 'rejected' | 'submitted' | 'not-submitted';

interface BadgeProps {
  status: BadgeStatus;
}

const config: Record<BadgeStatus, { label: string; className: string }> = {
  approved:      { label: '승인',   className: 'bg-green-100 text-green-700 ring-green-200' },
  pending:       { label: '대기',   className: 'bg-yellow-100 text-yellow-700 ring-yellow-200' },
  rejected:      { label: '거절',   className: 'bg-red-100 text-red-700 ring-red-200' },
  submitted:     { label: '제출완료', className: 'bg-blue-100 text-blue-700 ring-blue-200' },
  'not-submitted': { label: '미제출', className: 'bg-gray-100 text-gray-500 ring-gray-200' },
};

export default function Badge({ status }: BadgeProps) {
  const { label, className } = config[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs sm:text-sm font-medium ring-1 ${className}`}
    >
      {label}
    </span>
  );
}
