import { useState, useEffect, useCallback } from 'react';
import NivelBatalla from './NivelBatalla';

export default function ModoJuego({ datosJuego, alSalir }) {
    const niveles = datosJuego?.niveles || [];
    const [nivelHover, setNivelHover] = useState(0); 
    const [nivelJugando, setNivelJugando] = useState(null); 

    const handleKeyDown = useCallback((e) => {
        if (nivelJugando !== null) return; 

        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
            setNivelHover((prev) => Math.min(prev + 1, niveles.length - 1));
        } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
            setNivelHover((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            setNivelJugando(niveles[nivelHover]);
        } else if (e.key === 'Escape') {
            alSalir();
        }
    }, [niveles, nivelHover, nivelJugando, alSalir]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (nivelJugando) {
        return (
            <NivelBatalla 
                nivel={nivelJugando} 
                alHuir={() => setNivelJugando(null)} 
                alCompletar={(idNivel) => {
                    console.log(`¡Nivel ${idNivel} completado!`);
                    setNivelJugando(null);
                }}
            />
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-[#12121a] text-white flex flex-col overflow-hidden font-sans select-none">
            {/* GRADIENTE DE FONDO MÁGICO */}
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
                        <span className="opacity-70">para entrar al nivel</span>
                    </div>
                </div>

                <button 
                    onClick={alSalir} 
                    className="pointer-events-auto bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 backdrop-blur-md shadow-lg"
                >
                    ❌ Salir del juego
                </button>
            </div>

            {/* EL MAPA CENTRAL (Los Nodos) */}
            <div className="flex-1 flex items-center justify-center relative w-full h-full z-0 overflow-x-auto custom-scrollbar px-20">
                {/* ✅ AMPLIAMOS EL ESPACIO (gap-36 = 144px de separación) y py-40 para que los textos respiren */}
                <div className="relative flex items-center gap-36 min-w-max py-40">
                    
                    {/* LA LÍNEA DEL CAMINO */}
                    <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-800 rounded-full -translate-y-1/2 -z-10 shadow-inner"></div>

                    {niveles.map((nivel, idx) => {
                        const isHovered = nivelHover === idx;
                        const isBoss = idx === niveles.length - 1;
                        const esImpar = (idx + 1) % 2 !== 0;

                        // ✅ DIVIDIMOS EL TEXTO. Si la IA nos da "Mundo 1: El Bosque", separamos por los dos puntos.
                        const partesNombre = nivel.nombre.split(':');
                        const prefixMundo = partesNombre[0]; // Ej: "Mundo 1"
                        const tituloNivel = partesNombre.length > 1 ? partesNombre[1].trim() : ''; // Ej: "El Bosque"

                        return (
                            <div 
                                key={nivel.id} 
                                className="relative flex flex-col items-center group"
                                onClick={() => setNivelHover(idx)}
                            >
                                {/* TEXTO FLOTANTE DEL NIVEL (A dos renglones y más separado) */}
                                <div className={`absolute w-64 text-center transition-all duration-500 left-1/2 -translate-x-1/2 pointer-events-none 
                                    ${esImpar ? 'bottom-full mb-10' : 'top-full mt-16'} 
                                    ${isHovered ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}`}>
                                    
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 ${isHovered ? 'text-indigo-400' : 'text-gray-500'}`}>
                                        Fase {idx + 1}
                                    </span>
                                    <span className={`block text-xs font-bold uppercase tracking-widest mb-1 ${isHovered ? 'text-indigo-200' : 'text-gray-500'}`}>
                                        {prefixMundo}
                                    </span>
                                    <span className={`block text-2xl font-black tracking-tight leading-tight ${isHovered ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]' : 'text-gray-600'}`}>
                                        {tituloNivel || prefixMundo}
                                    </span>
                                </div>

                                {/* EL NODO (CÍRCULO) */}
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 border-4 cursor-pointer relative ${
                                    isHovered 
                                    ? 'bg-indigo-600 border-indigo-300 scale-125 shadow-[0_0_40px_rgba(79,70,229,0.6)] z-10' 
                                    : 'bg-[#1e1e24] border-gray-700 scale-100 hover:border-gray-500'
                                }`}>
                                    <span className={`text-3xl transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-90 grayscale opacity-50'}`}>
                                        {isBoss ? '🏰' : '🛡️'}
                                    </span>
                                    
                                    {isHovered && <div className="absolute inset-0 rounded-full animate-ping bg-white opacity-20"></div>}
                                </div>
                                
                                {/* EL CURSOR DEL JUGADOR (Posicionado justo bajo el nodo, sin pisar el texto par) */}
                                <div className={`absolute -bottom-8 transition-all duration-500 z-20 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-indigo-400 animate-bounce"></div>
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
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                </button>
            </div>
        </div>
    );
}