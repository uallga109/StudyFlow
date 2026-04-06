import { useState, useEffect } from 'react';

export default function Flashcards({ id, datos, fuentesSeleccionadas, setFuentesSeleccionadas, toggleFuente, recargarBD }) {
    // --- Estados Flashcards
    const [flashcards, setFlashcards] = useState([]); // Guarda las tarjetas que estamos viendo ahora
    const [numFlashcards, setNumFlashcards] = useState(5);
    const [indiceFlashcard, setIndiceFlashcard] = useState(0);
    const [volteada, setVolteada] = useState(false);
    const [generandoFlashcards, setGenerandoFlashcards] = useState(false);
    
    // --- Estados de Historial ---
    const [configurandoMazo, setConfigurandoMazo] = useState(false);
    const [mazoActivoIdx, setMazoActivoIdx] = useState(0);

    // Cuando el componente carga o cambian los datos, inicializamos el primer mazo si existe
    useEffect(() => {
        if (datos?.flashcards?.length > 0 && !configurandoMazo) {
            setFlashcards(datos.flashcards[0].tarjetas);
            setMazoActivoIdx(0);
        } else {
            setFlashcards([]);
        }
    }, [datos]);

    const handleGenerarFlashcards = async () => {
        setGenerandoFlashcards(true);
        setFlashcards([]);
        setIndiceFlashcard(0);
        setVolteada(false);

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/notebooks/${id}/flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fuentes: fuentesSeleccionadas,
                    num_tarjetas: parseInt(numFlashcards)
                })
            });
            const data = await res.json();
            
            if (data.tarjetas) {
                // Si todo va bien, recargamos la BD para que el nuevo mazo aparezca en el historial
                if(recargarBD) recargarBD();
                setConfigurandoMazo(false);
            } else {
                console.error("El backend no devolvió las tarjetas correctamente", data);
            }
        } catch (error) {
            console.error("Error generando flashcards:", error);
        } finally {
            setGenerandoFlashcards(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span>🃏</span> Baraja de Estudio
                </h2>
            </div>

            {/* Pestañas de Historial de Mazos */}
            {!generandoFlashcards && datos.flashcards?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 shrink-0 border-b border-gray-200 dark:border-gray-700 mb-6 custom-scrollbar">
                    {datos.flashcards.map((mazo, idx) => (
                        <button 
                            key={mazo.id} 
                            onClick={() => { 
                                setConfigurandoMazo(false); 
                                setMazoActivoIdx(idx); 
                                setIndiceFlashcard(0); 
                                setVolteada(false);
                                setFlashcards(mazo.tarjetas); 
                            }} 
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm transition-all shadow-sm ${!configurandoMazo && mazoActivoIdx === idx ? 'bg-blue-600 text-white font-bold' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-transparent'}`}
                        >
                            Mazo {idx + 1} <span className="text-xs opacity-70 ml-2">({mazo.fecha.split(' ')[0]})</span>
                        </button>
                    ))}
                    <button 
                        onClick={() => { setConfigurandoMazo(true); setFlashcards([]); }} 
                        className="whitespace-nowrap px-4 py-2 rounded-lg text-sm bg-indigo-50 dark:bg-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500 text-indigo-600 dark:text-white border border-indigo-200 dark:border-transparent transition font-bold shadow-md"
                    >
                        + Nueva Baraja
                    </button>
                </div>
            )}

            {/* PANTALLA: CARGANDO */}
            {generandoFlashcards ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <span className="text-6xl animate-pulse mb-4">🃏</span>
                    <p className="text-xl font-bold">Barajando conceptos e ideas...</p>
                    <p className="text-sm mt-2">Creando tus tarjetas de estudio</p>
                </div>
            ) : 
            /* PANTALLA: CONFIGURACIÓN (Si no hay mazos o le dimos a Nuevo) */
            (configurandoMazo || !datos.flashcards?.length) ? (
                <div className="p-8 bg-white dark:bg-[#2a2a35] rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-xl transition-colors max-w-2xl mx-auto w-full mt-4">
                    <div className="flex flex-col gap-6">
                        {/* Selector de Fuentes */}
                        <div>
                            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3 font-bold uppercase tracking-wider">1. Selecciona el temario</label>
                            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {datos.fuentes.map((fuente, idx) => (
                                    <label key={idx} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${fuentesSeleccionadas.includes(fuente) ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={fuentesSeleccionadas.includes(fuente)}
                                            onChange={(e) => {
                                                if (e.target.checked) setFuentesSeleccionadas([...fuentesSeleccionadas, fuente]);
                                                else setFuentesSeleccionadas(fuentesSeleccionadas.filter(f => f !== fuente));
                                            }}
                                            className="w-4 h-4 accent-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{fuente}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Selector de Número */}
                        <div>
                            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3 font-bold uppercase tracking-wider">2. Cantidad de Tarjetas</label>
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-600 w-max">
                                <button onClick={() => setNumFlashcards(Math.max(1, numFlashcards - 1))} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-transparent rounded-lg text-gray-700 dark:text-white transition shadow-sm dark:shadow-none">-</button>
                                <span className="w-8 text-center font-bold text-xl text-gray-800 dark:text-white">{numFlashcards}</span>
                                <button onClick={() => setNumFlashcards(Math.min(50, numFlashcards + 1))} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-transparent rounded-lg text-gray-700 dark:text-white transition shadow-sm dark:shadow-none">+</button>
                            </div>
                        </div>

                        {/* Botón Generar */}
                        <div className="mt-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button 
                                onClick={handleGenerarFlashcards} 
                                disabled={fuentesSeleccionadas.length === 0} 
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 p-4 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 text-white"
                            >
                                ✨ Forjar nueva Baraja
                            </button>
                            {datos.flashcards?.length > 0 && (
                                <button onClick={() => setConfigurandoMazo(false)} className="w-full text-center text-gray-500 text-sm mt-4 hover:text-gray-800 dark:hover:text-white transition">
                                    Cancelar y volver al historial
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : 
            /* PANTALLA: ZONA DE TARJETA INTERACTIVA */
            flashcards.length > 0 && (
                <div className="flex flex-col items-center justify-center flex-1 h-full py-4">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase bg-blue-50 dark:bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/20 shadow-sm">
                            Tarjeta {indiceFlashcard + 1} de {flashcards.length}
                        </span>
                    </div>
                    
                    {/* Contenedor con perspectiva 3D mejorado */}
                    <div 
                        className="relative w-full max-w-2xl h-[22rem] cursor-pointer group shrink-0" 
                        style={{ perspective: '1500px' }}
                        onClick={() => setVolteada(!volteada)}
                    >
                        <div 
                            className="w-full h-full relative duration-700 shadow-xl dark:shadow-2xl" 
                            style={{ 
                                transformStyle: 'preserve-3d', 
                                transform: volteada ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                transitionTimingFunction: 'cubic-bezier(0.4, 0.2, 0.2, 1)'
                            }}
                        >
                            {/* Cara A (Pregunta) */}
                            <div className="absolute inset-0 bg-white dark:bg-[#2a2a35] border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500/50 transition-all rounded-3xl flex flex-col items-center justify-center p-10 text-center" style={{ backfaceVisibility: 'hidden' }}>
                                <span className="text-blue-600 dark:text-blue-500 text-xs font-black mb-6 uppercase tracking-[0.2em] opacity-80">Concepto / Pregunta</span>
                                <h3 className="text-3xl font-bold text-gray-800 dark:text-white leading-tight overflow-y-auto custom-scrollbar px-4">{flashcards[indiceFlashcard]?.anverso}</h3>
                                <div className="absolute bottom-6 flex flex-col items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Haz clic para voltear</span>
                                    <span className="w-6 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                </div>
                            </div>

                            {/* Cara B (Respuesta) */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400/50 rounded-3xl flex flex-col items-center justify-center p-10 text-center shadow-[0_0_40px_rgba(37,99,235,0.2)]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                <span className="text-blue-200 text-xs font-black mb-6 uppercase tracking-[0.2em] opacity-80">Definición / Respuesta</span>
                                <p className="text-2xl text-white font-medium leading-relaxed drop-shadow-md overflow-y-auto custom-scrollbar px-4 w-full">{flashcards[indiceFlashcard]?.reverso}</p>
                            </div>
                        </div>
                    </div>

                    {/* Controles de navegación */}
                    <div className="flex items-center gap-6 mt-10">
                        <button 
                            onClick={() => { setIndiceFlashcard(Math.max(0, indiceFlashcard - 1)); setVolteada(false); }}
                            disabled={indiceFlashcard === 0}
                            className="w-14 h-14 flex items-center justify-center bg-white dark:bg-[#2a2a35] text-gray-700 dark:text-white rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all border border-gray-200 dark:border-gray-600 shadow-md"
                            title="Anterior"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        
                        <div className="flex gap-2 flex-wrap justify-center max-w-[200px]">
                            {flashcards.map((_, i) => (
                                <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === indiceFlashcard ? 'bg-blue-600 dark:bg-blue-500 scale-125 shadow-sm' : 'bg-gray-300 dark:bg-gray-700'}`} />
                            ))}
                        </div>

                        <button 
                            onClick={() => { setIndiceFlashcard(Math.min(flashcards.length - 1, indiceFlashcard + 1)); setVolteada(false); }}
                            disabled={indiceFlashcard === flashcards.length - 1}
                            className="w-14 h-14 flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-blue-500 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all shadow-lg"
                            title="Siguiente"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}