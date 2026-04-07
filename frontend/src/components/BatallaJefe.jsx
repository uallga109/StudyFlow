import { useState, useEffect, useMemo } from 'react';
import RellenarHuecos from './RellenarHuecos';
import TableroConexiones from './TableroConexiones'; 
import BatallaJefe from './BatallaJefe'; // ✅ AÑADE ESTA LÍNEA AQUÍ

export default function NivelBatalla({ nivel, alHuir, alCompletar }) {
    // ESTADOS DEL JUGADOR Y JEFE
    const [hpJefe, setHpJefe] = useState(15); // Hay que acertar 15 veces
    const [vidasJugador, setVidasJugador] = useState(3);
    
    // SISTEMA DE PP (Power Points) y PROGRESO
    const [usos, setUsos] = useState({
        vf: 5,
        test: 5,
        huecos: 5,
        palabra: 5
    });
    
    // FASES: 'menu_ataques', 'ejecutando_ataque', 'dialogo_resultado'
    const [fase, setFase] = useState('menu_ataques');
    const [ataqueActual, setAtaqueActual] = useState(null); // Qué tipo de ejercicio estamos haciendo
    const [preguntaActiva, setPreguntaActiva] = useState(null);
    const [mensajeDialogo, setMensajeDialogo] = useState(`¡El JEFE FINAL te desafía! Necesitas asestar 30 golpes para derrotarlo.`);
    const [textoPalabra, setTextoPalabra] = useState(''); // Para el input de adivinar palabra

    // 1. SELECCIONAR ATAQUE
    const elegirAtaque = (tipoAtaque) => {
        if (usos[tipoAtaque] <= 0) return;

        // Búsqueda inteligente: buscamos en la raíz del nivel o dentro de 'preguntas' por si la IA es rebelde
        let listaPreguntas = [];
        if (tipoAtaque === 'vf') listaPreguntas = nivel.ataque_vf || nivel.preguntas?.ataque_vf || [];
        if (tipoAtaque === 'test') listaPreguntas = nivel.ataque_test || nivel.preguntas?.ataque_test || [];
        if (tipoAtaque === 'huecos') listaPreguntas = nivel.ataque_huecos || nivel.preguntas?.ataque_huecos || [];
        if (tipoAtaque === 'palabra') listaPreguntas = nivel.ataque_palabra || nivel.preguntas?.ataque_palabra || [];

        const indice = 5 - usos[tipoAtaque]; 
        const preguntaElegida = listaPreguntas[indice];

        // ✅ FIX: Si la IA no ha generado las preguntas, AHORA SÍ mostramos el error
        if (!preguntaElegida) {
            setMensajeDialogo(`¡Fallo del sistema! La IA no ha cargado munición para el ataque ${tipoAtaque.toUpperCase()}`);
            setFase('dialogo_resultado'); // Cambiamos la vista para que leas el error
            
            // A los 2 segundos te devolvemos los mandos
            setTimeout(() => {
                setFase('menu_ataques');
            }, 2500);
            return;
        }

        // Si todo va bien, restamos 1 PP y lanzamos el ataque
        setUsos(prev => ({ ...prev, [tipoAtaque]: prev[tipoAtaque] - 1 }));
        setAtaqueActual(tipoAtaque);
        setPreguntaActiva(preguntaElegida);
        setFase('ejecutando_ataque');
        setTextoPalabra('');
    };

    // 2. PROCESAR EL RESULTADO DEL ATAQUE
    const procesarResultado = (esCorrecto) => {
        setFase('dialogo_resultado');
        
        if (esCorrecto) {
            const nuevoHp = hpJefe - 1;
            setHpJefe(nuevoHp);
            setMensajeDialogo(`¡GOLPE CRÍTICO! ¡Has acertado!`);
            
            setTimeout(() => {
                if (nuevoHp <= 0) {
                    setMensajeDialogo("¡El JEFE FINAL ha sido derrotado! ¡ERES UNA LEYENDA!");
                    setTimeout(() => onResultado(true), 2500);
                } else {
                    setFase('menu_ataques');
                }
            }, 2000);
        } else {
            const nuevasVidas = vidasJugador - 1;
            setVidasJugador(nuevasVidas);
            setMensajeDialogo(`¡Has fallado! El Jefe contraataca. ¡Pierdes 1 vida!`);
            
            setTimeout(() => {
                if (nuevasVidas <= 0) {
                    setMensajeDialogo("¡No te quedan vidas! Has sido derrotado...");
                    setTimeout(() => onResultado(false), 2500);
                } else {
                    setFase('menu_ataques');
                }
            }, 2500);
        }
    };

    const manejarSubmitPalabra = (e) => {
        e.preventDefault();
        const normalizar = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
        procesarResultado(normalizar(textoPalabra) === normalizar(preguntaActiva?.respuesta_exacta));
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-10 animate-fade-in font-sans h-full justify-center overflow-hidden relative">
            
            {/* 🌌 FONDO DINÁMICO DEL ESPACIO PROFUNDO */}
            <div className="absolute inset-0 z-0 bg-[#0d0d14]">
                <div className="absolute inset-0 bg-[url('/assets/deepspace_texture.jpg')] opacity-30 mix-blend-screen transition-opacity duration-1000 animate-pulse-slow"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-black to-black opacity-90 z-0"></div>
            </div>

            {/* 🛡️ PANTALLA DE BATALLA ÉPICA (Visual RPG) */}
            <div className="relative z-10 bg-black/50 border-4 border-gray-700 rounded-3xl p-8 relative shadow-[0_0_60px_rgba(0,0,0,1)] h-[400px] flex flex-col justify-between overflow-hidden">
                
                {/* HUD: JUGADOR (A la izquierda) */}
                <div className="self-start bg-[#1e1e28]/80 border-2 border-indigo-900/50 p-5 rounded-2xl w-72 shadow-2xl z-20 mt-auto backdrop-blur-sm transition-all duration-300 transform hover:scale-105">
                    <h3 className="font-serif font-black text-indigo-400 uppercase tracking-widest text-sm mb-2 flex justify-between">
                        <span>ESTUDIANTE</span>
                    </h3>
                    <div className="flex gap-3 text-3xl">
                        {[1, 2, 3].map((v) => (
                            <span key={v} className={`transition-all duration-300 ${vidasJugador >= v ? 'drop-shadow-[0_0_12px_rgba(239,68,68,1)] scale-110' : 'opacity-20 grayscale scale-75'}`}>❤️</span>
                        ))}
                    </div>
                </div>

                {/* SPRITE DEL TITÁN Y SU HUD MÁGICO (A la derecha, GIGANTE) */}
                <div className="absolute -top-16 right-0 w-[450px] h-full flex flex-col items-center justify-end pb-8 z-10">
                    <img 
                        src={hpJefe > 5 ? '/assets/enemigos/hechicero_fase1.png' : '/assets/enemigos/hechicero_fase2.png'} 
                        alt="Titán del Caos"
                        className={`w-full max-h-[350px] object-contain transition-all duration-1000 [filter:drop-shadow(0_20px_40px_rgba(0,0,0,1))] ${
                            hpJefe <= 5 ? 'animate-shake-red scale-110 [filter:drop-shadow(0_0_35px_rgba(220,38,38,1))]' : 'animate-bounce-slow-2'
                        }`}
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div class="text-white text-center text-4xl font-serif">Aurelius, El Señor de los Cielos<br/>Falta PNG: hechicero_fase1.png</div>'; }}
                    />
                    
                    <div className="w-full max-w-sm bg-[#1e1e28] border-2 border-red-900/50 p-3 rounded-xl shadow-lg mt-4 backdrop-blur-sm transform transition-all duration-300 hover:scale-105">
                        <h3 className="font-serif font-black text-red-500 uppercase tracking-widest text-xs mb-2 flex justify-between">
                            <span>{hpJefe <= 5 ? '¡Furia del Caos!' : 'Titán Estelar'}</span>
                            <span className={hpJefe <= 5 ? 'animate-pulse text-red-400' : ''}>HP: {hpJefe}/15</span>
                        </h3>
                        <div className="h-4 bg-gray-950 rounded-full overflow-hidden border border-gray-800 shadow-inner">
                            <div className={`h-full transition-all duration-1000 ease-out rounded-full ${hpJefe <= 5 ? 'bg-gradient-to-r from-red-600 to-red-900 shadow-[0_0_15px_rgba(220,38,38,1)]' : 'bg-gradient-to-r from-red-500 to-red-700'}`} style={{ width: `${(hpJefe / 15) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* DIÁLOGOS DE RESULTADO O INICIO */}
                {(fase === 'dialogo_resultado' || fase === 'inicio') && (
                    <div className="absolute inset-0 flex items-center justify-center p-8 z-30 transition-opacity duration-300">
                        <div className="bg-black/60 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
                            <p className="text-white text-4xl font-serif font-black leading-relaxed text-center animate-fade-in drop-shadow-[0_4px_4px_rgba(0,0,0,1)] tracking-tight">
                                {mensajeDialogo}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ⚔️ ZONA DE INTERACCIÓN ARCANA (Slate con rúnicas etched) */}
            <div className="bg-[#0f0f15] border-4 border-double border-gray-600 rounded-3xl shadow-[0_10px_60px_rgba(0,0,0,1)] min-h-[220px] p-8 relative overflow-hidden transition-all duration-300 transform hover:scale-[1.01]">
                <div className="absolute inset-0 bg-[url('/assets/arcane_etched_texture.png')] opacity-10 mix-blend-luminosity z-0"></div>
                
                {fase === 'menu_ataques' && (
                    <div className="h-full flex flex-col justify-center relative z-10">
                        <span className="text-gray-400 font-serif font-black mb-6 block uppercase tracking-[0.3em] text-sm text-center drop-shadow-md">Selecciona tu técnica de combate</span>
                        <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
                            
                            {/* BOTÓN: Ataque Test (AZUL) */}
                            <div className={`relative group ${usos.test === 0 ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => elegirAtaque('test')}>
                                <div className="absolute inset-0 bg-blue-600/30 blur-lg scale-110 group-hover:bg-blue-500/50 transition-all duration-300 rounded-lg"></div>
                                <button disabled={usos.test === 0} className="w-full relative flex justify-between items-center bg-gradient-to-r from-blue-900 via-blue-700 to-blue-950 border-y-2 border-blue-400/40 text-white font-serif font-black uppercase tracking-[0.2em] py-5 px-10 shadow-[0_8px_15px_rgba(0,0,0,0.8)] transition-all transform group-hover:scale-105 [clip-path:polygon(1.8rem_0%,calc(100%-1.8rem)_0%,100%_50%,calc(100%-1.8rem)_100%,1.8rem_100%,0%_50%)]">
                                    <span className="text-xl">Ataque Test</span>
                                    <span className="text-sm font-mono font-bold bg-black/60 px-3 py-1.5 rounded-lg border border-blue-900/50 shadow-inner">PP {usos.test}/5</span>
                                </button>
                            </div>

                            {/* BOTÓN: Golpe V/F (VERDE) */}
                            <div className={`relative group ${usos.vf === 0 ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => elegirAtaque('vf')}>
                                <div className="absolute inset-0 bg-emerald-600/30 blur-lg scale-110 group-hover:bg-emerald-500/50 transition-all duration-300 rounded-lg"></div>
                                <button disabled={usos.vf === 0} className="w-full relative flex justify-between items-center bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-950 border-y-2 border-emerald-400/40 text-white font-serif font-black uppercase tracking-[0.2em] py-5 px-10 shadow-[0_8px_15px_rgba(0,0,0,0.8)] transition-all transform group-hover:scale-105 [clip-path:polygon(1.8rem_0%,calc(100%-1.8rem)_0%,100%_50%,calc(100%-1.8rem)_100%,1.8rem_100%,0%_50%)]">
                                    <span className="text-xl">Golpe V/F</span>
                                    <span className="text-sm font-mono font-bold bg-black/60 px-3 py-1.5 rounded-lg border border-emerald-900/50 shadow-inner">PP {usos.vf}/5</span>
                                </button>
                            </div>

                            {/* BOTÓN: Rayo Huecos (AMARILLO) */}
                            <div className={`relative group ${usos.huecos === 0 ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => elegirAtaque('huecos')}>
                                <div className="absolute inset-0 bg-amber-600/30 blur-lg scale-110 group-hover:bg-amber-500/50 transition-all duration-300 rounded-lg"></div>
                                <button disabled={usos.huecos === 0} className="w-full relative flex justify-between items-center bg-gradient-to-r from-amber-900 via-amber-600 to-amber-950 border-y-2 border-amber-400/40 text-white font-serif font-black uppercase tracking-[0.2em] py-5 px-10 shadow-[0_8px_15px_rgba(0,0,0,0.8)] transition-all transform group-hover:scale-105 [clip-path:polygon(1.8rem_0%,calc(100%-1.8rem)_0%,100%_50%,calc(100%-1.8rem)_100%,1.8rem_100%,0%_50%)]">
                                    <span className="text-xl">Rayo Huecos</span>
                                    <span className="text-sm font-mono font-bold bg-black/60 px-3 py-1.5 rounded-lg border border-amber-900/50 shadow-inner">PP {usos.huecos}/5</span>
                                </button>
                            </div>

                            {/* BOTÓN: Impacto Exacto (MORADO) */}
                            <div className={`relative group ${usos.palabra === 0 ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => elegirAtaque('palabra')}>
                                <div className="absolute inset-0 bg-purple-600/30 blur-lg scale-110 group-hover:bg-purple-500/50 transition-all duration-300 rounded-lg"></div>
                                <button disabled={usos.palabra === 0} className="w-full relative flex justify-between items-center bg-gradient-to-r from-purple-900 via-purple-700 to-purple-950 border-y-2 border-purple-400/40 text-white font-serif font-black uppercase tracking-[0.2em] py-5 px-10 shadow-[0_8px_15px_rgba(0,0,0,0.8)] transition-all transform group-hover:scale-105 [clip-path:polygon(1.8rem_0%,calc(100%-1.8rem)_0%,100%_50%,calc(100%-1.8rem)_100%,1.8rem_100%,0%_50%)]">
                                    <span className="text-xl">Impacto Exacto</span>
                                    <span className="text-sm font-mono font-bold bg-black/60 px-3 py-1.5 rounded-lg border border-purple-900/50 shadow-inner">PP {usos.palabra}/5</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EJECUCIÓN DEL ATAQUE (Preguntas de Combate) */}
                {fase === 'ejecutando_ataque' && preguntaActiva && (
                    <div className="relative z-10 animate-fade-in-up flex flex-col items-center gap-8 h-full justify-center">
                        <div className="absolute inset-0 bg-black/40 blur-sm pointer-events-none"></div>
                        <h3 className="relative z-20 text-3xl font-black text-white text-center leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,1)] max-w-4xl font-serif">
                            {ataqueActual === 'huecos' ? null : (preguntaActiva.pregunta || preguntaActiva.definicion)}
                        </h3>

                        {ataqueActual === 'test' || ataqueActual === 'vf' ? (
                            <div className={`grid gap-6 w-full max-w-4xl ${ataqueActual === 'vf' ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                {preguntaActiva.opciones.map((opt, i) => (
                                    <button key={i} onClick={() => procesarResultado(opt === preguntaActiva.correcta)} className="relative z-20 p-6 bg-[#252532] hover:bg-indigo-600 border border-gray-600 hover:border-indigo-400 rounded-2xl font-bold text-white text-xl transition shadow-[0_5px_15px_rgba(0,0,0,0.5)] transform hover:scale-105">
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : ataqueActual === 'huecos' ? (
                            <div className="-mt-3 w-full">
                                <RellenarHuecos frase={preguntaActiva.frase} respuestaCorrecta={preguntaActiva.respuesta_correcta} onResultado={procesarResultado} />
                            </div>
                        ) : (
                            <form onSubmit={manejarSubmitPalabra} className="flex gap-6 w-full max-w-3xl justify-center">
                                <input type="text" value={textoPalabra} onChange={(e)=>setTextoPalabra(e.target.value)} autoFocus className="flex-1 bg-[#252532] border-2 border-indigo-500 p-6 rounded-2xl text-white font-bold text-3xl outline-none shadow-inner transition focus:border-indigo-300" placeholder="Palabra exacta..." />
                                <button type="submit" disabled={!textoPalabra} className="relative z-20 bg-indigo-600 hover:bg-indigo-500 font-black px-12 py-6 rounded-2xl text-white disabled:opacity-50 text-2xl shadow-lg transition transform hover:scale-105 uppercase tracking-widest font-serif">¡Atacar!</button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}