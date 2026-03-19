import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import getCroppedImg from '../cropUtils.js';

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

export default function ImageUploader({ onCropComplete, previewUrl, onReset }) {
    const [imgSrc, setImgSrc] = useState('');
    const imgRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState();

    const onSelectFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined);
            const reader = new FileReader();
            reader.addEventListener('load', () => setImgSrc(reader.result.toString() || ''));
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1 / 1));
    };

    const handleConfirmCrop = useCallback(async () => {
        if (!imgRef.current) return;

        let cropToUse = completedCrop;
        if (!cropToUse?.width || !cropToUse?.height) {
            const { width, height } = imgRef.current;
            const size = Math.min(width, height);
            cropToUse = { unit: 'px', x: (width - size) / 2, y: (height - size) / 2, width: size, height: size };
        }

        try {
            const blob = await getCroppedImg(imgRef.current, cropToUse, 'recorte.jpg');
            onCropComplete(blob);
            setImgSrc('');
        } catch (e) {
            console.error(e);
            alert("Error al procesar el recorte.");
        }
    }, [completedCrop, onCropComplete]);

    // VISTA 1: Preview de imagen ya recortada
    if (previewUrl) {
        return (
            <div className="flex flex-col items-center animate-fade-in">
                <div className="relative group">
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-48 h-48 rounded-[32px] object-cover shadow-sm border border-gray-100"
                    />
                </div>
                <button
                    onClick={onReset}
                    className="mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-colors"
                >
                    Reemplazar archivo
                </button>
            </div>
        );
    }

    // VISTA 2: Editor de recorte
    if (imgSrc) {
        return (
            <div className="flex flex-col items-center bg-white p-6 rounded-[40px] border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] animate-fade-in">
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-6">
                    Ajuste de encuadre facial
                </span>

                <div className="rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={1}
                        className="max-w-full max-h-[45vh]"
                    >
                        <img
                            ref={imgRef}
                            alt="Crop tool"
                            src={imgSrc}
                            onLoad={onImageLoad}
                            className="max-w-full max-h-[45vh] transition-opacity duration-500"
                        />
                    </ReactCrop>
                </div>

                <div className="mt-8 w-full flex flex-col items-center gap-4">
                    <button
                        onClick={handleConfirmCrop}
                        className="w-full py-4 bg-black text-white rounded-full font-semibold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
                    >
                        Confirmar selección
                    </button>
                    <button
                        onClick={() => setImgSrc('')}
                        className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        );
    }

    // VISTA 3: Botón inicial de subida
    return (
        <label className="group flex flex-col items-center justify-center w-full h-56 border border-dashed border-gray-200 rounded-[32px] cursor-pointer bg-gray-50/50 hover:bg-white hover:border-gray-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500">
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-black group-hover:text-white transition-all duration-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <p className="text-sm font-semibold tracking-tight text-gray-900 mb-1">Subir fotografía</p>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Formatos JPG o PNG</p>
            </div>
            <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
        </label>
    );
}