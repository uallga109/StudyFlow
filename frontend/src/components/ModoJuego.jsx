import { useState, useEffect, useCallback } from 'react';
import NivelBatalla from './NivelBatalla';
import { estilosBiomas } from './estilosBiomas'; // Ajusta la ruta si es necesario

// 🗺️ EL MULTIVERSO (Nuestras 12 obras maestras)
const mapasPrefabricados = [
    { id: "mapa_01_clasico", nombre: "El Camino Clásico", biomas: ["valle", "desierto", "puente", "pantano", "cumbre", "ciudadela"] },
    { id: "mapa_02_locura", nombre: "El Descenso a la Locura", biomas: ["costa", "valle", "pantano", "cementerio", "cavernas", "ciudadela"] },
    { id: "mapa_03_cielos", nombre: "La Ruta de los Cielos", biomas: ["valle", "costa", "desierto", "cumbre", "archipielago", "ciudadela"] },
    { id: "mapa_04_subterraneo", nombre: "El Viaje Subterráneo", biomas: ["pantano", "cavernas", "puente", "desierto", "cementerio", "ciudadela"] },
    { id: "mapa_05_helado", nombre: "La Travesía Helada", biomas: ["costa", "valle", "cavernas", "archipielago", "cumbre", "ciudadela"] },
    { id: "mapa_06_oscuro", nombre: "El Continente Oscuro", biomas: ["desierto", "pantano", "cementerio", "cavernas", "puente", "ciudadela"] },
    { id: "mapa_07_volcan", nombre: "La Escalada del Volcán", biomas: ["valle", "pantano", "cavernas", "puente", "cumbre", "ciudadela"] },
    { id: "mapa_08_archipielago", nombre: "El Archipiélago Perdido", biomas: ["costa", "pantano", "desierto", "cavernas", "archipielago", "ciudadela"] },
    { id: "mapa_09_devastadas", nombre: "Las Tierras Devastadas", biomas: ["cementerio", "desierto", "puente", "pantano", "cavernas", "ciudadela"] },
    { id: "mapa_10_peregrino", nombre: "El Camino del Peregrino", biomas: ["valle", "cavernas", "archipielago", "cumbre", "cementerio", "ciudadela"] },
    { id: "mapa_11_estelar", nombre: "La Invasión Estelar", biomas: ["costa", "desierto", "archipielago", "pantano", "puente", "ciudadela"] },
    { id: "mapa_12_hardcore", nombre: "El Reto Definitivo", biomas: ["cementerio", "puente", "cavernas", "cumbre", "archipielago", "ciudadela"] }
];

// 🏰 LOS NOMBRES ÉPICOS DE LOS NIVELES
const nombresBiomas = {
    "valle": "La Arboleda del Letargo",
    "desierto": "Las Ruinas del Rey Sol",
    "costa": "La Costa Quebrada",
    "pantano": "La Ciénaga de las Sombras",
    "cavernas": "El Abismo Luminiscente",
    "cementerio": "Tierras Baldías",
    "cumbre": "El Trono Helado",
    "archipielago": "Los Santuarios del Éter",
    "puente": "El Umbral de Cenizas",
    "ciudadela": "La Ciudadela Cósmica"
};

// 📖 EL BESTIARIO ÉPICO
const enemigosPorBioma = {
    "valle": "Grim, el Saqueador de Ecos",
    "desierto": "Ramsés, el Guardián de Arena",
    "costa": "El Rey Ahogado",
    "pantano": "La Dama de la Bruma Eterna",
    "cavernas": "El Espectro de Cuarzo",
    "cementerio": "Sir Alaric, el Verdugo del Purgatorio",
    "cumbre": "Yimir, el Tirano del Glaciar",
    "archipielago": "Aurelius, el Señor de los Cielos",
    "puente": "Ignis, el Quebrantador",
    "ciudadela": "Hechicero del Caos Estelar"
};

