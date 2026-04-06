import { useState, useEffect, useCallback } from 'react';
import NivelBatalla from './NivelBatalla';

export default function ModoJuego({ datosJuego, monedas, alSalir, recargarBD, notebookId }) {
    const niveles = datosJuego?.niveles || [];
    // Leemos el progreso desde la BD (si no existe, empezamos en el nivel 0)
    const nivelDesbloqueado = datosJuego?.nivel_actual || 0; 
    
    // El cursor empieza siempre en el último nivel que tienes desbloqueado
    const [nivelHover, setNivelHover] = useState(nivelDesbloqueado); 
    const [nivelJugando, setNivelJugando] = useState(null); 

    const handleKeyDown = useCallback((e) => {
        if (nivelJugando !== null) return; 

        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
            setNivelHover((prev) => Math.min(prev + 1, niveles.length - 1));
        } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
            setNivelHover((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            // ✅ SEGURIDAD: Solo entras si el nivel NO está bloqueado
            if (nivelHover <= nivelDesbloqueado) {
                setNivelJugando(niveles[nivelHover]);
            }
        } else if (e.key === 'Escape') {
            alSalir();
        }
    }, [niveles, nivelHover, nivelJugando, alSalir, nivelDesbloqueado]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (nivelJugando) {
        return (
            <NivelBatalla 
                nivel={nivelJugando} 
                alHuir={() => setNivelJugando(null)} 
                alCompletar={async (idNivel) => {
                    try {
                        // Llamamos al backend para guardar que hemos pasado el nivel
                        const res = await fetch(`http://127.0.0.1:8000/api/notebooks/${notebookId}/progreso?nivel_id=${idNivel}`, {
                            method: 'POST'
                        });
                        
                        if (res.ok) {
                            // ✅ IMPORTANTE: Recargamos la BD global de la App
                            // Esto hará que el objeto 'datosJuego' se actualice con el nuevo nivel_actual
                            if (recargarBD) await recargarBD();
                            setNivelJugando(null);
                        }
                    } catch (error) {
                        console.error("Error al guardar progreso:", error);
                        setNivelJugando(null);
                    }
                }}
            />
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-[#12121a] text-white flex flex-col overflow-hidden font-sans select-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-[#12121a] to-[#12121a]"></div>

            {/* CAPA DE UI (HUD) */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col gap-3 pointer-events-auto">
                    <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase mb-1">🕹️ Controles</span>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="flex gap-1">
                            <kbd className="bg-white/10 border-b-2 border-white/20 px-2 py-1 rounded text-white font-mono font-bold">A</kbd>
                            <kbd className="bg-white/10 border-b-2 border-white/20 px-2 py-1 rounded text-white font-mono font-bold">D</kbd>
                        </div>
                        <span className="opacity-70">para moverte</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <kbd className="bg-indigo-600 border-b-2 border-indigo-800 px-3 py-1 rounded text-white font-mono font-bold">ENTER</kbd>
                        <span className="opacity-70">para entrar</span>
                    </div>
                </div>

                {/* HUD DERECHO: Monedas y Salir */}
                <div className="flex gap-4 pointer-events-auto">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 px-6 py-3 rounded-xl flex items-center gap-3 backdrop-blur-md shadow-lg">
                        <span className="text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">🪙</span>
                        <span className="font-black text-yellow-500 text-xl">{monedas || 0}</span>
                    </div>
                    <button 
                        onClick={alSalir} 
                        className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 backdrop-blur-md shadow-lg"
                    >
                        ❌ Salir
                    </button>
                </div>
            </div>

            {/* EL MAPA CENTRAL */}
            <div className="flex-1 flex items-center justify-center relative w-full h-full z-0 overflow-x-auto custom-scrollbar px-20">
                <div className="relative flex items-center gap-36 min-w-max py-40">
                    <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-800 rounded-full -translate-y-1/2 -z-10 shadow-inner"></div>

                    {niveles.map((nivel, idx) => {
                        const isHovered = nivelHover === idx;
                        const isBoss = idx === niveles.length - 1;
                        const esImpar = (idx + 1) % 2 !== 0;
                        
                        // ✅ LÓGICA DE BLOQUEO: Si el índice es mayor al nivel desbloqueado, está bloqueado.
                        const isLocked = idx > nivelDesbloqueado;

                        const partesNombre = nivel.nombre.split(':');
                        const prefixMundo = partesNombre[0]; 
                        const tituloNivel = partesNombre.length > 1 ? partesNombre[1].trim() : ''; 

                        return (
                            <div 
                                key={nivel.id} 
                                className={`relative flex flex-col items-center group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() => {
                                    setNivelHover(idx);
                                    if (!isLocked && isHovered) setNivelJugando(nivel);
                                }}
                            >
                                {/* TEXTO FLOTANTE */}
                                <div className={`absolute w-64 text-center transition-all duration-500 left-1/2 -translate-x-1/2 pointer-events-none 
                                    ${esImpar ? 'bottom-full mb-10' : 'top-full mt-16'} 
                                    ${isHovered ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}
                                    ${isLocked ? 'grayscale opacity-20' : ''}`}>
                                    
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 ${isHovered ? 'text-indigo-400' : 'text-gray-500'}`}>
                                        Fase {idx + 1}
                                    </span>
                                    <span className={`block text-xs font-bold uppercase tracking-widest mb-1 ${isHovered ? 'text-indigo-200' : 'text-gray-500'}`}>
                                        {prefixMundo}
                                    </span>
                                    <span className={`block text-2xl font-black tracking-tight leading-tight ${isHovered && !isLocked ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]' : 'text-gray-600'}`}>
                                        {isLocked ? '?????' : (tituloNivel || prefixMundo)}
                                    </span>
                                </div>

                                {/* EL NODO (CÍRCULO) */}
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 border-4 relative ${
                                    isHovered && !isLocked ? 'bg-indigo-600 border-indigo-300 scale-125 shadow-[0_0_40px_rgba(79,70,229,0.6)] z-10' : 
                                    isLocked ? 'bg-[#0a0a0f] border-gray-800 scale-90 opacity-50' :
                                    'bg-[#1e1e24] border-gray-700 scale-100 hover:border-gray-500'
                                }`}>
                                    <span className={`text-3xl transition-transform duration-300 ${isHovered && !isLocked ? 'scale-110' : 'scale-90 opacity-50'}`}>
                                        {isLocked ? '🔒' : isBoss ? '🏰' : '🛡️'}
                                    </span>
                                    
                                    {isHovered && !isLocked && <div className="absolute inset-0 rounded-full animate-ping bg-white opacity-20"></div>}
                                </div>
                                
                                {/* EL CURSOR DEL JUGADOR */}
                                <div className={`absolute -bottom-8 transition-all duration-500 z-20 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    <div className={`w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] animate-bounce ${isLocked ? 'border-b-gray-600' : 'border-b-indigo-400'}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* HUD: Multiverso */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-8 py-4 rounded-full font-bold backdrop-blur-md transition-all flex items-center gap-3 shadow-2xl relative">
                    <span className="text-xl">🌍</span> Ver más mundos
                </button>
            </div>
        </div>
    );
}