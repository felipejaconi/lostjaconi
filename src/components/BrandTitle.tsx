import React from "react";

interface BrandTitleProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  titleClassName?: string;
  hideUnderline?: boolean;
  titleStyle?: React.CSSProperties;
  showLogo?: boolean;
}

export function BrandTitle({ title = "A Arte do Bom Grelhado", subtitle, titleClassName = "", hideUnderline = false, titleStyle, showLogo = false }: BrandTitleProps) {
  const fallbackLogoUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`;

  return (
    <div className="relative py-2 max-w-full w-fit mx-auto md:mx-0">
      <h1 
        className={`inline-flex items-center justify-center gap-2.5 sm:gap-3 text-[clamp(1.8rem,5vw,3.75rem)] text-center md:text-left text-[#facc15] tracking-wider leading-tight ${titleClassName}`} 
        style={{ 
          fontFamily: "'Yellowtail', cursive",
          textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          ...titleStyle
        }}
      >
        <span>{title}</span>
        {showLogo && (
          <img
            src="/logo.png"
            alt="Logo"
            referrerPolicy="no-referrer"
            onError={(e) => {
              if (e.currentTarget.src !== fallbackLogoUrl) {
                e.currentTarget.src = fallbackLogoUrl;
              }
            }}
            className="h-[1.1em] w-auto object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
          />
        )}
      </h1>
      {subtitle && (
         <p className="text-sm font-medium text-slate-400 mt-2 text-center md:text-left">{subtitle}</p>
      )}
      {!hideUnderline && (
        <svg 
          className="absolute bottom-[-0.25rem] sm:-bottom-2 left-0 w-full h-4 sm:h-6 md:h-8 pointer-events-none" 
          viewBox="0 0 400 30" 
          preserveAspectRatio="none"
        >
          <path 
            d="M 5 15 Q 200 0 395 20" 
            fill="none" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
          <path 
            d="M 40 25 Q 200 10 390 28" 
            fill="none" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
          />
        </svg>
      )}
    </div>
  );
}
