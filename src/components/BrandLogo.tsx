import React from 'react';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'light' }) => {
  const isDarkBg = variant === 'dark';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width="30"
        height="30"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="36"
          height="36"
          rx="8"
          fill={isDarkBg ? '#075B35' : '#075B35'}
        />
        {/* Clean geometric silhouette of the African continent */}
        <path
          d="M14.2 7.5C15.8 7.1 19.6 7.4 21.8 8.6C23.1 9.3 24.4 10.6 24.5 12.1C24.6 13.1 26.8 14.3 27.2 15.6C27.5 16.6 25.9 18.6 25.1 19.9C24.4 21.1 24.1 22.9 23.1 24.7C22.2 26.3 21.1 28.4 19.6 29.1C18.5 29.6 17.5 28.7 17.1 27.6C16.6 26.1 16.8 24.2 16.3 22.7C15.9 21.5 15.3 20.1 14.2 19.4C13.0 18.7 11.2 18.8 10.1 17.8C9.0 16.8 8.7 14.9 9.2 13.4C9.7 11.9 11.2 10.9 12.2 9.6C12.9 8.7 13.3 7.8 14.2 7.5Z"
          fill="#FFFFFF"
        />
        {/* Subtle red accent meridian dot */}
        <circle cx="26.5" cy="26.2" r="2.2" fill="#E52525" />
      </svg>
      <span
        className={`font-display text-base sm:text-lg font-extrabold tracking-tight ${
          isDarkBg ? 'text-white' : 'text-[#141715] dark:text-[#EDF2EE]'
        }`}
      >
        AFRO-LANCERS<span className={isDarkBg ? 'text-[#4ADE80]' : 'text-[#008C45] dark:text-[#34D399]'}>.COM</span>
      </span>
    </span>
  );
};
