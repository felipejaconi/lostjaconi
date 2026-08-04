import React from "react";
import { Link } from "react-router-dom";

interface LogoProps {
  size?: number | string;
  className?: string;
  imgStyle?: React.CSSProperties;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className = "", imgStyle }) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <img 
        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/uploads/icon.png`} 
        alt="Lost Wind Lda" 
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        style={imgStyle}
      />
    </div>
  );
};

export const LoginLogo: React.FC<LogoProps> = ({
  size = 240,
  className = "",
}) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <img 
        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/uploads/icon.png`} 
        alt="Lost Wind Lda" 
        className="w-full h-full object-contain drop-shadow-2xl"
        crossOrigin="anonymous"
      />
    </div>
  );
};

export const BrandName: React.FC<{
  className?: string;
}> = ({ className = "" }) => (
  <Link
    to="/"
    className={`flex items-center justify-center gap-2 sm:gap-3 ${className}`}
  >
    <Logo 
      size="1.8em" 
      className="drop-shadow-lg flex-shrink-0" 
    />
    <div
      className="flex flex-col items-center justify-center leading-none"
      style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
    >
      <span
        className="text-white tracking-tight"
        style={{
          fontSize: "0.8em",
          textShadow: "0px 4px 4px rgba(0,0,0,0.5), 0px 2px 0px rgba(0,0,0,0.2)",
          WebkitTextStroke: "1px rgba(0,0,0,0.1)",
        }}
      >
        GRUPO
      </span>
      <span
        className="tracking-tighter notranslate"
        translate="no"
        style={{
          fontSize: "1.1em",
          color: "#FFD700",
          background: "linear-gradient(to bottom, #FFE53B, #FFB300)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter:
            "drop-shadow(0px 4px 4px rgba(0,0,0,0.5)) drop-shadow(0px 2px 0px rgba(0,0,0,0.3))",
          marginTop: "-0.1em",
        }}
      >
        LOST WIND
      </span>
    </div>
  </Link>
);
