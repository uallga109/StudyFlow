import { useState } from 'react';

export default function MapaMental({ id, datos, fuentesSeleccionadas, setFuentesSeleccionadas, toggleFuente }) {
    // --- Estados mapa mental ---
    const [mapaMental, setMapaMental] = useState(null);
    const [generandoMapa, setGenerandoMapa] = useState(false);

    // --- Función para generar el Mapa Mental ---
    const handleGenerarMapa = async () => {
        // Si el usuario no ha marcado nada, no hacemos nada
        if (fuentesSeleccionadas.length === 0) {
            alert("⚠️ Por favor, selecciona al menos una fuente para construir el mapa mental.");
            return;
        }

        setGenerandoMapa(true);
        setMapaMental(null);

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/notebooks/${id}/mapa-mental`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Pasamos solo las fuentes que el usuario ha marcado
                    fuentes: fuentesSeleccionadas
                })
            });
            
            const data = await res.json();
            // Si el JSON viene con la estructura correcta, lo guardamos
            if (data.tema_principal) {
                setMapaMental(data);
            }
        } catch (error) {
            console.error("Error mapa mental:", error);
        } finally {
            setGenerandoMapa(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e24] p-6 rounded-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4 shrink-0">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span>🧠</span> Mapa Mental / Guía de Estudio
                </h2>
                {mapaMental && !generandoMapa && (
                    <button 
                        onClick={() => { setMapaMental(null); setFuentesSeleccionadas([]); }} 
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition"
                    >
                        ← Crear otro mapa
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* ESTADO 1: CONFIGURACIÓN - SELECTOR DE FUENTES */}
                {!mapaMental && !generandoMapa && (
                    <div className="bg-[#2a2a35] p-10 rounded-3xl border border-gray-700 shadow-2xl max-w-lg mx-auto w-full mt-10">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                            <span className="text-2xl">🗺️</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white">Configurar Nuevo Mapa</h2>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Selecciona las fuentes que quieres conectar en el esquema jerárquico. La IA analizará cómo se relacionan los conceptos.</p>
                        
                        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar border-y border-gray-700 py-3">
                            {datos.fuentes.map((f, i) => (
                                <label key={i} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${fuentesSeleccionadas.includes(f) ? 'border-indigo-500 bg-indigo-500/10 shadow-md' : 'border-gray-600 bg-gray-800 hover:border-gray-500'}`}>
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 accent-indigo-500 rounded border-gray-600 bg-gray-900 focus:ring-indigo-500" 
                                        checked={fuentesSeleccionadas.includes(f)} 
                                        // Reutilizamos la función toggleFuente
                                        onChange={() => toggleFuente(f)} 
                                    />
                                    <span className="text-sm font-medium text-gray-200 truncate">{f}</span>
                                </label>
                            ))}
                        </div>

                        <button 
                            onClick={handleGenerarMapa} 
                            disabled={generandoMapa || fuentesSeleccionadas.length === 0}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-400 p-4 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 text-white"
                        >
                            {generandoMapa ? (
                                <><span className="animate-spin">⏳</span> Barajando...</>
                            ) : "✨ Construir Esquema Jerárquico"}
                        </button>
                    </div>
                )}

                {/* ESTADO 2: CARGANDO */}
                {generandoMapa && (
                    <div className="flex flex-col items-center justify-center h-64 text-center mt-20">
                        <div className="relative mb-6">
                            <span className="text-6xl block animate-bounce">🧠</span>
                            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                        </div>
                        <p className="text-xl font-bold text-white">Analizando jerarquías...</p>
                        <p className="text-gray-400 text-sm mt-2 max-w-sm">Estamos procesando {fuentesSeleccionadas.length} fuentes para conectar los conceptos principales.</p>
                    </div>
                )}

                {/* ESTADO 3: EL MAPA (Esquema tipo Acordeón interactivo) */}
                {mapaMental && !generandoMapa && (
                    <div className="max-w-3xl mx-auto w-full animate-fade-in pb-10">
                        <div className="mb-10 text-center">
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 block">Guía de Estudio</span>
                            <h1 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
                                {mapaMental.tema_principal}
                            </h1>
                            <p className="text-lg text-gray-300 bg-[#2a2a35] p-6 rounded-2xl border border-gray-700 leading-relaxed shadow-inner italic">
                                "{mapaMental.resumen_global}"
                            </p>
                        </div>

                        <div className="space-y-6">
                            {mapaMental.ramas.map((rama, idx) => (
                                <details key={idx} className="group bg-[#2a2a35] border border-gray-700 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-gray-600 [&_summary::-webkit-details-marker]:hidden">
                                    <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-700/30 transition-colors list-none">
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/30 shadow-sm shrink-0">
                                                {idx + 1}
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-100">{rama.concepto}</h3>
                                        </div>
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-500 group-open:rotate-180 transition-transform duration-300">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </summary>
                                    
                                    <div className="px-8 pb-8 pt-2 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-gray-700/50 bg-[#1e1e24]/50">
                                        <p className="text-gray-300 mb-6 text-lg leading-relaxed border-l-4 border-indigo-500/50 pl-6 py-1">
                                            {rama.explicacion}
                                        </p>
                                        
                                        {rama.sub_ramas && rama.sub_ramas.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                {rama.sub_ramas.map((sub, subIdx) => (
                                                    <div key={subIdx} className="flex items-center gap-3 bg-[#1e1e24] p-3 rounded-xl border border-gray-700/50 group/item hover:border-indigo-500/30 transition-colors">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500 group-hover/item:scale-125 transition-transform"></span>
                                                        <p className="text-sm text-gray-400 font-semibold">{sub}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}