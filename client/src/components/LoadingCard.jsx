import React, { useState, useEffect } from 'react';
import PetSpinner from './PetSpinner';


export default function AILoadingScreen({
    title = "Protección inteligente.",
    description = "Consigue un collar con tecnología de rastreo y un 20% de descuento usando el código NIGRA20.",
    buttonText = "Explorar",
    link = "https://www.mercadolibre.com.uy/"
}) {
    const [currentIndex, setCurrentIndex] = useState(0);


    // Frases que rotarán automáticamente
    const loadingPhrases = [
        "Iniciando motor de IA...",
        "Analizando rasgos faciales de la mascota...",
        "Extrayendo vectores biométricos...",
        "Buscando coincidencias en la Red Nigra...",
        "Procesando imágenes en alta resolución...",
        "Generando reporte inteligente..."
    ];


    useEffect(() => {
        // Cambiamos la frase cada 3 segundos (3000 ms)
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % loadingPhrases.length);
        }, 3000);

        return () => clearInterval(interval); // Limpiamos el intervalo al desmontar
    }, [loadingPhrases.length]);

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[50vh] gap-12 p-6 bg-white rounded-[40px] shadow-sm border border-gray-50">



            {/* --- SECCIÓN SUPERIOR: CARRUSEL DE CARGA --- */}
            <div className="flex flex-col items-center gap-6 w-full">
                <PetSpinner />


                {/* Contenedor del texto con transición suave */}
                <div className="relative h-6 w-full max-w-xs flex items-center justify-center overflow-hidden">
                    {loadingPhrases.map((phrase, index) => (
                        <p
                            key={index}
                            className={`absolute w-full text-center text-[10px] font-bold uppercase tracking-widest transition-all duration-700 ease-in-out ${index === currentIndex
                                ? 'opacity-100 translate-y-0 text-black'
                                : 'opacity-0 translate-y-4 text-gray-300'
                                }`}
                        >
                            {phrase}
                        </p>
                    ))}
                </div>
            </div>

            {/* --- SECCIÓN INFERIOR: PUBLICIDAD --- */}
            <div className="w-full flex justify-center">
                <div className="w-full max-w-sm bg-gray-50/50 border border-gray-100 p-8 rounded-[32px] text-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.25em] mb-4 block">
                        Contenido Patrocinado
                    </span>
                    <h4 className="font-semibold text-gray-900 mb-2 tracking-tight">
                        {title}
                    </h4>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6 px-2">
                        {description}
                    </p>
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-black text-white px-8 py-3 rounded-full text-xs font-semibold tracking-wide hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
                    >
                        {buttonText}
                    </a>
                </div>
            </div>

        </div>
    );
}