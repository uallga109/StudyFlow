import { useState, useEffect } from 'react';

export default function NivelBatalla({ nivel, alHuir, alCompletar }) {
    // ESTADOS DEL JUGADOR
    const [vidas, setVidas] = useState(3);
    const [indicePregunta, setIndicePregunta] = useState(0);
    
    // ESTADOS DE LA INTERFAZ
    const [estadoBatalla, setEstadoBatalla] = useState('jugando'); // jugando, acierto, fallo, gameover, victoria
    const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);

    // Extraemos las preguntas del nivel (da igual si es Nivel 1 o 2, la propiedad se llama "preguntas")
    const preguntas = nivel?.preguntas || [];
    const preguntaActual = preguntas[indicePregunta];

    const procesarRespuesta = (opcion) => {
        if (estadoBatalla !== 'jugando') return; // Evitar doble clic
        
        setOpcionSeleccionada(opcion);
        const esCorrecta = opcion === preguntaActual.correcta;

        if (esCorrecta) {
            setEstadoBatalla('acierto');
            // Esperamos 1.5 segundos para mostrar el color verde y pasamos a la siguiente
            setTimeout(() => {
                avanzarPregunta();
            }, 1500);
        } else {
            setEstadoBatalla('fallo');
            const nuevasVidas = vidas - 1;
            setVidas(nuevasVidas);
            
            setTimeout(() => {
                if (nuevasVidas <= 0) {
                    setEstadoBatalla('gameover');
                } else {
                    avanzarPregunta();
                }
            }, 2000); // Damos 2 segundos para que el jugador lea por qué falló
        }
    };

    const avanzarPregunta = () => {
        setOpcionSeleccionada(null);
        if (indicePregunta + 1 < preguntas.length) {
            setIndicePregunta(prev => prev + 1);
            setEstadoBatalla('jugando');
        } else {
            setEstadoBatalla('victoria');
        }
    };

    // --- PANTALLAS FINALES (Game Over y Victoria) ---
    if (estadoBatalla === 'gameover') {
        return (
            <div className="absolute inset-0 bg-red-950/90 z-50 flex flex-col items-center justify-center text-white animate-fade-in">
                <span className="text-8xl mb-6">💀</span>
                <h2 className="text-5xl font-black text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">HAS CAÍDO</h2>
                <p className="text-xl text-red-200 mb-10">Tus conocimientos no han sido suficientes esta vez...</p>
                <button onClick={alHuir} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-10 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all transform hover:scale-105">
                    Volver al Mapa
                </button>
            </div>
        );
    }

    if (estadoBatalla === 'victoria') {
        return (
            <div className="absolute inset-0 bg-indigo-950/90 z-50 flex flex-col items-center justify-center text-white animate-fade-in">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
                <span className="text-8xl mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,1)]">🏆</span>
                <h2 className="text-5xl font-black text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">¡NIVEL COMPLETADO!</h2>
                <p className="text-xl text-indigo-200 mb-10">Has dominado los conceptos de esta zona.</p>
                <button onClick={() => alCompletar(nivel.id)} className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-black py-4 px-10 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.6)] transition-all transform hover:scale-105 z-10">
                    Reclamar Recompensa
                </button>
            </div>
        );
    }

    // --- PANTALLA PRINCIPAL DE COMBATE ---
    return (
        <div className="absolute inset-0 bg-[#0d0d14] z-50 flex flex-col font-sans select-none">
            {/* EFECTO DE DAÑO O CURACIÓN EN EL FONDO */}
            <div className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${estadoBatalla === 'fallo' ? 'bg-red-900/20' : estadoBatalla === 'acierto' ? 'bg-green-900/10' : 'bg-transparent'}`}></div>

            {/* HUD SUPERIOR */}
            <header className="flex justify-between items-center p-6 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10">
                {/* Zona Vidas */}
                <div className="flex gap-2 text-2xl bg-black/50 p-3 rounded-2xl border border-white/10 shadow-inner">
                    {[1, 2, 3].map((v) => (
                        <span key={v} className={`transition-all duration-300 ${vidas >= v ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'opacity-20 grayscale'}`}>
                            ❤️
                        </span>
                    ))}
                </div>

                {/* Zona Info Nivel y Progreso */}
                <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">{nivel.nombre}</span>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm font-bold text-gray-400">Pregunta {indicePregunta + 1}/{preguntas.length}</span>
                        <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((indicePregunta) / preguntas.length) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Botón Huir */}
                <button onClick={alHuir} className="text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all">
                    🏃‍♂️ Huir
                </button>
            </header>

            {/* ZONA CENTRAL: LA PREGUNTA */}
            <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full relative z-10">
                
                {/* Caja de la Pregunta */}
                <div className="bg-[#1e1e28] border border-gray-700/50 shadow-2xl rounded-3xl p-10 w-full mb-10 text-center relative">
                    {/* Badge tipo de mecánica */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                        {nivel.tipo === 'vf' ? 'Verdadero o Falso' : 'Tipo Test'}
                    </div>
                    <h2 className="text-3xl font-bold text-white leading-relaxed mt-4">
                        {preguntaActual?.pregunta}
                    </h2>
                </div>

                {/* Grid de Opciones */}
                <div className={`grid gap-4 w-full ${nivel.tipo === 'vf' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {preguntaActual?.opciones?.map((opcion, i) => {
                        // Lógica de colores según el estado
                        let coloresClase = "bg-[#252532] hover:bg-[#2d2d3d] border-gray-600 text-gray-200"; // Por defecto
                        
                        if (estadoBatalla !== 'jugando') {
                            if (opcion === preguntaActual.correcta) {
                                coloresClase = "bg-green-600/20 border-green-500 text-green-300 ring-2 ring-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
                            } else if (opcion === opcionSeleccionada) {
                                coloresClase = "bg-red-600/20 border-red-500 text-red-300 ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]";
                            } else {
                                coloresClase = "bg-[#1a1a24] border-transparent text-gray-600 opacity-50"; // Apagamos las demás
                            }
                        }

                        return (
                            <button 
                                key={i}
                                disabled={estadoBatalla !== 'jugando'}
                                onClick={() => procesarRespuesta(opcion)}
                                className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left font-bold text-lg flex items-center gap-4 ${coloresClase}`}
                            >
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${estadoBatalla !== 'jugando' && opcion === preguntaActual.correcta ? 'bg-green-500 text-white' : 'bg-black/30'}`}>
                                    {['A', 'B', 'C', 'D'][i]}
                                </span>
                                {opcion}
                            </button>
                        );
                    })}
                </div>

                {/* Panel de Explicación (Solo sale si fallas) */}
                {estadoBatalla === 'fallo' && (
                    <div className="w-full mt-8 p-6 bg-red-950/40 border border-red-900/50 rounded-2xl animate-fade-in">
                        <span className="text-red-400 font-black block mb-2 uppercase text-sm tracking-widest">💥 ¡Golpe Crítico! - Respuesta Correcta: {preguntaActual.correcta}</span>
                        <p className="text-red-200/80">{preguntaActual?.explicacion}</p>
                    </div>
                )}

            </main>
        </div>
    );
}