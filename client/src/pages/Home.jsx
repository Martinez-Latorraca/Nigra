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
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4 block" style={{ color: '#FF5C6C' }}>Comunidad de Vigilancia Animal</span>
                    <h1
                        className="text-7xl md:text-9xl mb-8 leading-none"
                        style={{ fontFamily: "'Nunito', system-ui, sans-serif", fontWeight: 900, color: '#1A1A2E', letterSpacing: '-0.03em' }}
                    >
                        mimo
                    </h1>
                    <p className="text-xl md:text-2xl font-medium text-gray-400 max-w-2xl mx-auto leading-tight mb-12">
                        La primera comunidad civil que utiliza visión computacional para conectar mascotas perdidas con sus familias.
                    </p>
                </div>
            </div>

            {/* --- GRID DE ACCIONES (Bento Style) --- */}
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-6 mb-24">

                {/* 1. Perdí / Encontré (Grande, flujo unificado) */}
                <div onClick={handleReportClick} className="md:col-span-12 group bg-black p-12 rounded-[48px] flex flex-col justify-between min-h-[360px] transition-all duration-500 hover:scale-[1.005] shadow-2xl cursor-pointer">
                    <div className="text-white">
                        <h2 className="text-4xl font-semibold tracking-tight mb-4">Perdí / Encontré.</h2>
                        <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
                            Subí una foto y nuestra IA busca coincidencias al instante. Si no aparece, publicás el reporte en un solo paso.
                        </p>
                    </div>
                    <span className="w-fit text-xs font-bold py-4 px-8 bg-white text-black rounded-full uppercase tracking-widest group-hover:bg-gray-200 transition-colors">
                        Empezar
                    </span>
                </div>

                {/* 2. Explorar (Ancho Completo) */}
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
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-300 mb-8">Mimo Protocol</h3>
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