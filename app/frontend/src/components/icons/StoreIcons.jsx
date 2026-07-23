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
 * Apple App Store Brand Icon
 */
export function AppleStoreIcon({ size = 14, className = "shrink-0", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      {...props}
    >
      <rect width="512" height="512" rx="112" fill="#0066CC" />
      <path
        fill="#FFFFFF"
        d="M256 110c-8.5 0-16.1 4.9-19.6 12.5L144.1 328.7c-3 6.6-1.8 14.3 3.1 19.7 4.9 5.4 12.4 7.3 19.4 4.9l26.2-9.1h126.4l26.2 9.1c7 2.4 14.5.5 19.4-4.9 4.9-5.4 6.1-13.1 3.1-19.7L275.6 122.5C272.1 114.9 264.5 110 256 110zm-23 150l23-53.7 23 53.7h-46z"
      />
    </svg>
  );
}
