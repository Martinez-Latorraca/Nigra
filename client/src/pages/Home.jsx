import { Link, useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();

    const handleReportClick = () => {
        const token = localStorage.getItem('petFinderToken');
        if (token) {
            navigate('/reportar');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-gray-900">
            
            {/* Header: El "Nigra." en grande con tracking-tight */}
            <div className="text-center max-w-3xl mb-16 animate-fade-in">
                <h1 className="text-6xl md:text-8xl font-semibold tracking-tighter text-black mb-6">
                    Nigra
                </h1>
                <p className="text-xl md:text-2xl font-medium text-gray-500 max-w-xl mx-auto leading-tight">
                    Reencuentros impulsados por inteligencia artificial y visión computacional.
                </p>
            </div>

            {/* Grid de Acciones: Minimalismo puro */}
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">

                {/* Card Buscar */}
                <Link 
                    to="/buscar" 
                    className="group bg-white p-10 rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col items-start justify-between min-h-[320px] border border-gray-100/50"
                >
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight text-black mb-4 group-hover:text-gray-600 transition-colors">
                            Buscar mascota
                        </h2>
                        <p className="text-gray-500 text-lg leading-relaxed max-w-[280px]">
                            Utiliza nuestro motor de búsqueda visual para identificar coincidencias en tiempo real.
                        </p>
                    </div>
                    <span className="text-sm font-semibold py-3 px-6 bg-gray-100 rounded-full group-hover:bg-black group-hover:text-white transition-all duration-300">
                        Iniciar búsqueda
                    </span>
                </Link>

                {/* Card Reportar */}
                <div
                    onClick={handleReportClick}
                    className="group bg-white p-10 rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col items-start justify-between min-h-[320px] border border-gray-100/50 cursor-pointer"
                >
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight text-black mb-4 group-hover:text-gray-600 transition-colors">
                            Reportar hallazgo
                        </h2>
                        <p className="text-gray-500 text-lg leading-relaxed max-w-[280px]">
                            Publica una mascota encontrada para que nuestra tecnología notifique a su familia.
                        </p>
                    </div>
                    <span className="text-sm font-semibold py-3 px-6 bg-gray-100 rounded-full group-hover:bg-black group-hover:text-white transition-all duration-300">
                        Crear reporte
                    </span>
                </div>

            </div>

            {/* Footer sutil */}
            <div className="mt-20 text-gray-400 text-sm font-medium tracking-widest uppercase">
                Tecnología de Visión • 2026
            </div>
        </div>
    );
}

export default Home;