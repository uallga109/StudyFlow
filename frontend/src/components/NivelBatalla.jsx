import { useState, useEffect, useMemo } from 'react';
import RellenarHuecos from './RellenarHuecos';
import TableroConexiones from './TableroConexiones'; 
import BatallaJefe from './BatallaJefe'; // ✅ AQUÍ ESTÁ LA LÍNEA QUE FALTABA

export default function NivelBatalla({ nivel, modoHardcore, vidasGlobales, onPerderVida, alHuir, alCompletar, buffsActivos }) {

    // 1. RECOLECCIÓN Y BARAJO (SHUFFLE GLOBAL E INTERNO)
    const preguntas = useMemo(() => {
        let lista = [];
        if (nivel?.tipo === 'minijefe') {
            const conexiones = nivel.fase1_conexiones && nivel.fase1_conexiones.length > 0 
                ? [{ subtipo: 'conexiones', conexiones: nivel.fase1_conexiones }] 
                : [];
            const huecos = (nivel.fase1_huecos || []).map(h => ({ ...h, subtipo: 'hueco' }));
            const test = (nivel.fase2_test || []).map(t => ({ ...t, subtipo: 'test' }));
            
            lista = [...conexiones, ...huecos, ...test];
        } else {
            lista = (nivel?.preguntas || []).map(p => ({ ...p, subtipo: nivel.tipo }));
        }

        // Barajamos las opciones (A,B,C,D o V/F) DENTRO de cada pregunta
        const listaConOpcionesBarajadas = lista.map(pregunta => {
            if (pregunta.opciones && Array.isArray(pregunta.opciones)) {
                return {
                    ...pregunta,
                    opciones: [...pregunta.opciones].sort(() => Math.random() - 0.5)
                };
            }
            return pregunta;
        });

        // Barajamos el orden global de las preguntas
        return listaConOpcionesBarajadas.sort(() => Math.random() - 0.5);
    }, [nivel]);

    // 2. LÓGICA DE TIEMPO (Añadimos tiempo extra si compramos el reloj)
    const esMiniJefe = nivel?.tipo === 'minijefe';
    const esJefeFinal = nivel?.tipo === 'jefe_pokemon' || nivel?.tipo === 'feynman';
    const esGlobalTimer = esMiniJefe || esJefeFinal;
    
    // Si tienes buffsActivos.tiempo, te da 60 segundos por cada uno
    const tiempoExtra = (buffsActivos?.tiempo || 0) * 60; 
    const TIEMPO_MAXIMO = (esJefeFinal ? 300 : (esMiniJefe ? 120 : 15)) + tiempoExtra;
    
    // SISTEMA DE VIDAS (Híbrido)
    const [vidasLocales, setVidasLocales] = useState(3 + (modoHardcore ? 0 : (buffsActivos?.vida || 0)));
    const vidas = modoHardcore ? vidasGlobales : vidasLocales;
    
    const [indicePregunta, setIndicePregunta] = useState(0);
    const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_MAXIMO);
    
    // 3. ESTADOS DE LA INTERFAZ
    const [estadoBatalla, setEstadoBatalla] = useState('jugando'); 
    const [opcionSeleccionada, setOpcionSeleccionada] = useState(null); 
    const [respuestaEscrita, setRespuestaEscrita] = useState(''); 

    const preguntaActual = preguntas[indicePregunta];

    // --- MOTOR DEL TEMPORIZADOR ---
    useEffect(() => {
        if (estadoBatalla !== 'jugando') return; 
        
        if (tiempoRestante <= 0) {
            manejarTimeout();
            return;
        }

        const timerId = setInterval(() => setTiempoRestante(prev => prev - 1), 1000);
        return () => clearInterval(timerId);
    }, [tiempoRestante, estadoBatalla]);

    // --- LÓGICAS DE COMBATE ---
    const manejarTimeout = () => {
        setEstadoBatalla('timeout');
        setOpcionSeleccionada(null);
        
        if (esGlobalTimer) {
            setVidas(0);
            setTimeout(() => setEstadoBatalla('gameover'), 3000);
        } else {
            const nuevasVidas = vidas - 1;
            setVidas(nuevasVidas);
            setTimeout(() => {
                if (nuevasVidas <= 0) setEstadoBatalla('gameover');
                else avanzarPregunta();
            }, 2500);
        }
    };

    const procesarRespuesta = (opcion) => {
        if (estadoBatalla !== 'jugando') return;
        setOpcionSeleccionada(opcion);
        evaluarAciertoFallo(opcion === preguntaActual?.correcta);
    };

    const procesarRespuestaEscrita = (e) => {
        e.preventDefault(); 
        if (estadoBatalla !== 'jugando' || !respuestaEscrita.trim()) return;

        const normalizar = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
        const introducida = normalizar(respuestaEscrita);
        const correcta = normalizar(preguntaActual?.respuesta_exacta);

        evaluarAciertoFallo(introducida === correcta);
    };

    const evaluarAciertoFallo = (esCorrecta, avanzarAlFallar = true) => {
        if (esCorrecta) {
            setEstadoBatalla('acierto');
            setTimeout(() => avanzarPregunta(), 1500);
        } else {
            setEstadoBatalla('fallo');
            
            // LOGICA DE DAÑO: Depende del modo
            let nuevasVidas;
            if (modoHardcore) {
                onPerderVida(); // Informa a ModoJuego de la pérdida global
                nuevasVidas = vidasGlobales - 1; 
            } else {
                setVidasLocales(prev => prev - 1);
                nuevasVidas = vidasLocales - 1;
            }

            setTimeout(() => {
                if (nuevasVidas <= 0) setEstadoBatalla('gameover');
                else {
                    if (avanzarAlFallar) avanzarPregunta();
                    else setEstadoBatalla('jugando'); 
                }
            }, 1200); 
        }
    };

    const avanzarPregunta = () => {
        setOpcionSeleccionada(null);
        setRespuestaEscrita(''); 
        
        if (!esGlobalTimer) setTiempoRestante(TIEMPO_MAXIMO); 
        
        if (indicePregunta + 1 < preguntas.length) {
            setIndicePregunta(prev => prev + 1);
            setEstadoBatalla('jugando');
        } else {
            setEstadoBatalla('victoria');
        }
    };

    const getRespuestaCorrecta = () => {
        if (preguntaActual?.subtipo === 'hueco') return preguntaActual.respuesta_correcta;
        if (preguntaActual?.subtipo === 'palabra_clave') return preguntaActual.respuesta_exacta;
        if (preguntaActual?.subtipo === 'conexiones') return "Une los conceptos sin equivocarte.";
        return preguntaActual?.correcta;
    };

    console.log("🤫 PISTA DEV - La respuesta es:", getRespuestaCorrecta());

    // --- PANTALLAS FINALES ---
    if (estadoBatalla === 'gameover') {
        return (
            <div className="absolute inset-0 bg-red-950/90 z-50 flex flex-col items-center justify-center text-white animate-fade-in backdrop-blur-md">
                <span className="text-8xl mb-6">💀</span>
                <h2 className="text-5xl font-black text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">HAS CAÍDO</h2>
                <p className="text-xl text-red-200 mb-10">{tiempoRestante <= 0 && esGlobalTimer ? '¡El tiempo del Castillo se ha agotado!' : 'El conocimiento se esfuma...'}</p>
                <button onClick={alHuir} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-10 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all transform hover:scale-105">Volver al Mapa</button>
            </div>
        );
    }

    if (estadoBatalla === 'victoria') {
        return (
            <div className="absolute inset-0 bg-indigo-950/90 z-50 flex flex-col items-center justify-center text-white animate-fade-in backdrop-blur-md">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
                <span className="text-8xl mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,1)]">🏆</span>
                <h2 className="text-5xl font-black text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">¡NIVEL DESPEJADO!</h2>
                <p className="text-xl text-indigo-200 mb-10">Has dominado los conceptos de esta zona.</p>
                <button onClick={() => alCompletar(nivel.id, vidas)} className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-black py-4 px-10 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.6)] transition-all transform hover:scale-105 z-10">Continuar la Aventura</button>
            </div>
        );
    }

    // ✅ INTERFAZ ESPECIAL: BATALLA RPG (Nivel 6)
    if (nivel?.tipo === 'jefe_pokemon' || nivel?.tipo === 'feynman') {
        return (
            <div className="absolute inset-0 bg-[#0d0d14] z-50 flex flex-col font-sans select-none overflow-hidden p-8 justify-center">
                <button onClick={alHuir} className="absolute top-8 left-8 text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all z-50">
                    🏃‍♂️ Huir de la Batalla
                </button>
                <BatallaJefe 
                    nivel={nivel} 
                    tiempoRestante={tiempoRestante}
                    onResultado={(victoria) => {
                        if (victoria) setEstadoBatalla('victoria');
                        else setEstadoBatalla('gameover');
                    }} 
                />
            </div>
        );
    }

    if (!preguntaActual && estadoBatalla === 'jugando') return <div className="absolute inset-0 z-50 bg-[#0d0d14] text-white flex items-center justify-center">Cargando arena...</div>;

    const limitePeligro = esGlobalTimer ? 15 : 5; 
    const enPeligro = tiempoRestante <= limitePeligro && estadoBatalla === 'jugando';

    // --- PANTALLA PRINCIPAL DE COMBATE (Niveles 1 al 5) ---
    return (
        <div className="absolute inset-0 bg-[#0d0d14] z-50 flex flex-col font-sans select-none overflow-hidden">
            <div className={`absolute inset-0 transition-colors duration-500 pointer-events-none 
                ${estadoBatalla === 'fallo' ? 'bg-red-900/30' : estadoBatalla === 'timeout' ? 'bg-orange-900/30' : estadoBatalla === 'acierto' ? 'bg-green-900/10' : enPeligro ? 'bg-red-900/10 animate-pulse' : 'bg-transparent'}`}>
            </div>

            <header className="flex flex-col p-6 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10 gap-4">
                <div className="flex justify-between items-center w-full">
                    <div className="flex gap-2 text-2xl bg-black/50 p-3 rounded-2xl border border-white/10 shadow-inner">
                        {/* Corazones Dinámicos */}
                        {[...Array(modoHardcore ? 5 : Math.max(3, vidas))].map((_, i) => {
                            const v = i + 1;
                            return (
                                <span key={v} className={`text-2xl transition-all duration-300 ${vidas >= v ? 'drop-shadow-[0_0_12px_rgba(239,68,68,1)] scale-110' : 'opacity-20 grayscale scale-75'}`}>
                                    ❤️
                                </span>
                            );
                        })}
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">{nivel.nombre}</span>
                        <span className="text-sm font-bold text-gray-400 mt-1">Fase {indicePregunta + 1} de {preguntas.length}</span>
                    </div>
                    <button onClick={alHuir} className="text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all">🏃‍♂️ Rendirse</button>
                </div>
                <div className="w-full max-w-4xl mx-auto flex items-center gap-4 mt-2">
                    <span className={`text-xl font-black w-10 text-right ${enPeligro ? 'text-red-500 animate-bounce' : 'text-white'}`}>{tiempoRestante}s</span>
                    <div className="flex-1 h-3 bg-gray-800/80 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                        <div className={`h-full transition-all duration-1000 ease-linear rounded-full ${tiempoRestante > (TIEMPO_MAXIMO / 2) ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : tiempoRestante > limitePeligro ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]'}`} style={{ width: `${(tiempoRestante / TIEMPO_MAXIMO) * 100}%` }}></div>
                    </div>
                </div>
            </header>

            {/* ✅ AQUÍ ESTÁ EL ARREGLO DEL SCROLL PARA PREGUNTAS LARGAS */}
            <main className="flex-1 overflow-y-auto w-full relative z-10 p-4 md:p-8 custom-scrollbar flex flex-col">
                <div className="max-w-4xl mx-auto w-full my-auto flex flex-col items-center pb-10">
                    
                    {preguntaActual?.subtipo === 'conexiones' ? (
                        <div className={`bg-[#1e1e28] border shadow-2xl rounded-3xl p-10 w-full mb-10 relative transition-colors duration-300 ${enPeligro ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'border-gray-700/50'}`}>
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                                Empareja los Conceptos
                            </div>
                            <div className="mt-6">
                                <TableroConexiones conexiones={preguntaActual.conexiones} disabled={estadoBatalla !== 'jugando'} onResultado={(exito) => evaluarAciertoFallo(exito, false)} />
                            </div>
                        </div>

                    ) : preguntaActual?.subtipo === 'hueco' ? (
                        
                        <div className={`bg-[#1e1e28] border shadow-2xl rounded-3xl p-10 w-full mb-10 relative transition-colors duration-300 ${enPeligro ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'border-gray-700/50'}`}>
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                                Rellenar Huecos
                            </div>
                            <div className="mt-4">
                                <RellenarHuecos frase={preguntaActual.frase} respuestaCorrecta={preguntaActual.respuesta_correcta} disabled={estadoBatalla !== 'jugando'} onResultado={(esCorrecta) => evaluarAciertoFallo(esCorrecta)} />
                            </div>
                        </div>

                    ) : (

                        <>
                            <div className={`bg-[#1e1e28] border shadow-2xl rounded-3xl p-10 w-full mb-10 text-center relative transition-colors duration-300 ${enPeligro ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'border-gray-700/50'}`}>
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                                    {preguntaActual?.subtipo === 'palabra_clave' ? 'Adivina la Palabra' : preguntaActual?.subtipo === 'test' ? 'Test Rápido' : 'Pregunta'}
                                </div>
                                <h2 className="text-3xl font-bold text-white leading-relaxed mt-4">
                                    {preguntaActual?.subtipo === 'palabra_clave' ? preguntaActual?.definicion : preguntaActual?.pregunta}
                                </h2>
                            </div>

                            {preguntaActual?.subtipo === 'palabra_clave' ? (
                                <form onSubmit={procesarRespuestaEscrita} className="w-full flex flex-col items-center gap-6">
                                    <input type="text" value={respuestaEscrita} onChange={(e) => setRespuestaEscrita(e.target.value)} disabled={estadoBatalla !== 'jugando'} placeholder="Escribe la palabra exacta..." autoFocus className={`w-full max-w-2xl bg-[#252532] border-2 rounded-2xl p-6 text-center text-3xl font-bold text-white outline-none transition-all duration-300 ${estadoBatalla === 'acierto' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] text-green-400' : estadoBatalla === 'fallo' || estadoBatalla === 'timeout' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] text-red-400' : 'border-gray-600 focus:border-indigo-500 focus:shadow-[0_0_30px_rgba(79,70,229,0.3)]'}`} />
                                    <button type="submit" disabled={estadoBatalla !== 'jugando' || !respuestaEscrita.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-black uppercase tracking-widest py-4 px-12 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all transform hover:scale-105">Confirmar</button>
                                </form>
                            ) : (
                                <div className={`grid gap-4 w-full ${nivel.tipo === 'vf' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                                    {preguntaActual?.opciones?.map((opcion, i) => {
                                        let coloresClase = "bg-[#252532] hover:bg-[#2d2d3d] border-gray-600 text-gray-200"; 
                                        if (estadoBatalla !== 'jugando') {
                                            if (opcion === preguntaActual?.correcta) coloresClase = "bg-green-600/20 border-green-500 text-green-300 ring-2 ring-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
                                            else if (opcion === opcionSeleccionada) coloresClase = "bg-red-600/20 border-red-500 text-red-300 ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]";
                                            else coloresClase = "bg-[#1a1a24] border-transparent text-gray-600 opacity-50"; 
                                        }
                                        return <button key={i} disabled={estadoBatalla !== 'jugando'} onClick={() => procesarRespuesta(opcion)} className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left font-bold text-lg flex items-center gap-4 ${coloresClase}`}><span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${estadoBatalla !== 'jugando' && opcion === preguntaActual?.correcta ? 'bg-green-500 text-white' : 'bg-black/30'}`}>{['A', 'B', 'C', 'D'][i]}</span>{opcion}</button>;
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {(estadoBatalla === 'fallo' || estadoBatalla === 'timeout') && preguntaActual?.subtipo !== 'conexiones' && (
                        <div className="w-full mt-8 p-6 bg-red-950/40 border border-red-900/50 rounded-2xl animate-fade-in">
                            <span className="text-red-400 font-black block mb-2 uppercase text-sm tracking-widest">
                                {estadoBatalla === 'timeout' ? (esGlobalTimer ? '⏰ ¡EL CASTILLO SE HA DERRUMBADO!' : '⏰ ¡TIEMPO AGOTADO!') : '💥 ¡GOLPE CRÍTICO!'} 
                                - Respuesta Correcta: {getRespuestaCorrecta()}
                            </span>
                            {preguntaActual?.explicacion && <p className="text-red-200/80">{preguntaActual.explicacion}</p>}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}