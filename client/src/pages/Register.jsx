import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear la cuenta');
            }

            // Si todo sale bien, lo mandamos al login para que inicie sesión
            alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
            navigate('/login');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pet-light flex flex-col items-center justify-center p-4 font-sans text-pet-dark">

            <div className="w-full max-w-md mb-6 flex justify-between items-center">
                <Link to="/" className="text-pet-primary hover:text-pet-primaryDark font-bold flex items-center gap-2 transition-colors">
                    <span>←</span> Volver al inicio
                </Link>
            </div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8 border-t-8 border-pet-primaryDark">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-pet-primaryDark">Crear Cuenta</h2>
                    <p className="text-gray-500 mt-2">Únete para ayudar a las mascotas a volver a casa</p>
                </div>

                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-pet-dark">Nombre completo</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-gray-50 text-pet-dark rounded-xl border border-gray-300 focus:ring-2 focus:ring-pet-primary outline-none transition-all"
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-pet-dark">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-gray-50 text-pet-dark rounded-xl border border-gray-300 focus:ring-2 focus:ring-pet-primary outline-none transition-all"
                            placeholder="tu@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-pet-dark">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength="6"
                            className="w-full px-4 py-3 bg-gray-50 text-pet-dark rounded-xl border border-gray-300 focus:ring-2 focus:ring-pet-primary outline-none transition-all"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium text-center mt-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-4 bg-pet-primaryDark hover:bg-pet-primary disabled:bg-gray-400 text-white font-bold rounded-xl transition-colors shadow-sm text-lg flex justify-center items-center"
                    >
                        {loading ? 'Creando cuenta...' : 'Registrarme'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="text-pet-primary font-bold hover:underline">
                        Inicia sesión aquí
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Register;