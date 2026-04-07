import { useState, useEffect } from 'react';
import RellenarHuecos from './RellenarHuecos';


export default function BatallaJefe({ nivel, onResultado, tiempoRestante }) { 
    // ⚔️ STATS BALANCEADAS
    const [hpJefe, setHpJefe] = useState(15);
    const [vidasJugador, setVidasJugador] = useState(3);
    
    // 🎒 SISTEMA DE PP
    const [usos, setUsos] = useState({ vf: 5, test: 5, huecos: 5, palabra: 5 });
    
    const [fase, setFase] = useState('menu_ataques');
    const [ataqueActual, setAtaqueActual] = useState(null); 
    const [preguntaActiva, setPreguntaActiva] = useState(null);
    const [mensajeDialogo, setMensajeDialogo] = useState(`LA CIUDADELA CÓSMICA ESPERA TU MOVIMIENTO...`);
    const [textoPalabra, setTextoPalabra] = useState(''); 

    // 1. SELECCIONAR ATAQUE
    const elegirAtaque = (tipoAtaque) => {
        if (usos[tipoAtaque] <= 0) return;

        let listaPreguntas = [];
        if (tipoAtaque === 'vf') listaPreguntas = nivel.ataque_vf || nivel.preguntas?.ataque_vf || [];
        if (tipoAtaque === 'test') listaPreguntas = nivel.ataque_test || nivel.preguntas?.ataque_test || [];
        if (tipoAtaque === 'huecos') listaPreguntas = nivel.ataque_huecos || nivel.preguntas?.ataque_huecos || [];
        if (tipoAtaque === 'palabra') listaPreguntas = nivel.ataque_palabra || nivel.preguntas?.ataque_palabra || [];

        const indice = 5 - usos[tipoAtaque]; 
        const preguntaElegida = listaPreguntas[indice];

        if (!preguntaElegida) {
            setMensajeDialogo(`ERROR EN LA MATRIZ: El ataque ${tipoAtaque.toUpperCase()} está vacío.`);
            setFase('dialogo_resultado'); 
            setTimeout(() => setFase('menu_ataques'), 2500);
            return;
        }

        // --- 🕵️‍♂️ EL CHIVATO DEL JEFE FINAL ---
        let respuestaPista = "";
        if (tipoAtaque === 'vf' || tipoAtaque === 'test') respuestaPista = preguntaElegida.correcta;
        if (tipoAtaque === 'huecos') respuestaPista = preguntaElegida.respuesta_correcta;
        if (tipoAtaque === 'palabra') respuestaPista = preguntaElegida.respuesta_exacta;

        console.log(`⚔️ JEFE DEV - Ataque [${tipoAtaque.toUpperCase()}] - Respuesta:`, respuestaPista);
        // ------------------------------------
        
        setUsos(prev => ({ ...prev, [tipoAtaque]: prev[tipoAtaque] - 1 }));
        setAtaqueActual(tipoAtaque);
        setPreguntaActiva(preguntaElegida);
        setFase('ejecutando_ataque');
        setTextoPalabra('');
    };

    // 2. PROCESAR EL RESULTADO
    const procesarResultado = (esCorrecto) => {
        setFase('dialogo_resultado');
        if (esCorrecto) {
            const nuevoHp = hpJefe - 1;
            setHpJefe(nuevoHp);
            setMensajeDialogo(`¡IMPACTO CRÍTICO!`);
            
            setTimeout(() => {
                if (nuevoHp <= 0) {
                    setMensajeDialogo("EL CAOS HA SIDO PURGADO.");
                    setTimeout(() => onResultado(true), 2500);
                } else {
                    setFase('menu_ataques');
                }
            }, 2000);
        } else {
            const nuevasVidas = vidasJugador - 1;
            setVidasJugador(nuevasVidas);
            setMensajeDialogo(`¡CONTRAATAQUE ESTELAR! (-1 VIDA)`);
            
            setTimeout(() => {
                if (nuevasVidas <= 0) {
                    setMensajeDialogo("TU LUZ SE HA EXTINGUIDO...");
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

    // DETERMINAR EL ESTADO DEL JEFE
    const esFase2 = hpJefe <= 5;

    return (
        /* CONTENEDOR PRINCIPAL: PANTALLA COMPLETA ABSOLUTA */
        <div className="absolute inset-0 w-full h-full bg-[#050508] overflow-hidden text-white font-sans select-none z-50">
            
            {/* 🖼️ FONDOS DINÁMICOS INTEGRADOS (Fundido cruzado entre las 2 fases) */}
            {/* Asegúrate de que las fotos están en public/assets/fondos/ y se llaman exactamente así */}
            <img 
                src="/assets/fondos/batalla_final_fase1.png" 
                alt="Escenario Fase 1" 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 -z-20 ${esFase2 ? 'opacity-0' : 'opacity-100'}`}
                onError={(e) => { e.target.style.display = 'none'; console.log("Falta batalla_final_fase1.png"); }}
            />
            <img 
                src="/assets/fondos/batalla_final_fase2.png" 
                alt="Escenario Fase 2" 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 -z-10 ${esFase2 ? 'opacity-100' : 'opacity-0'}`}
                onError={(e) => { e.target.style.display = 'none'; console.log("Falta batalla_final_fase2.png"); }}
            />
            
            {/* 🌌 EFECTOS DE AMBIENTACIÓN (Solo en Fase 2) */}
            <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000 ${esFase2 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] blur-3xl opacity-50 from-red-900/50 via-purple-900/20 to-transparent animate-pulse"></div>
            </div>

            {/* ⏱️ RELOJ DEL JUICI  (AÑADE ESTE BLOQUE AQUÍ) */}
            <div className="absolute top-16 right-10 z-50 flex flex-col items-end pointer-events-none">
                <span className="text-gray-500 font-serif font-black tracking-[0.2em] text-xs">TIEMPO RESTANTE</span>
                <div className={`text-5xl font-mono font-black drop-shadow-[0_0_15px_rgba(0,0,0,1)] ${tiempoRestante < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    {Math.floor(tiempoRestante / 60)}:{(tiempoRestante % 60).toString().padStart(2, '0')}
                </div>
            </div>

            {/* 🏰 BARRA DE VIDA DEL JEFE (Estilo Dark Souls - Top Center) */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[85%] max-w-5xl z-40 flex flex-col items-center">
                <div className="flex justify-between w-full font-serif font-black tracking-[0.4em] mb-2 uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                    <span className={`text-2xl transition-colors duration-500 ${esFase2 ? 'text-red-500 animate-pulse' : 'text-purple-300'}`}>
                        {esFase2 ? 'Hechicero: Furia del Caos' : 'Hechicero del Caos Estelar'}
                    </span>
                    <span className="text-xl text-gray-300">{hpJefe} / 15</span>
                </div>
                <div className="w-full h-4 bg-black/80 border border-gray-700 -skew-x-[30deg] relative shadow-[0_0_30px_rgba(0,0,0,1)] overflow-hidden backdrop-blur-md">
                    <div className={`h-full transition-all duration-1000 ease-out shadow-[0_0_20px_currentColor] ${esFase2 ? 'bg-red-600 text-red-600' : 'bg-gradient-to-r from-purple-800 via-purple-500 to-indigo-400 text-purple-400'}`} style={{ width: `${(hpJefe / 15) * 100}%` }}></div>
                </div>
            </div>

            {/* 👤 HUD DEL JUGADOR (Bottom Left, Inclinado) */}
            <div className="absolute bottom-16 left-12 z-40 flex flex-col gap-2">
                <span className="font-serif font-black tracking-[0.3em] text-indigo-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-lg">ESTUDIANTE</span>
                <div className="flex gap-4 bg-black/60 backdrop-blur-md border border-indigo-900/50 p-4 -skew-x-12 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                    {[1, 2, 3].map((v) => (
                        <span key={v} className={`text-4xl skew-x-12 transition-all duration-300 ${vidasJugador >= v ? 'drop-shadow-[0_0_15px_rgba(239,68,68,1)] scale-110' : 'opacity-20 grayscale scale-75'}`}>❤️</span>
                    ))}
                </div>
            </div>

            {/* ⚔️ MENÚ DE ATAQUES (Bottom Center/Right) */}
            {fase === 'menu_ataques' && (
                <div className="absolute bottom-0 left-0 w-full h-[55%] bg-gradient-to-t from-black via-black/90 to-transparent z-30 flex flex-col items-center justify-end pb-16 animate-fade-in-up">
                    <div className="w-full max-w-5xl grid grid-cols-2 gap-6 px-12 ml-24">
                        
                        {/* BOTÓN TEST */}
                        <button disabled={usos.test === 0} onClick={() => elegirAtaque('test')} className="group relative w-full h-20 bg-transparent focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-400 -skew-x-12 group-hover:scale-[1.02] group-hover:bg-blue-800/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] backdrop-blur-sm"></div>
                            <div className="relative z-10 flex justify-between items-center h-full px-10">
                                <span className="text-2xl font-serif font-black text-blue-100 uppercase tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Ataque Test</span>
                                <span className="text-blue-300 font-mono font-bold tracking-widest bg-black/50 px-3 py-1 -skew-x-12 border border-blue-900/50">PP {usos.test}/5</span>
                            </div>
                        </button>

                        {/* BOTÓN V/F */}
                        <button disabled={usos.vf === 0} onClick={() => elegirAtaque('vf')} className="group relative w-full h-20 bg-transparent focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 to-transparent border-l-4 border-emerald-400 -skew-x-12 group-hover:scale-[1.02] group-hover:bg-emerald-800/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-sm"></div>
                            <div className="relative z-10 flex justify-between items-center h-full px-10">
                                <span className="text-2xl font-serif font-black text-emerald-100 uppercase tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Golpe V/F</span>
                                <span className="text-emerald-300 font-mono font-bold tracking-widest bg-black/50 px-3 py-1 -skew-x-12 border border-emerald-900/50">PP {usos.vf}/5</span>
                            </div>
                        </button>

                        {/* BOTÓN HUECOS */}
                        <button disabled={usos.huecos === 0} onClick={() => elegirAtaque('huecos')} className="group relative w-full h-20 bg-transparent focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/80 to-transparent border-l-4 border-amber-400 -skew-x-12 group-hover:scale-[1.02] group-hover:bg-amber-800/90 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-sm"></div>
                            <div className="relative z-10 flex justify-between items-center h-full px-10">
                                <span className="text-2xl font-serif font-black text-amber-100 uppercase tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Rayo Huecos</span>
                                <span className="text-amber-300 font-mono font-bold tracking-widest bg-black/50 px-3 py-1 -skew-x-12 border border-amber-900/50">PP {usos.huecos}/5</span>
                            </div>
                        </button>

                        {/* BOTÓN PALABRA */}
                        <button disabled={usos.palabra === 0} onClick={() => elegirAtaque('palabra')} className="group relative w-full h-20 bg-transparent focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-transparent border-l-4 border-purple-400 -skew-x-12 group-hover:scale-[1.02] group-hover:bg-purple-800/90 transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] backdrop-blur-sm"></div>
                            <div className="relative z-10 flex justify-between items-center h-full px-10">
                                <span className="text-2xl font-serif font-black text-purple-100 uppercase tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Impacto Exacto</span>
                                <span className="text-purple-300 font-mono font-bold tracking-widest bg-black/50 px-3 py-1 -skew-x-12 border border-purple-900/50">PP {usos.palabra}/5</span>
                            </div>
                        </button>

                    </div>
                </div>
            )}

            {/* 💬 DIÁLOGO O RESULTADO */}
            {(fase === 'dialogo_resultado' || fase === 'inicio') && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                    <div className="bg-gradient-to-r from-transparent via-black/90 to-transparent w-full py-12 flex justify-center border-y border-gray-800 shadow-[0_0_50px_rgba(0,0,0,1)]">
                        <p className="text-white text-5xl font-serif font-black tracking-[0.1em] text-center drop-shadow-[0_5px_15px_rgba(0,0,0,1)] uppercase">
                            {mensajeDialogo}
                        </p>
                    </div>
                </div>
            )}

            {/* 🔥 EJECUCIÓN DEL ATAQUE (La Pregunta) */}
            {fase === 'ejecutando_ataque' && preguntaActiva && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex flex-col items-center justify-center p-8 animate-fade-in">
                    
                    <h3 className="text-4xl md:text-5xl font-black text-white text-center leading-tight drop-shadow-[0_5px_15px_rgba(0,0,0,1)] max-w-5xl font-serif mb-12 uppercase">
                        {ataqueActual === 'huecos' ? 'COMPLETA LA RUNA ROTA:' : (preguntaActiva.pregunta || preguntaActiva.definicion)}
                    </h3>

                    {ataqueActual === 'test' || ataqueActual === 'vf' ? (
                        <div className={`grid gap-8 w-full max-w-5xl ${ataqueActual === 'vf' ? 'grid-cols-2' : 'grid-cols-2'}`}>
                            {preguntaActiva.opciones.map((opt, i) => (
                                <button key={i} onClick={() => procesarResultado(opt === preguntaActiva.correcta)} className="relative overflow-hidden group p-8 bg-black/50 border border-indigo-500/50 hover:border-indigo-300 rounded-lg text-white font-bold text-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] transform hover:-translate-y-2">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <span className="relative z-10">{opt}</span>
                                </button>
                            ))}
                        </div>
                    ) : ataqueActual === 'huecos' ? (
                        <div className="w-full max-w-5xl text-2xl relative z-20">
                            <RellenarHuecos frase={preguntaActiva.frase} respuestaCorrecta={preguntaActiva.respuesta_correcta} onResultado={procesarResultado} />
                        </div>
                    ) : (
                        <form onSubmit={manejarSubmitPalabra} className="flex gap-6 w-full max-w-4xl justify-center relative z-20">
                            <input type="text" value={textoPalabra} onChange={(e)=>setTextoPalabra(e.target.value)} autoFocus className="flex-1 bg-black/50 border-b-4 border-indigo-500 p-6 text-white font-black text-4xl outline-none transition focus:border-purple-400 focus:bg-indigo-950/30 text-center uppercase tracking-widest placeholder-gray-700" placeholder="ESCRIBE TU GOLPE..." />
                            <button type="submit" disabled={!textoPalabra} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-black px-16 py-6 text-white disabled:opacity-30 text-2xl shadow-[0_0_30px_rgba(79,70,229,0.5)] transition transform hover:scale-105 uppercase tracking-[0.3em] font-serif border border-indigo-400/50 skew-x-[-10deg]">ATACAR</button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}