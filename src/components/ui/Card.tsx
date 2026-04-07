import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 ${className}`}>
      {title && (
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
}
