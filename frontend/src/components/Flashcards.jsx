import { useState } from 'react';

export default function Flashcards({ id, datos, fuentesSeleccionadas, setFuentesSeleccionadas, toggleFuente }) {
    // --- Estados Flashcards
    const [flashcards, setFlashcards] = useState([]); // Guarda las tarjetas generadas
    const [numFlashcards, setNumFlashcards] = useState(5); // Selector de cantidad
    const [indiceFlashcard, setIndiceFlashcard] = useState(0); // Tarjeta actual
    const [volteada, setVolteada] = useState(false); // ¿Está mostrando la respuesta?
    const [generandoFlashcards, setGenerandoFlashcards] = useState(false);

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
            console.log("DATOS RECIBIDOS DEL BACKEND:", data); // <--- AÑADE ESTO

            if (data.flashcards) {
                setFlashcards(data.flashcards);
            } else {
                console.error("El backend no mandó la propiedad 'flashcards'", data);
            }
        } catch (error) {
            console.error("Error generando flashcards:", error);
        } finally {
            setGenerandoFlashcards(false);
        }
    };

return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 pb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span>🃏</span> Baraja de Estudio
                </h2>
            </div>

            {/* Controles: Fuentes y Número */}
            <div className="mb-8 p-8 bg-white dark:bg-[#2a2a35] rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-xl transition-colors">
                <div className="flex flex-wrap gap-8 items-start">
                    {/* Selector de Fuentes */}
                    <div className="flex-1 min-w-[250px]">
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

                    {/* Selector de Número y Botón Generar */}
                    <div className="w-full md:w-auto flex flex-col gap-4 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 pt-6 md:pt-0 md:pl-8">
                        <div>
                            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3 font-bold uppercase tracking-wider">2. Cantidad de Tarjetas</label>
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-600 w-max">
                                <button onClick={() => setNumFlashcards(Math.max(1, numFlashcards - 1))} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-transparent rounded-lg text-gray-700 dark:text-white transition shadow-sm dark:shadow-none">-</button>
                                <span className="w-8 text-center font-bold text-xl text-gray-800 dark:text-white">{numFlashcards}</span>
                                <button onClick={() => setNumFlashcards(Math.min(50, numFlashcards + 1))} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-transparent rounded-lg text-gray-700 dark:text-white transition shadow-sm dark:shadow-none">+</button>
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerarFlashcards} 
                            disabled={generandoFlashcards || fuentesSeleccionadas.length === 0} 
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 p-4 mt-2 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 text-white"
                        >
                            {generandoFlashcards ? <><span className="animate-spin">⏳</span> Barajando...</> : '✨ Generar Baraja'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Zona de la Tarjeta Interactiva */}
            {flashcards.length > 0 && (
                <div className="flex flex-col items-center justify-center flex-1">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase bg-blue-50 dark:bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/20 shadow-sm">
                            Tarjeta {indiceFlashcard + 1} de {flashcards.length}
                        </span>
                    </div>
                    
                    {/* Contenedor con perspectiva 3D mejorado */}
                    <div 
                        className="relative w-full max-w-2xl h-80 cursor-pointer group" 
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
                            <div className="absolute inset-0 bg-white dark:bg-[#2a2a35] border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500/50 transition-all rounded-3xl flex flex-col items-center justify-center p-12 text-center" style={{ backfaceVisibility: 'hidden' }}>
                                <span className="text-blue-600 dark:text-blue-500 text-xs font-black mb-6 uppercase tracking-[0.2em] opacity-80">Concepto / Pregunta</span>
                                <h3 className="text-3xl font-bold text-gray-800 dark:text-white leading-tight">{flashcards[indiceFlashcard].anverso}</h3>
                                <div className="absolute bottom-6 flex flex-col items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Haz clic para voltear</span>
                                    <span className="w-6 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                </div>
                            </div>

                            {/* Cara B (Respuesta) */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400/50 rounded-3xl flex flex-col items-center justify-center p-12 text-center shadow-[0_0_40px_rgba(37,99,235,0.2)]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                <span className="text-blue-200 text-xs font-black mb-6 uppercase tracking-[0.2em] opacity-80">Definición / Respuesta</span>
                                <p className="text-2xl text-white font-medium leading-relaxed drop-shadow-md">{flashcards[indiceFlashcard].reverso}</p>
                            </div>
                        </div>
                    </div>

                    {/* Controles de navegación */}
                    <div className="flex items-center gap-6 mt-12">
                        <button 
                            onClick={() => { setIndiceFlashcard(Math.max(0, indiceFlashcard - 1)); setVolteada(false); }}
                            disabled={indiceFlashcard === 0}
                            className="w-14 h-14 flex items-center justify-center bg-white dark:bg-[#2a2a35] text-gray-700 dark:text-white rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all border border-gray-200 dark:border-gray-600 shadow-md"
                            title="Anterior"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        
                        <div className="flex gap-2">
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