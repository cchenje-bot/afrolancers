import React, { useState } from 'react';
import { User } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initials = (fallbackLabel || alt || 'AF')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');

    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#075B35] to-[#101010] text-white select-none ${className}`}
        aria-label={alt}
      >
        {initials ? (
          <span className="font-display font-bold tracking-tight text-lg">{initials}</span>
        ) : (
          <User className="w-6 h-6 opacity-80" />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
