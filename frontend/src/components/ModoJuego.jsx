import { useState, useEffect, useCallback } from 'react';
import NivelBatalla from './NivelBatalla';

export default function ModoJuego({ datosJuego, alSalir }) {
    // Si por algún motivo no hay datos, evitamos que crashee
    const niveles = datosJuego?.niveles || [];
    
    // Estados del jugador
    const [nivelHover, setNivelHover] = useState(0); // Dónde está parado el jugador en el mapa
    const [nivelJugando, setNivelJugando] = useState(null); // Nivel dentro del que hemos entrado

    // --- ESCUCHADOR DE TECLADO ARCADE (El núcleo del movimiento) ---
    const handleKeyDown = useCallback((e) => {
        // Si ya estamos dentro de un nivel peleando, el teclado no mueve el mapa
        if (nivelJugando !== null) return; 

        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
            setNivelHover((prev) => Math.min(prev + 1, niveles.length - 1));
        } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
            setNivelHover((prev) => Math.max(prev - 0, 0));
        } else if (e.key === 'Enter') {
            setNivelJugando(niveles[nivelHover]);
        } else if (e.key === 'Escape') {
            alSalir();
        }
    }, [niveles, nivelHover, nivelJugando, alSalir]);

    // Montamos y desmontamos el escuchador para que no haya fugas de memoria
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // --- PANTALLA: DENTRO DE UN NIVEL (FASE 4 - Próximamente) ---
    // --- PANTALLA: DENTRO DE UN NIVEL ---
    if (nivelJugando) {
        return (
            <NivelBatalla 
                nivel={nivelJugando} 
                alHuir={() => setNivelJugando(null)} 
                alCompletar={(idNivel) => {
                    console.log(`¡Nivel ${idNivel} completado con éxito! Aquí sumaremos monedas luego.`);
                    setNivelJugando(null);
                    // Aquí luego añadiremos lógica para desbloquear el siguiente nivel
                }}
            />
        );
    }
    // --- PANTALLA: EL MAPA DEL MUNDO ---
    return (
        <div className="absolute inset-0 z-50 bg-[#12121a] text-white flex flex-col overflow-hidden font-sans select-none">
            {/* GRADIENTE DE FONDO MÁGICO */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-[#12121a] to-[#12121a]"></div>

            {/* CAPA DE UI (HUD) */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 pointer-events-none">
                
                {/* HUD: Controles Arcade (Arriba Izquierda) */}
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

                {/* HUD: Salir (Arriba Derecha) */}
                <button 
                    onClick={alSalir} 
                    className="pointer-events-auto bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 backdrop-blur-md shadow-lg"
                >
                    ❌ Salir del juego
                </button>
            </div>

            {/* EL MAPA CENTRAL (Los Nodos) */}
            <div className="flex-1 flex items-center justify-center relative w-full h-full z-0 overflow-x-auto custom-scrollbar px-20">
                <div className="relative flex items-center gap-24 min-w-max py-32">
                    
                    {/* LA LÍNEA DEL CAMINO (Conecta los nodos por detrás) */}
                    <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-800 rounded-full -translate-y-1/2 -z-10 shadow-inner"></div>

                    {niveles.map((nivel, idx) => {
                        const isHovered = nivelHover === idx;
                        const isBoss = idx === niveles.length - 1;

                        return (
                            <div 
                                key={nivel.id} 
                                className="relative flex flex-col items-center group"
                                onClick={() => setNivelHover(idx)} // Permite hacer clic con ratón también
                            >
                                {/* TEXTO FLOTANTE DEL NIVEL */}
                                <div className={`absolute -top-20 whitespace-nowrap text-center transition-all duration-500 ${isHovered ? 'opacity-100 -translate-y-3' : 'opacity-30 translate-y-0'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-2 ${isHovered ? 'text-indigo-400' : 'text-gray-500'}`}>
                                        Fase {idx + 1}
                                    </span>
                                    <span className={`text-xl font-black tracking-tight ${isHovered ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'text-gray-600'}`}>
                                        {nivel.nombre}
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
                                    
                                    {/* Pulso radial interno si estás encima */}
                                    {isHovered && <div className="absolute inset-0 rounded-full animate-ping bg-white opacity-20"></div>}
                                </div>
                                
                                {/* EL CURSOR DEL JUGADOR */}
                                <div className={`absolute -bottom-16 transition-all duration-500 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-indigo-400 animate-bounce"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* HUD: Multiverso (Abajo Centro) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-8 py-4 rounded-full font-bold backdrop-blur-md transition-all flex items-center gap-3 shadow-2xl">
                    <span className="text-xl">🌍</span> Ver más mundos
                </button>
            </div>
        </div>
    );
}