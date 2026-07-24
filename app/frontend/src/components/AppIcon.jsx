import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { PlayStoreIcon, AppleStoreIcon } from './icons/StoreIcons';

export default function AppIcon({ iconUrl, name, platform, className = "w-6 h-6 rounded-md" }) {
  const [failed, setFailed] = useState(false);

  if (iconUrl && !failed) {
    return (
      <img
        src={iconUrl}
        alt={name || "App Icon"}
        onError={() => setFailed(true)}
        className={`${className} object-cover border border-white/10 shrink-0`}
      />
    );
  }

  return (
    <div className={`${className} bg-white/10 flex items-center justify-center text-white/60 shrink-0 border border-white/5`}>
      {platform === 'apple' ? (
        <AppleStoreIcon size={14} />
      ) : platform === 'google' ? (
        <PlayStoreIcon size={14} />
      ) : (
        <Smartphone size={14} />
      )}
    </div>
  );
}
