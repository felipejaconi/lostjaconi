import React, { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
  priority?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  containerClassName = "",
  fallbackIcon,
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-black/20 text-slate-600 ${className} ${containerClassName}`}
      >
        {fallbackIcon || <ImageIcon className="w-1/2 h-1/2 opacity-50" />}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden w-full h-full ${containerClassName}`}>
      {/* Placeholder / Skeleton */}
      {!isLoaded && (
        <div
          className={`absolute inset-0 bg-black/20 animate-pulse ${className}`}
        />
      )}

      <img
        src={src}
        alt={alt || "Imagem"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        {...props}
      />
    </div>
  );
};
