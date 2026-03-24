import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();
    const token = useSelector(state => state.user?.token);

    const handleReportClick = () => {
        token ? navigate('/reportar') : navigate('/login');
    };

    // Data de ejemplo para reencuentros (Esto después vendría de tu DB)
    const successStories = [
        { id: 1, name: "Morocha", days: 3, img: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=500" },
        { id: 2, name: "Rocco", days: 1, img: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=500" },
        { id: 3, name: "Luna", days: 5, img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500" },
    ];

    return (
        <div className="min-h-screen bg-[#F5F5F7] font-sans text-gray-900 pb-20">

            {/* --- HERO SECTION --- */}
            <div className="flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center">
                <div className="animate-fade-in">
                    <span className="text-[10px] font-bold text-pet-primary uppercase tracking-[0.3em] mb-4 block">Red de Vigilancia Animal</span>
                    <h1 className="text-7xl md:text-9xl font-semibold tracking-tighter text-black mb-8">
                        Nigra.
                    </h1>
                    <p className="text-xl md:text-2xl font-medium text-gray-400 max-w-2xl mx-auto leading-tight mb-12">
                        La primera red civil que utiliza visión computacional para conectar mascotas perdidas con sus familias.
                    </p>
                </div>
            </div>

            {/* --- GRID DE ACCIONES (Bento Style) --- */}
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-6 mb-24">

                {/* 1. Buscar (Grande) */}
                <Link to="/buscar" className="md:col-span-8 group bg-black p-12 rounded-[48px] flex flex-col justify-between min-h-[400px] transition-all duration-500 hover:scale-[1.01] shadow-2xl">
                    <div className="text-white">
                        <h2 className="text-4xl font-semibold tracking-tight mb-4">Búsqueda Visual.</h2>
                        <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                            Subí una foto y dejá que nuestra IA analice rasgos biométricos para encontrar coincidencias en segundos.
                        </p>
                    </div>
                    <span className="w-fit text-xs font-bold py-4 px-8 bg-white text-black rounded-full uppercase tracking-widest group-hover:bg-gray-200 transition-colors">
                        Iniciar Escaneo
                    </span>
                </Link>

                {/* 2. Reportar (Pequeño) */}
                <div onClick={handleReportClick} className="md:col-span-4 group bg-white p-10 rounded-[48px] border border-gray-100 flex flex-col justify-between min-h-[400px] cursor-pointer hover:shadow-xl transition-all">
                    <div>
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight mb-2">Reportar.</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">¿Encontraste a alguien? Publicalo ahora.</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 group-hover:text-black uppercase tracking-[0.2em] transition-colors">Crear Alerta →</span>
                </div>

                {/* 3. Explorar (Ancho Completo) */}
                <Link to="/pets" className="md:col-span-12 group bg-white p-10 rounded-[48px] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 hover:shadow-xl transition-all">
                    <div className="flex-1">
                        <h2 className="text-3xl font-semibold tracking-tight mb-2">Explorar Comunidad.</h2>
                        <p className="text-gray-400 text-lg leading-tight">Navegá por la base de datos completa de reportes activos en tu zona.</p>
                    </div>

                    {/* Stack de Mascotas */}
                    <div className="flex -space-x-5">
                        {[
                            "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=150&h=150&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=150&h=150&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=150&h=150&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1472491235688-bdc81a63246e?q=80&w=150&h=150&auto=format&fit=crop"
                        ].map((url, i) => (
                            <div key={i} className="w-16 h-16 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-lg transition-transform group-hover:translate-y-[-5px]" style={{ transitionDelay: `${i * 50}ms` }}>
                                <img src={url} alt="pet avatar" className="w-full h-full object-cover" />
                            </div>
                        ))}
                        <div className="w-16 h-16 rounded-full border-4 border-white bg-black flex items-center justify-center text-white text-[10px] font-bold shadow-lg">
                            +150
                        </div>
                    </div>
                </Link>
            </div>

            {/* --- SECCIÓN REENCUENTROS --- */}
            <div className="max-w-7xl mx-auto px-6 mb-32">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                    <div>
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-[0.3em] mb-2 block">Historias con final feliz</span>
                        <h2 className="text-5xl font-semibold tracking-tighter text-black">Reencuentros exitosos.</h2>
                    </div>
                    <p className="text-gray-400 max-w-xs text-sm font-medium">Nuestra tecnología ha ayudado a cientos de familias a volver a estar juntas.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {successStories.map(story => (
                        <div key={story.id} className="group relative rounded-[40px] overflow-hidden aspect-[3/4] bg-gray-200">
                            <img src={story.img} alt={story.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
                                <h4 className="text-2xl font-bold mb-1">{story.name}</h4>
                                <p className="text-sm text-gray-300 font-medium tracking-wide">Reencontrado en {story.days} {story.days === 1 ? 'día' : 'días'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- FOOTER / DESCRIPCIÓN --- */}
            <div className="max-w-4xl mx-auto px-6 text-center border-t border-gray-200 pt-20">
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-300 mb-8">Nigra Protocol</h3>
                <div className="grid md:grid-cols-3 gap-12 text-left">
                    <div>
                        <h4 className="font-bold text-black mb-2 uppercase text-[10px] tracking-widest">01. Registro</h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium">Cargamos la imagen en nuestra red neuronal para extraer puntos de interés biométricos únicos.</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-black mb-2 uppercase text-[10px] tracking-widest">02. Análisis</h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium">Comparamos el vector de la imagen con miles de reportes usando pgvector y cálculos de distancia geográfica.</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-black mb-2 uppercase text-[10px] tracking-widest">03. Conexión</h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium">Si hay match, habilitamos un canal de chat anónimo para coordinar el reencuentro de forma segura.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;