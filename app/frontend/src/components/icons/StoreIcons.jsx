import React from 'react';

/**
 * Google Play Store Brand Icon
 */
export function PlayStoreIcon({ size = 14, className = "shrink-0", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      {...props}
    >
      <path fill="#4185F4" d="M37.3 16C26.1 27.6 19.5 45.4 19.5 68.3v375.4c0 22.9 6.6 40.7 17.8 52.3l2.7 2.7L260.6 278v-5.6L40 13.3l-2.7 2.7z"/>
      <path fill="#34A853" d="M340.5 358.2l-79.9-79.9v-5.6l79.9-79.9 2.7 1.5 94.7 53.8c27 15.3 27 40.4 0 55.8l-94.7 53.8-2.7 0.5z"/>
      <path fill="#FFD600" d="M343.2 357.7L260.6 275 40 495.6c8.9 9.5 23.6 10.7 40.4 1.1l262.8-139z"/>
      <path fill="#EA4335" d="M343.2 154.3L80.4 15.3C63.6 5.7 48.9 6.9 40 16.4l220.6 220.6 82.6-82.7z"/>
    </svg>
  );
}

/**
 * Apple Brand Icon (Official Apple Logo)
 */
export function AppleStoreIcon({ size = 14, className = "shrink-0", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.96.99-3.1-.97.04-2.14.65-2.83 1.45-.62.72-1.16 1.88-1.01 3 .08.01.16.02.24.02 1.01 0 2.14-.55 2.61-1.37z" />
    </svg>
  );
}
