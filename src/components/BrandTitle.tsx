import React from "react";

interface BrandTitleProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  titleClassName?: string;
  hideUnderline?: boolean;
}

export function BrandTitle({ title = "A Arte do Bom Grelhado", subtitle, titleClassName = "", hideUnderline = false }: BrandTitleProps) {
  return (
    <div className="relative py-2 max-w-full w-fit mx-auto md:mx-0">
      <h1 
        className={`text-[clamp(1.8rem,5vw,3.75rem)] text-center md:text-left text-[#facc15] tracking-wider leading-tight ${titleClassName}`} 
        style={{ 
          fontFamily: "'Yellowtail', cursive",
          textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
        }}
      >
        {title}
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
