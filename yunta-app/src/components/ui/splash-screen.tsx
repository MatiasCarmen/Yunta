'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Ocultar splash después de 2 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-emerald-50 flex flex-col items-center justify-center z-[300] animate-in fade-in duration-300">
      
      {/* Logo de Yunta con animación bounce */}
      <div className="mb-8 animate-bounce">
        <Image 
          src="/logo-yunta.png" 
          alt="Yunta Logo" 
          width={200} 
          height={200}
          className="drop-shadow-2xl"
          priority
        />
      </div>

      {/* Spinner Simple */}
      <div className="flex items-center gap-2 text-emerald-700 mt-4">
        <Loader2 className="animate-spin" size={24} />
        <span className="font-medium">Cargando...</span>
      </div>

    </div>
  );
}
