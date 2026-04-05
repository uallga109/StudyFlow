import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const [cuadernos, setCuadernos] = useState({});
    const [nuevoTitulo, setNuevoTitulo] = useState("");
    const navigate = useNavigate();

    useEffect(() => { cargarCuadernos(); }, []);

    const cargarCuadernos = () => {
        fetch("http://127.0.0.1:8000/api/notebooks")
            .then(res => res.json())
            .then(data => setCuadernos(data))
            .catch(err => console.error(err));
    };

    const handleCrearCuaderno = (e) => {
        e.preventDefault();
        if (!nuevoTitulo.trim()) return;

        fetch("http://127.0.0.1:8000/api/notebooks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: nuevoTitulo })
        })
        .then(res => res.json())
        .then(data => navigate(`/notebook/${data.id}`));
    };

    const handleBorrarCuaderno = (e, id) => {
        e.stopPropagation(); // Evita que al hacer clic en borrar, entremos al cuaderno
        if(window.confirm("¿Seguro que quieres borrar esta asignatura y todos sus PDFs?")) {
            fetch(`http://127.0.0.1:8000/api/notebooks/${id}`, { method: 'DELETE' })
                .then(() => cargarCuadernos())
                .catch(err => console.error("Error al borrar:", err));
        }
    };

    return (
        <div className="min-h-screen bg-[#1e1e24] text-gray-200 p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-semibold mb-8">StudyFlow: Mis Cuadernos</h1>
                
                <form onSubmit={handleCrearCuaderno} className="mb-10 flex gap-4">
                    <input 
                        type="text" 
                        value={nuevoTitulo} 
                        onChange={(e) => setNuevoTitulo(e.target.value)} 
                        placeholder="Nueva asignatura..." 
                        className="bg-[#2a2a35] border border-gray-600 rounded-lg px-4 py-3 w-80 focus:outline-none focus:border-blue-500 transition"
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition">
                        + Crear cuaderno
                    </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Object.entries(cuadernos).map(([id, datos]) => (
                        <div key={id} onClick={() => navigate(`/notebook/${id}`)} className="bg-[#2a2a35] border border-transparent hover:border-gray-500 rounded-xl p-6 cursor-pointer transition shadow-sm hover:shadow-md flex flex-col h-40 relative group">
                            
                            <button onClick={(e) => handleBorrarCuaderno(e, id)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1">
                                🗑️
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-blue-500/20 p-2 rounded-full"><span className="text-xl">📘</span></div>
                                <h3 className="text-lg font-medium truncate pr-6">{datos.titulo}</h3>
                            </div>
                            <div className="mt-auto text-sm text-gray-400">
                                <p>{datos.creado.split(' ')[0]} • {datos.fuentes?.length || 0} fuentes</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}