import React from 'react';

// Le pasamos props con valores por defecto por si olvidamos enviárselos
function AdBanner({
    title = "¿Tu mascota se escapa mucho?",
    description = "Consigue un collar GPS con 20% de descuento usando el código PETFINDER.",
    buttonText = "Ver Oferta",
    link = "#"
}) {
    return (
        <div className="w-full max-w-sm bg-pet-light/30 border-2 border-dashed border-pet-primary p-6 rounded-2xl text-center shadow-inner">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Espacio Patrocinado
            </span>
            <p className="font-bold text-pet-dark mb-2">{title}</p>
            <p className="text-sm text-gray-600 mb-4">{description}</p>

            {/* Cambié el <button> por un <a> para que funcione como un link real */}
            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-pet-accent text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
            >
                {buttonText}
            </a>
        </div>
    );
}

export default AdBanner;