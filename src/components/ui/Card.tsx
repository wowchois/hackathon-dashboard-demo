import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, headerRight, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 ${className}`}>
      {(title || headerRight) && (
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          {title && <h2 className="text-base sm:text-lg font-semibold text-gray-800">{title}</h2>}
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
