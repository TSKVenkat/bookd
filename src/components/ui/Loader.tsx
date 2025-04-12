'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({ 
  size = 'md', 
  className,
  fullScreen = false,
  text
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const loader = (
    <div className={cn(
      "relative flex items-center justify-center", 
      fullScreen && "min-h-screen",
      className
    )}>
      <div className="flex flex-col items-center">
        <svg 
          className={cn(
            "animate-spin text-blue-600", 
            sizeClasses[size]
          )} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          ></circle>
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {text && (
          <span className="mt-3 text-sm text-gray-600">{text}</span>
        )}
      </div>
    </div>
  );

  return loader;
}; 