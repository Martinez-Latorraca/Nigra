import React from 'react';

function AdBanner({
    title = "Protección inteligente.",
    description = "Consigue un collar con tecnología de rastreo y un 20% de descuento usando el código NIGRA20.",
    buttonText = "Explorar",
    link = "https://www.mercadolibre.com.uy/"
}) {
    return (
        <div className="w-full max-w-sm bg-gray-50/50 border border-gray-100 p-8 rounded-[32px] text-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
            {/* Metadata sutil superior */}
            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.25em] mb-4 block">
                Contenido Patrocinado
            </span>

            {/* Título con el punto característico de Nigra. */}
            <h4 className="font-semibold text-gray-900 mb-2 tracking-tight">
                {title}
            </h4>

            {/* Descripción con interlineado Apple-style */}
            <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6 px-2">
                {description}
            </p>

            {/* CTA tipo píldora minimalista */}
            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-black text-white px-8 py-3 rounded-full text-xs font-semibold tracking-wide hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
            >
                {buttonText}
            </a>
        </div>
    );
}

export default AdBanner;