export default function ModoJuego({ datosJuego, monedas, alSalir, recargarBD, notebookId }) {
    const niveles = datosJuego?.niveles || [];
    
    const mapaId = datosJuego?.mapa_id || "mapa_01_clasico"; 
    const mapaActual = mapasPrefabricados.find(m => m.id === mapaId) || mapasPrefabricados[0];

    const nivelDesbloqueado = datosJuego?.nivel_actual || 0; 
    
    const [nivelHover, setNivelHover] = useState(nivelDesbloqueado > 5 ? 5 : nivelDesbloqueado); 
    const [nivelJugando, setNivelJugando] = useState(null); 
    const [transicion, setTransicion] = useState(null);

    const handleKeyDown = useCallback((e) => {
        if (nivelJugando !== null || transicion !== null) return; 

        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
            setNivelHover((prev) => Math.min(prev + 1, niveles.length - 1));
        } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
            setNivelHover((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            if (nivelHover <= nivelDesbloqueado) {
                const biomaElegido = mapaActual.biomas[nivelHover];
                setTransicion({ 
                    fase: 'intro', 
                    bioma: biomaElegido, 
                    dataNivel: niveles[nivelHover],
                    esBoss: nivelHover === 5 
                });
            }
        } else if (e.key === 'Escape') {
            alSalir();
        }
    }, [niveles, nivelHover, nivelJugando, transicion, alSalir, nivelDesbloqueado, mapaActual]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // ==========================================
    // 🎬 PANTALLA 1: INTRODUCCIÓN DEL ENEMIGO
    // ==========================================
    if (transicion?.fase === 'intro') {
        // Obtenemos los colores dinámicos del bioma actual (por defecto 'valle')
        const estilo = estilosBiomas[transicion.bioma] || estilosBiomas['valle'];

        return (
            <div className="absolute inset-0 z-50 bg-[#0a0a0f] flex flex-col font-sans select-none animate-fade-in overflow-hidden">
                {/* IMAGEN DE FONDO */}
                <img 
                    src={`/assets/enemigos/${transicion.bioma}_activo.png`} 
                    alt={`Enemigo de ${transicion.bioma}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-stone-950'); }}
                />

                {/* 🎞️ BANDAS CINEMÁTICAS (Letterbox ajustado a ~1.5cm) */}
                <div className="absolute top-0 left-0 w-full h-10 md:h-14 bg-black z-10 shadow-[0_10px_30px_rgba(0,0,0,0.9)]"></div>
                <div className="absolute bottom-0 left-0 w-full h-10 md:h-14 bg-black z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.9)]"></div>
                
                {/* SOMBRAS DE AMBIENTACIÓN */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent pointer-events-none z-0"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none opacity-80 z-0"></div>

                {/* TEXTOS ÉPICOS DINÁMICOS */}
                <div className="absolute top-24 md:top-32 left-12 flex flex-col items-start z-20 w-full max-w-4xl">
                    <span className={`${estilo.peligro} font-bold tracking-[0.6em] uppercase text-sm mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]`}>
                        {transicion.esBoss ? '¡Peligro Extremo!' : 'Nivel de Combate'}
                    </span>
                    
                    <h1 className={`text-6xl md:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b ${estilo.titulo} uppercase tracking-tighter drop-shadow-[0_8px_10px_rgba(0,0,0,1)] mb-4 leading-tight`}>
                        {transicion.esBoss ? 'La Ciudadela Cósmica' : transicion.dataNivel.nombre}
                    </h1>
                    
                    <div className="flex items-center gap-4 mt-2">
                        <span className={`${estilo.enemigoLabel} font-black text-2xl uppercase tracking-[0.2em] drop-shadow-[0_4px_6px_rgba(0,0,0,1)]`}>
                            Derrota a:
                        </span>
                        <span className={`${estilo.enemigoNombre} font-serif font-bold text-3xl uppercase tracking-wider drop-shadow-[0_4px_6px_rgba(0,0,0,1)] border-b-2 pb-1`}>
                            {enemigosPorBioma[transicion.bioma] || "Enemigo Desconocido"}
                        </span>
                    </div>
                </div>

                {/* BOTÓN ESTILO ZELDA / RPG DINÁMICO */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 mt-40 md:mt-52">
                    <div className="relative group cursor-pointer" onClick={() => {
                            setNivelJugando(transicion.dataNivel);
                            setTransicion(null); 
                        }}>
                        <div className={`absolute inset-0 ${estilo.botonBrillo} blur-md scale-110 transition-all duration-300`}></div>
                        
                        <button className={`relative bg-gradient-to-b ${estilo.botonBg} border-y ${estilo.botonBorde} text-white font-serif font-black uppercase tracking-[0.3em] py-5 px-20 shadow-[0_10px_30px_rgba(0,0,0,0.9)] transition-all transform group-hover:scale-105 [clip-path:polygon(1.5rem_0%,calc(100%-1.5rem)_0%,100%_50%,calc(100%-1.5rem)_100%,1.5rem_100%,0%_50%)]`}>
                            ¡Entrar a la Batalla!
                        </button>
                    </div>

                    <button onClick={() => setTransicion(null)} className="mt-10 text-gray-400 hover:text-white uppercase text-xs font-bold tracking-[0.3em] transition-colors drop-shadow-[0_4px_4px_rgba(0,0,0,1)] hover:scale-110 transform">
                        Retirada Táctica
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // ⚔️ PANTALLA 2: EL COMBATE (NivelBatalla)
    // ==========================================
    if (nivelJugando) {
        return (
            <NivelBatalla 
                nivel={nivelJugando} 
                alHuir={() => setNivelJugando(null)} 
                alCompletar={(idNivel) => {
                    setNivelJugando(null);
                    setTransicion({ 
                        fase: 'outro', 
                        bioma: mapaActual.biomas[nivelHover], 
                        idNivelGuardar: idNivel 
                    });
                }}
            />
        );
    }

    // ==========================================
    // 🏆 PANTALLA 3: VICTORIA Y ENEMIGO DERROTADO
    // ==========================================
    if (transicion?.fase === 'outro') {
        // Obtenemos los colores para mantener la temática en la pantalla de victoria
        const estilo = estilosBiomas[transicion.bioma] || estilosBiomas['valle'];

        return (
            <div className="absolute inset-0 z-50 bg-[#0a0a0f] flex flex-col items-center justify-center font-sans select-none animate-fade-in overflow-hidden">
                {/* IMAGEN DE FONDO */}
                <img 
                    src={`/assets/enemigos/${transicion.bioma}_derrotado.png`} 
                    alt={`Enemigo de ${transicion.bioma} derrotado`}
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-black'); }}
                />
                
                {/* 🎞️ BANDAS CINEMÁTICAS (Letterbox ajustado a ~1.5cm) */}
                <div className="absolute top-0 left-0 w-full h-10 md:h-14 bg-black z-10 shadow-[0_10px_30px_rgba(0,0,0,0.9)]"></div>
                <div className="absolute bottom-0 left-0 w-full h-10 md:h-14 bg-black z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.9)]"></div>
                
                {/* VIÑETA INFERIOR */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-0"></div>
                
                <div className="relative z-20 text-center flex flex-col items-center mt-20">
                    <h2 className={`text-7xl md:text-8xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b ${estilo.titulo} uppercase tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,1)] mb-4`}>
                        ¡ZONA DESPEJADA!
                    </h2>
                    <p className="text-2xl font-serif font-bold text-gray-300 drop-shadow-[0_4px_8px_rgba(0,0,0,1)] mb-12 tracking-wide">
                        El camino hacia el siguiente nivel está abierto.
                    </p>
                    
                    <div className="relative group cursor-pointer" onClick={async () => {
                            try {
                                const res = await fetch(`http://127.0.0.1:8000/api/notebooks/${notebookId}/progreso?nivel_id=${transicion.idNivelGuardar}`, { method: 'POST' });
                                if (res.ok && recargarBD) await recargarBD();
                            } catch (error) { console.error("Error al guardar progreso:", error); }
                            setTransicion(null);
                        }}>
                        <div className={`absolute inset-0 ${estilo.botonBrillo} blur-md scale-110 transition-all duration-300`}></div>
                        
                        <button className={`relative bg-gradient-to-b ${estilo.botonBg} border-y ${estilo.botonBorde} text-white font-serif font-black py-5 px-16 shadow-[0_15px_30px_rgba(0,0,0,0.9)] transition-all transform group-hover:scale-105 uppercase tracking-[0.2em] text-lg [clip-path:polygon(1.5rem_0%,calc(100%-1.5rem)_0%,100%_50%,calc(100%-1.5rem)_100%,1.5rem_100%,0%_50%)]`}>
                            Continuar la Aventura
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 🗺️ PANTALLA 4: EL MAPA DEL MULTIVERSO
    // ==========================================
    return (
        <div className="absolute inset-0 z-40 bg-[#12121a] text-white flex flex-col overflow-hidden font-sans select-none">
            {/* FONDO DINÁMICO DEL MAPA */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-[#12121a] to-[#12121a] transition-all duration-1000"></div>

            {/* HUD SUPERIOR */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col gap-3 pointer-events-auto">
                    <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase mb-1">🗺️ {mapaActual.nombre}</span>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="flex gap-1">
                            <kbd className="bg-white/10 border-b-2 border-white/20 px-2 py-1 rounded text-white font-mono font-bold">A</kbd>
                            <kbd className="bg-white/10 border-b-2 border-white/20 px-2 py-1 rounded text-white font-mono font-bold">D</kbd>
                        </div>
                        <span className="opacity-70">Moverse</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <kbd className="bg-indigo-600 border-b-2 border-indigo-800 px-3 py-1 rounded text-white font-mono font-bold">ENTER</kbd>
                        <span className="opacity-70">Entrar a la Zona</span>
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
                        ❌ Salir al Cuaderno
                    </button>
                </div>
            </div>

            {/* NODOS DEL MAPA */}
            <div className="flex-1 flex items-center justify-center relative w-full h-full z-0 overflow-x-auto custom-scrollbar px-20">
                <div className="relative flex items-center gap-36 min-w-max py-40">
                    <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-800 rounded-full -translate-y-1/2 -z-10 shadow-inner"></div>

                    {niveles.map((nivel, idx) => {
                        const isHovered = nivelHover === idx;
                        const isBoss = idx === niveles.length - 1;
                        const esImpar = (idx + 1) % 2 !== 0;
                        const isLocked = idx > nivelDesbloqueado;
                        
                        // 🔥 Magia pura: Cogemos el ID del bioma y buscamos su nombre épico
                        const biomaId = mapaActual.biomas[idx];
                        const tituloEpico = nombresBiomas[biomaId] || "Territorio Inexplorado";

                        return (
                            <div 
                                key={nivel.id} 
                                className={`relative flex flex-col items-center group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() => {
                                    setNivelHover(idx);
                                    if (!isLocked && isHovered) {
                                        setTransicion({ fase: 'intro', bioma: biomaId, dataNivel: { ...nivel, nombre: tituloEpico }, esBoss: isBoss });
                                    }
                                }}
                            >
                                <div className={`absolute w-72 text-center transition-all duration-500 left-1/2 -translate-x-1/2 pointer-events-none 
                                    ${esImpar ? 'bottom-full mb-10' : 'top-full mt-16'} 
                                    ${isHovered ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}
                                    ${isLocked ? 'grayscale opacity-20' : ''}`}>
                                    
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 ${isHovered ? 'text-indigo-400' : 'text-gray-500'}`}>
                                        Fase {idx + 1}
                                    </span>
                                    <span className={`block text-2xl font-serif font-black tracking-tight leading-tight ${isHovered && !isLocked ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]' : 'text-gray-600'}`}>
                                        {isLocked ? '?????' : tituloEpico}
                                    </span>
                                </div>

                                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 border-4 relative ${
                                    isHovered && !isLocked ? (isBoss ? 'bg-purple-600 border-purple-300 shadow-[0_0_40px_rgba(168,85,247,0.6)]' : 'bg-indigo-600 border-indigo-300 shadow-[0_0_40px_rgba(79,70,229,0.6)]') : 
                                    isLocked ? 'bg-[#0a0a0f] border-gray-800 scale-90 opacity-50' :
                                    'bg-[#1e1e24] border-gray-700 hover:border-gray-500'
                                } ${isHovered && !isLocked ? 'scale-125 z-10' : 'scale-100'}`}>
                                    
                                    <span className={`text-3xl transition-transform duration-300 ${isHovered && !isLocked ? 'scale-110' : 'scale-90 opacity-50'}`}>
                                        {isLocked ? '🔒' : isBoss ? '🏰' : '🛡️'}
                                    </span>
                                    
                                    {isHovered && !isLocked && <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isBoss ? 'bg-purple-400' : 'bg-white'}`}></div>}
                                </div>
                                
                                <div className={`absolute -bottom-8 transition-all duration-500 z-20 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    <div className={`w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] animate-bounce ${isLocked ? 'border-b-gray-600' : (isBoss ? 'border-b-purple-400' : 'border-b-indigo-400')}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* HUD INFERIOR: Multiverso */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-8 py-4 rounded-full font-bold backdrop-blur-md transition-all flex items-center gap-3 shadow-2xl">
                    <span className="text-xl">🌍</span> Ver todos los cuadernos
                </button>
            </div>
        </div>
    );
}