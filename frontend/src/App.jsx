import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom';

// IMPORTAMOS TUS NUEVOS COMPONENTES
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import Resumenes from './components/Resumenes';
import Quiz from './components/Quiz';
import Flashcards from './components/Flashcards';
import MapaMental from './components/MapaMental';
import ModoJuego from './components/ModoJuego';

// ==========================================
// VISTA PRINCIPAL DEL CUADERNO (El Director de Orquesta)
// ==========================================
function VistaCuaderno() {
    const { id } = useParams();
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [subiendoFichero, setSubiendoFichero] = useState(false);
    
    // Controlador de Vistas
    const [vistaActiva, setVistaActiva] = useState('chat');

    //Estado para el moodal del juego
    const [mostrarModalJuego, setMostrarModalJuego] = useState(false);
    
    // Estado compartido para todas las herramientas
    const [fuentesSeleccionadas, setFuentesSeleccionadas] = useState([]);

    // Tema de la interfaz
    const [temaOscuro, setTemaOscuro] = useState(true);

    // Función para cambiar el tema
    const toggleTema = () => setTemaOscuro(!temaOscuro);

    // Función para marcar/desmarcar PDFs en las distintas herramientas
    const toggleFuente = (fuente) => {
        setFuentesSeleccionadas(prev => 
            prev.includes(fuente) ? prev.filter(f => f !== fuente) : [...prev, fuente]
        );
    };

    const cargarDatosCuaderno = () => {
        fetch(`http://127.0.0.1:8000/api/notebooks/${id}`)
            .then(res => res.json())
            .then(data => { 
                setDatos(data); 
                setCargando(false);
            })
            .catch(err => { console.error(err); setCargando(false); });
    };

    useEffect(() => { cargarDatosCuaderno(); }, [id]);

    const handleSubirArchivo = (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== "application/pdf") return alert("Solo PDFs.");
        setSubiendoFichero(true);
        const formData = new FormData();
        formData.append("file", file);

        fetch(`http://127.0.0.1:8000/api/notebooks/${id}/files`, {
            method: "POST", body: formData
        })
        .then(() => {
            setSubiendoFichero(false);
            cargarDatosCuaderno();
        })
        .catch(err => { console.error(err); setSubiendoFichero(false); });
    };

    const handleBorrarArchivo = (nombreArchivo) => {
        if(window.confirm(`¿Borrar el archivo ${nombreArchivo}?`)) {
            fetch(`http://127.0.0.1:8000/api/notebooks/${id}/files/${nombreArchivo}`, { method: 'DELETE' })
                .then(() => cargarDatosCuaderno());
        }
    };

    if (cargando) return <div className="h-screen bg-[#1e1e24] flex items-center justify-center text-white">Iniciando sistemas...</div>;


    // === MODO JUEGO: INMERSIÓN TOTAL ===
    // Si la vista activa es el juego, bloqueamos las 3 columnas y renderizamos a pantalla completa
    if (vistaActiva === 'juego') {
        return (
            <ModoJuego 
                datosJuego={datos.datos_juego} 
                monedas={datos.monedas}
                alSalir={() => setVistaActiva('chat')}
                recargarBD={cargarDatosCuaderno} 
                notebookId={id}
            />
        );
    }

    // === MODO NORMAL (Tus 3 columnas) ===
    return (
        <div className={`${temaOscuro ? 'dark' : ''} h-screen font-sans flex flex-col overflow-hidden transition-colors duration-300`}>
            {/* Contenedor real con colores de fondo */}
            <div className="flex flex-col h-full bg-gray-50 dark:bg-[#1e1e24] text-gray-800 dark:text-gray-200 transition-colors duration-300">
                
                {/* HEADER PREMIUM */}
                <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e1e24] h-16 flex items-center justify-between px-6 shrink-0 z-10 relative antialiased shadow-sm dark:shadow-none">
                    
                    {/* IZQUIERDA: Volver y Título */}
                    <div className="flex items-center gap-4 w-1/3">
                        <Link to="/" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            ← Volver
                        </Link>
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
                        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate tracking-tight">
                            {datos.titulo}
                        </h1>
                    </div>

                    {/* CENTRO: Navegación Minimalista */}
                    <div className="flex items-center justify-center gap-1 w-1/3 bg-gray-100/80 dark:bg-gray-900/50 p-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50">
                        {[
                            { id: 'chat', label: 'Chat' },
                            { id: 'resumen', label: 'Resúmenes' },
                            { id: 'quiz', label: 'Test' },
                            { id: 'flashcards', label: 'Flashcards' }
                        ].map((tab) => (
                            <button 
                                key={tab.id}
                                onClick={() => setVistaActiva(tab.id)} 
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                    vistaActiva === tab.id 
                                    ? 'bg-white dark:bg-[#2a2a35] text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* DERECHA: Toggle Switch de Tema */}
                    <div className="flex items-center justify-end gap-3 w-1/3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            {temaOscuro ? 'Oscuro' : 'Claro'}
                        </span>
                        <button 
                            onClick={toggleTema} 
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#1e1e24] ${temaOscuro ? 'bg-blue-500' : 'bg-gray-300'}`}
                            title="Alternar tema"
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${temaOscuro ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* COL 1: FUENTES */}
                    <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-[#212128] overflow-y-auto transition-colors">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">📂 Fuentes</h2>
                        <div className="relative mb-4">
                            <input type="file" accept=".pdf" onChange={handleSubirArchivo} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <button className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-transparent hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded text-sm transition text-center flex items-center justify-center text-gray-700 dark:text-gray-200 font-medium shadow-sm dark:shadow-none">
                                {subiendoFichero ? '⏳ Subiendo...' : '+ Añadir PDF'}
                            </button>
                        </div>
                        {datos.fuentes?.map((f, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-sm mb-2 shadow-sm flex items-center justify-between group transition-colors">
                                <span className="truncate flex-1 text-gray-700 dark:text-gray-300">📄 {f}</span>
                                <button onClick={() => handleBorrarArchivo(f)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-1">❌</button>
                            </div>
                        ))}
                    </div>

                    {/* COL 2: VISTA DINÁMICA CENTRAL */}
                    <div className="w-2/4 flex flex-col bg-white dark:bg-[#1e1e24] border-r border-gray-200 dark:border-gray-700 transition-colors">
                        <div className="flex-1 p-6 overflow-y-auto">
                            {vistaActiva === 'chat' && <Chat id={id} />}
                            {vistaActiva === 'resumen' && <Resumenes id={id} datos={datos} fuentesSeleccionadas={fuentesSeleccionadas} setFuentesSeleccionadas={setFuentesSeleccionadas} toggleFuente={toggleFuente} recargarBD={cargarDatosCuaderno} />}
                            {vistaActiva === 'quiz' && <Quiz id={id} datos={datos} fuentesSeleccionadas={fuentesSeleccionadas} setFuentesSeleccionadas={setFuentesSeleccionadas} toggleFuente={toggleFuente} recargarBD={cargarDatosCuaderno} />}
                            {vistaActiva === 'flashcards' && 
                                <Flashcards 
                                    id={id} 
                                    datos={datos} 
                                    fuentesSeleccionadas={fuentesSeleccionadas} 
                                    setFuentesSeleccionadas={setFuentesSeleccionadas} 
                                    toggleFuente={toggleFuente} 
                                    recargarBD={cargarDatosCuaderno} 
                                />
                            }
                            {vistaActiva === 'mapamental' && 
                                <MapaMental 
                                    id={id} 
                                    datos={datos} 
                                    fuentesSeleccionadas={fuentesSeleccionadas} 
                                    setFuentesSeleccionadas={setFuentesSeleccionadas} 
                                    toggleFuente={toggleFuente} 
                                    recargarBD={cargarDatosCuaderno} 
                                />
                            }
                        </div>
                    </div>

                    {/* COL 3: HERRAMIENTAS DIRECTAS */}
                    <div className="w-1/4 bg-gray-50 dark:bg-[#1e1e24] p-6 overflow-y-auto transition-colors">
                        <div className="mb-8">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">🎓 Studio</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setVistaActiva('resumen')} className={`text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${vistaActiva === 'resumen' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                                    <span>📄</span> Resúmenes
                                </button>
                                <button onClick={() => setVistaActiva('quiz')} className={`text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${vistaActiva === 'quiz' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                                    <span>✅</span> Cuestionario
                                </button>
                                <button onClick={() => setVistaActiva('flashcards')} className={`text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${vistaActiva === 'flashcards' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                                    <span>🃏</span> Flashcards
                                </button>
                                <button onClick={() => setVistaActiva('mapamental')} className={`text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${vistaActiva === 'mapamental' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                                    <span>🧠</span> Mapa Mental
                                </button>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button 
                                        onClick={() => {
                                            // Si el juego ya está creado, vamos directo. Si no, mostramos el aviso.
                                            if (datos.juego_creado) {
                                                setVistaActiva('juego');
                                            } else {
                                                setMostrarModalJuego(true);
                                            }
                                        }} 
                                        className={`w-full text-left px-4 py-4 rounded-xl font-bold transition-all flex items-center gap-3 shadow-lg ${vistaActiva === 'juego' ? 'bg-purple-600 text-white ring-2 ring-purple-400/50' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white'}`}
                                    >
                                        <span className="text-xl">🎮</span> Modo Aventura
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* MODAL ÉPICO DEL PUNTO DE NO RETORNO */}
            {mostrarModalJuego && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-gray-700 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                        {/* Decoración de fondo */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        
                        <div className="flex flex-col items-center text-center mt-2">
                            <span className="text-6xl mb-6">⚔️</span>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">El Punto de No Retorno</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                                Estás a punto de forjar el mapa de tu aventura. Si aceptas, la Inteligencia Artificial analizará todos los PDFs actuales para crear los niveles.
                                <br/><br/>
                                <strong className="text-red-500 dark:text-red-400">⚠️ Importante:</strong> Una vez creado el juego, no podrás añadir nuevos apuntes a este mundo.
                            </p>
                            
                            <div className="flex gap-3 w-full mt-2">
                                <button 
                                    onClick={() => setMostrarModalJuego(false)} 
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                >
                                    Aún no
                                </button>
                                <button 
                                    onClick={async () => {
                                        setMostrarModalJuego(false);
                                        // Aquí activaremos una pantalla de carga épica más adelante
                                        try {
                                            const res = await fetch(`http://127.0.0.1:8000/api/notebooks/${id}/juego`, {
                                                method: 'POST'
                                            });
                                            if (res.ok) {
                                                // Recargamos el cuaderno para que React sepa que el juego ya existe
                                                cargarDatosCuaderno();
                                                setVistaActiva('juego');
                                            } else {
                                                alert("Error al forjar el mundo.");
                                            }
                                        } catch (error) {
                                            console.error(error);
                                        }
                                    }} 
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition shadow-lg shadow-purple-500/30"
                                >
                                    ¡Estoy listo!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ROUTER PRINCIPAL
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/notebook/:id" element={<VistaCuaderno />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;