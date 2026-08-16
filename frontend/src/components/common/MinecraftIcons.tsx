import React from 'react';

interface MinecraftIconProps {
  className?: string;
  size?: number;
}

// 3D Grass Block Icon
export const VoxelGrassBlock: React.FC<MinecraftIconProps> = ({ className = '', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-sm ${className}`}
  >
    {/* Top Grass Surface */}
    <path d="M16 2L30 9L16 16L2 9L16 2Z" fill="#59B335" />
    <path d="M16 2L30 9L26 11L12 4L16 2Z" fill="#74CC4B" />
    <path d="M6 7L20 14L16 16L2 9L6 7Z" fill="#469627" />

    {/* Front Dirt Side */}
    <path d="M16 16L30 9V23L16 30V16Z" fill="#8B5A2B" />
    <path d="M16 16L30 9V12L16 19V16Z" fill="#59B335" /> {/* Hanging grass */}
    <path d="M22 18L26 16V19L22 21V18Z" fill="#59B335" />
    <path d="M18 22L22 20V23L18 25V22Z" fill="#653818" />

    {/* Left Dirt Side */}
    <path d="M2 9L16 16V30L2 23V9Z" fill="#653818" />
    <path d="M2 9L16 16V19L2 12V9Z" fill="#469627" /> {/* Hanging grass */}
    <path d="M6 16L10 18V21L6 19V16Z" fill="#469627" />
    <path d="M10 21L14 23V25L10 23V21Z" fill="#4A260F" />
  </svg>
);

// Shiny Emerald Gem
export const VoxelEmerald: React.FC<MinecraftIconProps> = ({ className = '', size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-md ${className}`}
  >
    <path d="M11 3H21L29 11V21L21 29H11L3 21V11L11 3Z" fill="#2B6617" />
    <path d="M12 5H20L27 12V20L20 27H12L5 20V12L12 5Z" fill="#59B335" />
    <path d="M13 7H19L24 12V18L19 23H13L8 18V12L13 7Z" fill="#74CC4B" />
    <path d="M14 9H18L21 12V16L18 19H14L11 16V12L14 9Z" fill="#A8F584" />
    <rect x="15" y="10" width="3" height="3" fill="#FFFFFF" />
  </svg>
);

// Shiny Diamond Gem
export const VoxelDiamond: React.FC<MinecraftIconProps> = ({ className = '', size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-md ${className}`}
  >
    <path d="M11 3H21L29 11V21L21 29H11L3 21V11L11 3Z" fill="#166193" />
    <path d="M12 5H20L27 12V20L20 27H12L5 20V12L12 5Z" fill="#3EA6E9" />
    <path d="M13 7H19L24 12V18L19 23H13L8 18V12L13 7Z" fill="#6CD1FF" />
    <path d="M14 9H18L21 12V16L18 19H14L11 16V12L14 9Z" fill="#C2F0FF" />
    <rect x="15" y="10" width="3" height="3" fill="#FFFFFF" />
  </svg>
);

// Gold Ingot / Cube Icon
export const VoxelGold: React.FC<MinecraftIconProps> = ({ className = '', size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block drop-shadow-md ${className}`}
  >
    <path d="M16 2L30 9L16 16L2 9L16 2Z" fill="#FFD700" />
    <path d="M16 2L30 9L26 11L12 4L16 2Z" fill="#FFF1A8" />
    <path d="M16 16L30 9V23L16 30V16Z" fill="#D68900" />
    <path d="M2 9L16 16V30L2 23V9Z" fill="#B85C00" />
  </svg>
);

// Redstone Dust / Heart Icon for Errors
export const VoxelRedstone: React.FC<MinecraftIconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
  >
    <rect x="4" y="2" width="6" height="4" fill="#E11D48" />
    <rect x="14" y="2" width="6" height="4" fill="#E11D48" />
    <rect x="2" y="6" width="10" height="6" fill="#F43F5E" />
    <rect x="12" y="6" width="10" height="6" fill="#F43F5E" />
    <rect x="4" y="12" width="16" height="4" fill="#E11D48" />
    <rect x="6" y="16" width="12" height="4" fill="#BE123C" />
    <rect x="9" y="20" width="6" height="3" fill="#881337" />
    <rect x="5" y="4" width="2" height="2" fill="#FFFFFF" />
  </svg>
);
