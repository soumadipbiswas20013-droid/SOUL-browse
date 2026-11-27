import React from 'react';

interface SoulLogoProps {
  size?: number;
  accentColor?: string;
  isPrivate?: boolean;
}

export const SoulLogo: React.FC<SoulLogoProps> = ({
  size = 24,
  accentColor = '#4A8DFF',
  isPrivate = false,
}) => {
  const ringSecondary = isPrivate ? '#A855F7' : '#885DFF';
  const coreColor = isPrivate ? '#C084FC' : accentColor;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
      <ellipse
        cx="16"
        cy="16"
        rx="12.5"
        ry="5.5"
        transform="rotate(-30 16 16)"
        stroke={coreColor}
        strokeWidth="2"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="12.5"
        ry="5.5"
        transform="rotate(30 16 16)"
        stroke={ringSecondary}
        strokeWidth="1.75"
        strokeOpacity="0.9"
      />
      <circle cx="16" cy="16" r="3.2" fill={coreColor} />
    </svg>
  );
};
