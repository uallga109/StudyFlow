import { useState, useEffect, useMemo } from 'react';
import RellenarHuecos from './RellenarHuecos';
import TableroConexiones from './TableroConexiones'; 
import BatallaJefe from './BatallaJefe'; // ✅ AÑADE ESTA LÍNEA AQUÍ

export default function NivelBatalla({ nivel, alHuir, alCompletar }) {
    // ESTADOS DEL JUGADOR Y JEFE
    const [hpJefe, setHpJefe] = useState(30); // Hay que acertar 30 veces
    const [vidasJugador, setVidasJugador] = useState(3);
    
    // SISTEMA DE PP (Power Points) y PROGRESO
    const [usos, setUsos] = useState({
        vf: 10,
        test: 10,
        huecos: 10,
        palabra: 10
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

        // Buscamos la lista de preguntas según el ataque
        let listaPreguntas = [];
        if (tipoAtaque === 'vf') listaPreguntas = nivel.ataque_vf || [];
        if (tipoAtaque === 'test') listaPreguntas = nivel.ataque_test || [];
        if (tipoAtaque === 'huecos') listaPreguntas = nivel.ataque_huecos || [];
        if (tipoAtaque === 'palabra') listaPreguntas = nivel.ataque_palabra || [];

        // Calculamos el índice basado en los usos gastados (ej: si quedan 9, usamos el índice 1)
        const indice = 10 - usos[tipoAtaque]; 
        const preguntaElegida = listaPreguntas[indice];

        if (!preguntaElegida) {
            setMensajeDialogo("¡Este ataque parece estar bloqueado por la IA!");
            return;
        }

        // Restamos 1 PP
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
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in font-sans h-full justify-center">
            
            {/* PANTALLA DE BATALLA (Visual RPG) */}
            <div className="bg-[#12121a] border-4 border-gray-700 rounded-2xl p-8 relative shadow-[0_0_40px_rgba(0,0,0,0.8)] h-72 flex flex-col justify-between overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                
                {/* HUD: JEFE */}
                <div className="self-end bg-[#252532] border-2 border-red-900 p-4 rounded-xl w-72 shadow-lg z-10">
                    <h3 className="font-black text-red-500 uppercase tracking-widest text-sm mb-2 flex justify-between">
                        <span>🏰 Gran Jefe de Estudio</span>
                        <span>HP: {hpJefe}/30</span>
                    </h3>
                    <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                        <div className="h-full bg-red-500 transition-all duration-1000 ease-out" style={{ width: `${(hpJefe / 30) * 100}%` }}></div>
                    </div>
                </div>

                {/* HUD: JUGADOR */}
                <div className="self-start bg-[#252532] border-2 border-indigo-900 p-4 rounded-xl w-64 shadow-lg z-10 mt-auto">
                    <h3 className="font-black text-indigo-400 uppercase tracking-widest text-sm mb-2 flex justify-between">
                        <span>🧑‍🚀 Estudiante</span>
                    </h3>
                    <div className="flex gap-1 text-2xl">
                        {[1, 2, 3].map((v) => (
                            <span key={v} className={`transition-all duration-300 ${vidasJugador >= v ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'opacity-20 grayscale scale-75'}`}>❤️</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ZONA DE INTERACCIÓN (Caja de Diálogo / Menú / Pregunta) */}
            <div className="bg-[#1e1e28] border-4 border-double border-gray-500 rounded-xl shadow-xl min-h-[220px] p-6 relative">
                
                {fase === 'menu_ataques' && (
                    <div className="h-full flex flex-col justify-center">
                        <span className="text-white font-bold mb-4 block">¿Qué ataque vas a usar?</span>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => elegirAtaque('test')} disabled={usos.test === 0} className="p-4 bg-blue-900/40 hover:bg-blue-600 border-2 border-blue-500 rounded-xl text-left font-bold text-white transition disabled:opacity-30 flex justify-between items-center">
                                <span>Ataque Test</span> <span className="text-sm font-mono bg-black/50 px-2 py-1 rounded">PP {usos.test}/10</span>
                            </button>
                            <button onClick={() => elegirAtaque('vf')} disabled={usos.vf === 0} className="p-4 bg-green-900/40 hover:bg-green-600 border-2 border-green-500 rounded-xl text-left font-bold text-white transition disabled:opacity-30 flex justify-between items-center">
                                <span>Golpe V/F</span> <span className="text-sm font-mono bg-black/50 px-2 py-1 rounded">PP {usos.vf}/10</span>
                            </button>
                            <button onClick={() => elegirAtaque('huecos')} disabled={usos.huecos === 0} className="p-4 bg-yellow-900/40 hover:bg-yellow-600 border-2 border-yellow-500 rounded-xl text-left font-bold text-white transition disabled:opacity-30 flex justify-between items-center">
                                <span>Rayo Huecos</span> <span className="text-sm font-mono bg-black/50 px-2 py-1 rounded">PP {usos.huecos}/10</span>
                            </button>
                            <button onClick={() => elegirAtaque('palabra')} disabled={usos.palabra === 0} className="p-4 bg-purple-900/40 hover:bg-purple-600 border-2 border-purple-500 rounded-xl text-left font-bold text-white transition disabled:opacity-30 flex justify-between items-center">
                                <span>Impacto Exacto</span> <span className="text-sm font-mono bg-black/50 px-2 py-1 rounded">PP {usos.palabra}/10</span>
                            </button>
                        </div>
                    </div>
                )}

                {(fase === 'dialogo_resultado' || fase === 'inicio') && (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-white text-2xl font-mono leading-relaxed text-center animate-fade-in">{mensajeDialogo}</p>
                    </div>
                )}

                {fase === 'ejecutando_ataque' && preguntaActiva && (
                    <div className="animate-fade-in-up flex flex-col items-center gap-4">
                        <h3 className="text-xl font-bold text-white text-center mb-2">
                            {ataqueActual === 'huecos' ? null : (preguntaActiva.pregunta || preguntaActiva.definicion)}
                        </h3>

                        {/* RENDERIZADO DINÁMICO DEL ATAQUE */}
                        {ataqueActual === 'test' || ataqueActual === 'vf' ? (
                            <div className="grid grid-cols-2 gap-3 w-full">
                                {preguntaActiva.opciones.map((opt, i) => (
                                    <button key={i} onClick={() => procesarResultado(opt === preguntaActiva.correcta)} className="p-4 bg-[#252532] hover:bg-indigo-600 border border-gray-600 hover:border-indigo-400 rounded-xl font-bold text-white transition">
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : ataqueActual === 'huecos' ? (
                            <div className="-mt-4 w-full">
                                <RellenarHuecos frase={preguntaActiva.frase} respuestaCorrecta={preguntaActiva.respuesta_correcta} onResultado={procesarResultado} />
                            </div>
                        ) : (
                            <form onSubmit={manejarSubmitPalabra} className="flex gap-4 w-full justify-center">
                                <input type="text" value={textoPalabra} onChange={(e)=>setTextoPalabra(e.target.value)} autoFocus className="bg-[#252532] border-2 border-indigo-500 p-4 rounded-xl text-white font-bold text-xl outline-none" placeholder="Palabra exacta..." />
                                <button type="submit" disabled={!textoPalabra} className="bg-indigo-600 hover:bg-indigo-500 font-bold px-8 py-4 rounded-xl text-white disabled:opacity-50">¡Atacar!</button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}