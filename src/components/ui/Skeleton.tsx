import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '1em', className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded bg-white/10 ${className}`}
          style={{ width, height }}
        />
      ))}
    </>
  );
};
