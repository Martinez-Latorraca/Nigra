import { Link, useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();

    // Función que intercepta el clic en "Reportar"
    const handleReportClick = () => {
        const token = localStorage.getItem('petFinderToken');
        if (token) {
            navigate('/reportar'); // Si está logueado, pasa directo
        } else {
            navigate('/login');    // Si no, al login primero
        }
    };

    return (
        <div className="min-h-screen bg-pet-light flex flex-col items-center justify-center p-4 font-sans text-pet-dark">

            <div className="text-center max-w-2xl mb-12">
                <h1 className="text-5xl md:text-6xl font-extrabold text-pet-primaryDark tracking-tight mb-4">
                    Pet Finder
                </h1>
                <p className="text-xl md:text-2xl text-pet-primary opacity-90">
                    Reuniendo familias con inteligencia artificial
                </p>
                <p className="mt-4 text-gray-600">
                    Usa nuestra tecnología de reconocimiento facial para encontrar a tu mascota o ayudar a una que está perdida a volver a casa.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">

                {/* Card Buscar (Pública) */}
                <Link to="/buscar" className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-pet-primary text-center cursor-pointer flex flex-col items-center justify-center">
                    <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🔍</span>
                    <h2 className="text-2xl font-bold text-pet-primaryDark mb-2">Perdí a mi mascota</h2>
                    <p className="text-gray-600">Busca en nuestra base de datos usando fotos e inteligencia artificial.</p>
                </Link>

                {/* Card Reportar (Protegida por nuestra nueva función) */}
                <div
                    onClick={handleReportClick}
                    className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-pet-accent text-center cursor-pointer flex flex-col items-center justify-center"
                >
                    <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🤝</span>
                    <h2 className="text-2xl font-bold text-pet-accent mb-2">Encontré una mascota</h2>
                    <p className="text-gray-600">Sube una foto y datos de contacto para ayudar a encontrar a su familia.</p>
                </div>

            </div>
        </div>
    );
}

export default Home;