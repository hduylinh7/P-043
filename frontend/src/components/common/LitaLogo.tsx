import React from 'react';

interface LitaLogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LitaLogo: React.FC<LitaLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  // Height map based on size
  const heightMap = {
    sm: variant === 'icon' ? 'h-8' : 'h-9',
    md: variant === 'icon' ? 'h-10' : 'h-12',
    lg: variant === 'icon' ? 'h-12' : 'h-16',
  };

  const currentHeight = heightMap[size];

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center transition-transform hover:scale-105 ${currentHeight} ${className}`}>
        <svg
          viewBox="0 0 100 100"
          className="h-full w-auto filter drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Green Badge */}
          <rect x="6" y="10" width="88" height="84" rx="20" fill="#2B6617" />
          <rect x="6" y="6" width="88" height="84" rx="20" fill="#59B335" />
          <rect x="10" y="10" width="80" height="76" rx="16" fill="#469627" />

          {/* Golden 3D Block 'L' */}
          <path d="M22 24 H40 V62 H62 V76 H22 Z" fill="#B85C00" />
          <path d="M20 20 H38 V58 H60 V72 H20 Z" fill="#FFA800" />
          <path d="M20 20 H38 V26 H26 V58 H20 Z" fill="#FFC95C" />

          {/* Creeper Face Accent */}
          <rect x="64" y="24" width="8" height="8" fill="#14360a" />
          <rect x="76" y="24" width="8" height="8" fill="#14360a" />
          <rect x="70" y="32" width="8" height="12" fill="#14360a" />
          <rect x="66" y="38" width="6" height="10" fill="#14360a" />
          <rect x="76" y="38" width="6" height="10" fill="#14360a" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center transition-transform hover:scale-[1.02] ${currentHeight} ${className}`}>
      <svg
        viewBox="0 0 380 180"
        className="h-full w-auto filter drop-shadow-lg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients for LITA (Golden Gold) */}
          <linearGradient id="goldTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF1AD" />
            <stop offset="30%" stopColor="#FFC736" />
            <stop offset="100%" stopColor="#FFA100" />
          </linearGradient>

          <linearGradient id="goldShadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D47A00" />
            <stop offset="100%" stopColor="#9E4D00" />
          </linearGradient>

          {/* Gradients for LEARNING (Diamond Sky Blue) */}
          <linearGradient id="skyTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E0F5FF" />
            <stop offset="35%" stopColor="#7CD5FF" />
            <stop offset="100%" stopColor="#319EE2" />
          </linearGradient>

          <linearGradient id="skyShadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E71A8" />
            <stop offset="100%" stopColor="#114B73" />
          </linearGradient>

          {/* Green Frame Gradient */}
          <linearGradient id="greenFrame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6BCB43" />
            <stop offset="100%" stopColor="#419223" />
          </linearGradient>
        </defs>

        {/* --- 1. GREEN CHUNKY BADGE CONTAINER --- */}
        {/* Dark Green Bottom 3D Shadow Base */}
        <path
          d="M 65 14 C 65 8, 70 4, 78 4 
             H 302 C 310 4, 315 8, 315 14 
             V 84 H 360 C 370 84, 376 90, 376 100 
             V 166 C 376 174, 370 178, 360 178 
             H 20 C 10 178, 4 174, 4 166 
             V 100 C 4 90, 10 84, 20 84 
             H 65 V 14 Z"
          fill="#1C450E"
        />

        {/* Main Green Frame Body */}
        <path
          d="M 65 10 C 65 4, 70 0, 78 0 
             H 302 C 310 0, 315 4, 315 10 
             V 80 H 360 C 370 80, 376 86, 376 96 
             V 158 C 376 166, 370 170, 360 170 
             H 20 C 10 170, 4 166, 4 158 
             V 96 C 4 86, 10 80, 20 80 
             H 65 V 10 Z"
          fill="url(#greenFrame)"
          stroke="#2B6617"
          strokeWidth="5"
        />

        {/* Inner Darker Green Inset Outline */}
        <path
          d="M 72 10 H 308 V 85 H 366 V 162 H 14 V 85 H 72 Z"
          fill="#377A1F"
          opacity="0.4"
        />

        {/* --- 2. TOP WORD: "LITA" (GOLDEN 3D BLOCKY) --- */}
        <g id="LITA_WORD" transform="translate(68, 12)">
          {/* Letter L */}
          <g id="Letter_L">
            <path d="M 12 12 H 36 V 56 H 60 V 74 H 12 Z" fill="url(#goldShadow)" />
            <path d="M 8 6 H 32 V 50 H 56 V 68 H 8 Z" fill="url(#goldTop)" stroke="#B85C00" strokeWidth="2" />
            <path d="M 8 6 H 32 V 12 H 14 V 50 H 8 Z" fill="#FFF8D6" opacity="0.6" />
          </g>

          {/* Letter I */}
          <g id="Letter_I" transform="translate(62, 0)">
            <path d="M 12 12 H 36 V 74 H 12 Z" fill="url(#goldShadow)" />
            <path d="M 8 6 H 32 V 68 H 8 Z" fill="url(#goldTop)" stroke="#B85C00" strokeWidth="2" />
            <path d="M 8 6 H 32 V 12 H 14 V 68 H 8 Z" fill="#FFF8D6" opacity="0.6" />
          </g>

          {/* Letter T */}
          <g id="Letter_T" transform="translate(100, 0)">
            <path d="M 8 12 H 60 V 28 H 44 V 74 H 24 V 28 H 8 Z" fill="url(#goldShadow)" />
            <path d="M 4 6 H 56 V 22 H 40 V 68 H 20 V 22 H 4 Z" fill="url(#goldTop)" stroke="#B85C00" strokeWidth="2" />
            <path d="M 4 6 H 56 V 12 H 10 V 22 H 4 Z" fill="#FFF8D6" opacity="0.6" />
          </g>

          {/* Letter A (With Creeper Cutout) */}
          <g id="Letter_A" transform="translate(162, 0)">
            <path d="M 8 12 H 56 V 74 H 36 V 52 H 28 V 74 H 8 Z" fill="url(#goldShadow)" />
            <path d="M 4 6 H 52 V 68 H 32 V 46 H 24 V 68 H 4 Z" fill="url(#goldTop)" stroke="#B85C00" strokeWidth="2" />
            {/* Creeper Face inside A */}
            <rect x="18" y="20" width="6" height="6" fill="#2B6617" />
            <rect x="32" y="20" width="6" height="6" fill="#2B6617" />
            <rect x="23" y="26" width="10" height="12" fill="#2B6617" />
            <rect x="18" y="32" width="6" height="10" fill="#2B6617" />
            <rect x="32" y="32" width="6" height="10" fill="#2B6617" />
          </g>
        </g>

        {/* --- 3. BOTTOM WORD: "LEARNING" (SKY BLUE 3D PIXELATED) --- */}
        <g id="LEARNING_WORD" transform="translate(16, 92)">
          {/* L */}
          <g transform="translate(0, 0)">
            <path d="M 4 8 H 22 V 44 H 38 V 58 H 4 Z" fill="url(#skyShadow)" />
            <path d="M 0 0 H 18 V 36 H 34 V 50 H 0 Z" fill="url(#skyTop)" stroke="#166193" strokeWidth="2" />
          </g>
          {/* E (With Creeper Pixel Accent) */}
          <g transform="translate(38, 0)">
            <path d="M 4 8 H 38 V 20 H 20 V 28 H 34 V 38 H 20 V 46 H 38 V 58 H 4 Z" fill="url(#skyShadow)" />
            <path d="M 0 0 H 34 V 12 H 16 V 20 H 30 V 30 H 16 V 38 H 34 V 50 H 0 Z" fill="url(#skyTop)" stroke="#166193" strokeWidth="2" />
            <rect x="22" y="4" width="4" height="4" fill="#114B73" />
          </g>
          {/* A */}
          <g transform="translate(80, 0)">
            <path d="M 4 8 H 38 V 58 H 24 V 38 H 18 V 58 H 4 Z" fill="url(#skyShadow)" />
            <path d="M 0 0 H 34 V 50 H 20 V 30 H 14 V 50 H 0 Z" fill="url(#skyTop)" stroke="#166193" strokeWidth="2" />
            <rect x="12" y="10" width="10" height="10" fill="#114B73" />
          </g>
          {/* R */}
          <g transform="translate(122, 0)">
            <path d="M 4 8 H 38 V 32 H 24 V 58 H 4 Z M 24 32 L 38 58 H 24 Z" fill="url(#skyShadow)" />
            <path d="M 0 0 H 34 V 24 H 18 V 50 H 0 Z M 18 24 L 34 50 H 20 Z" fill="url(#skyTop)" stroke="#166193" strokeWidth="2" />
          </g>
          {/* N */}
          <g transform="translate(164, 0)">
            <path d="M 4 8 H 18 L 24 28 V 8 H 38 V 58 H 24 L 18 38 V 58 H 4 Z" fill="url(#skyShadow)" />
            <path d="M 0 0 H 14 L 20 20 V 0 H 34 V 50 H 20 L 14 30 V 50 H 0 Z" fill="url(#skyTop)" stroke="#166193" strokeWidth="2" />
          </g>
          {/* I */}
          <g transform="translate(206, 0)">
            <path d="M 4 8 H 20 V 58 H 4 Z" fill="url(#skyShadow)" />
            <path d="M 0 0 H 16 V 50 H 0 Z" fill="url(#skyTop)" stroke="#166193" strokeWidth="2" />
          </g>
          {/* N */}
          <g transform="translate(230, 0)">
            <path d="M 4 8 H 18 L 24 28 V 8 H 38 V 58 H 24 L 18 38 V 58 H 4 Z" fill="url(#skyShadow)" />
            <path d="M 0 0 H 14 L 20 20 V 0 H 34 V 50 H 20 L 14 30 V 50 H 0 Z" fill="url(#skyTop)" stroke="#166193" strokeWidth="2" />
          </g>
          {/* G */}
          <g transform="translate(272, 0)">
            <path d="M 4 8 H 38 V 20 H 20 V 38 H 38 V 58 H 4 Z" fill="url(#skyShadow)" />
            <path d="M 0 0 H 34 V 12 H 16 V 30 H 34 V 50 H 0 Z" fill="url(#skyTop)" stroke="#166193" strokeWidth="2" />
          </g>
        </g>
      </svg>
    </div>
  );
};
