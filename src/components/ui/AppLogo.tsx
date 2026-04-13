import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  size?: number;
}

export function AppLogo({ className, size = 32 }: AppLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-2xl"
      >
        {/* Background stylized circle/shape */}
        <rect width="40" height="40" rx="12" fill="url(#logo-gradient)" fillOpacity="0.1" />
        
        {/* Main "D" Symbol */}
        <path
          d="M12 10C12 8.89543 12.8954 8 14 8H20C26.6274 8 32 13.3726 32 20C32 26.6274 26.6274 32 20 32H14C12.8954 32 12 31.1046 12 30V10Z"
          fill="url(#main-gradient)"
        />
        
        {/* Dynamic slash/division line */}
        <rect
          x="18"
          y="12"
          width="4"
          height="16"
          rx="2"
          fill="white"
          fillOpacity="0.8"
          className="animate-pulse"
        />

        <defs>
          <linearGradient
            id="logo-gradient"
            x1="0"
            y1="0"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient
            id="main-gradient"
            x1="12"
            y1="8"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
