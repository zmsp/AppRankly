import React from 'react';
import { Apple } from 'lucide-react';

export function PlayStoreIcon({ size = 14, className = "shrink-0", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M3.609 1.814C3.218 2.05 3 2.477 3 3.004v17.992c0 .527.218.954.609 1.19l9.49-9.49-9.49-10.692zM14.516 11.089l2.79 2.79-11.697 5.753 8.907-8.543zM14.516 12.911l-8.907-8.543 11.697 5.753-2.79 2.79zM18.807 8.358l3.195 1.917c.527.316.527 1.103 0 1.419l-3.195 1.917-2.393-2.202 2.393-2.202z" />
    </svg>
  );
}

export function AppleStoreIcon({ size = 14, className = "shrink-0", ...props }) {
  return <Apple size={size} className={className} {...props} />;
}
