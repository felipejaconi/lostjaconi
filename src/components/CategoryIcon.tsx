import React from 'react';
import { 
  Beef, 
  ChefHat, 
  Package, 
  CupSoda, 
  IceCream, 
  Sparkles,
  ShoppingBag,
  ShoppingBasket,
  UtensilsCrossed,
  Coffee,
  Fish,
  Carrot,
  Leaf,
  Apple,
  Pizza,
  Sandwich,
  Wine
} from 'lucide-react';

interface CategoryIconProps {
  categoryName: string;
  className?: string;
  size?: number;
}

export function CategoryIcon({ categoryName, className = "", size = 24 }: CategoryIconProps) {
  const normalized = categoryName.toLowerCase().trim();
  
  if (normalized.includes("grelha") || normalized.includes("carne") || normalized.includes("beef")) {
    return <Beef className={className} size={size} />;
  }
  if (normalized.includes("cozinha") || normalized.includes("chef") || normalized.includes("preparação")) {
    return <ChefHat className={className} size={size} />;
  }
  if (normalized.includes("embalagem") || normalized.includes("saco") || normalized.includes("caixa")) {
    return <Package className={className} size={size} />;
  }
  if (normalized.includes("bebida") || normalized.includes("sumo") || normalized.includes("refrigerante")) {
    return <CupSoda className={className} size={size} />;
  }
  if (normalized.includes("sobremesa") || normalized.includes("doce") || normalized.includes("gelado")) {
    return <IceCream className={className} size={size} />;
  }
  if (normalized.includes("limpeza") || normalized.includes("higiene") || normalized.includes("detergente")) {
    return <Sparkles className={className} size={size} />;
  }
  if (normalized.includes("peixe") || normalized.includes("marisco")) {
    return <Fish className={className} size={size} />;
  }
  if (normalized.includes("hortifruti") || normalized.includes("hortofruti")) {
    return <Leaf className={className} size={size} />;
  }
  if (normalized.includes("mercearia") || normalized.includes("despensa")) {
    return <ShoppingBasket className={className} size={size} />;
  }
  if (normalized.includes("vegetal") || normalized.includes("legume") || normalized.includes("salada")) {
    return <Carrot className={className} size={size} />;
  }
  if (normalized.includes("fruta")) {
    return <Apple className={className} size={size} />;
  }
  if (normalized.includes("pizza") || normalized.includes("italiana")) {
    return <Pizza className={className} size={size} />;
  }
  if (normalized.includes("sandes") || normalized.includes("pão") || normalized.includes("padaria")) {
    return <Sandwich className={className} size={size} />;
  }
  if (normalized.includes("vinho") || normalized.includes("álcool") || normalized.includes("cerveja")) {
    return <Wine className={className} size={size} />;
  }
  if (normalized.includes("café") || normalized.includes("chá")) {
    return <Coffee className={className} size={size} />;
  }
  if (normalized.includes("restaurante") || normalized.includes("refeição")) {
    return <UtensilsCrossed className={className} size={size} />;
  }

  // Default icon
  return <ShoppingBag className={className} size={size} />;
}
