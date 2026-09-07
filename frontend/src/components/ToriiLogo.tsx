import React from "react";

interface ToriiGateLogoProps {
  className?: string;
  fill?: string;
}

export function ToriiGateLogo({
  className = "w-6 h-6",
  fill = "currentColor",
}: ToriiGateLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="KamiCode Torii Gate Logo"
    >
      {/* Top Curved Roof Beam (Kasagi) */}
      <path
        d="M 6 22 Q 50 30 94 22 C 96 16.5 93 15 90.5 15 Q 50 21 9.5 15 C 7 15 4 16.5 6 22 Z"
        fill={fill}
      />

      {/* Upper Lintel Beam (Shimaki) */}
      <path
        d="M 12.5 28.5 Q 50 33.5 87.5 28.5 L 86 33.5 Q 50 38 14 33.5 Z"
        fill={fill}
      />

      {/* Vertical Connecting Struts (Gakuzuka / Pillars) */}
      <rect x="33" y="34.5" width="4.5" height="8" rx="0.5" fill={fill} />
      <rect x="47" y="35" width="6" height="7.5" rx="0.5" fill={fill} />
      <rect x="62.5" y="34.5" width="4.5" height="8" rx="0.5" fill={fill} />

      {/* Main Horizontal Tie Beam (Nuki) */}
      <path
        d="M 15 42.5 L 85 42.5 L 85 47.5 L 15 47.5 Z"
        fill={fill}
      />

      {/* Left Wedge Accent */}
      <rect x="18.5" y="38" width="9" height="2.5" rx="0.5" fill={fill} />

      {/* Right Wedge Accent */}
      <rect x="72.5" y="38" width="9" height="2.5" rx="0.5" fill={fill} />

      {/* Left Pillar (Hashira) */}
      <path
        d="M 23.5 29 L 28 29 L 25 87 L 19.5 87 Z"
        fill={fill}
      />

      {/* Right Pillar (Hashira) */}
      <path
        d="M 72 29 L 76.5 29 L 80.5 87 L 75 87 Z"
        fill={fill}
      />

      {/* Left Pillar Base Wrap (Nemaki) Accent */}
      <path
        d="M 19.5 76 L 25.8 76 L 25.4 87 L 19.5 87 Z"
        fill={fill}
        opacity="0.25"
      />
      <rect x="19" y="75" width="7" height="2" rx="0.5" fill={fill} />

      {/* Right Pillar Base Wrap (Nemaki) Accent */}
      <path
        d="M 74.2 76 L 80.5 76 L 80.5 87 L 74.6 87 Z"
        fill={fill}
        opacity="0.25"
      />
      <rect x="74" y="75" width="7" height="2" rx="0.5" fill={fill} />
    </svg>
  );
}

export default ToriiGateLogo;
