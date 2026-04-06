import { useState, useEffect } from 'react';

export default function NivelBatalla({ nivel, alHuir, alCompletar }) {
    // 1. RECOLECCIÓN INTELIGENTE DE PREGUNTAS
    const obtenerPreguntas = () => {
        if (nivel?.preguntas) return nivel.preguntas;
        if (nivel?.tipo === 'minijefe' && nivel?.fase2_test) return nivel.fase2_test;
        return [];
    };
    const preguntas = obtenerPreguntas();

    // 2. LÓGICA DE TIEMPO
    const esGlobalTimer = nivel?.tipo === 'minijefe';
    const TIEMPO_MAXIMO = esGlobalTimer ? 90 : 15; 
    
    const [vidas, setVidas] = useState(3);
    const [indicePregunta, setIndicePregunta] = useState(0);
    const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_MAXIMO);
    
    // 3. ESTADOS DE LA INTERFAZ Y RESPUESTAS
    const [estadoBatalla, setEstadoBatalla] = useState('jugando'); 
    const [opcionSeleccionada, setOpcionSeleccionada] = useState(null); // Para Tests
    const [respuestaEscrita, setRespuestaEscrita] = useState(''); // Para Palabra Clave

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

    // Validación para Botones (Niveles 1, 2, 3, 5)
    const procesarRespuesta = (opcion) => {
        if (estadoBatalla !== 'jugando') return;
        setOpcionSeleccionada(opcion);
        const esCorrecta = opcion === preguntaActual?.correcta;
        evaluarAciertoFallo(esCorrecta);
    };

    // Validación para Palabra Exacta (Nivel 4)
    const procesarRespuestaEscrita = (e) => {
        e.preventDefault(); // Evita que el formulario recargue la página
        if (estadoBatalla !== 'jugando' || !respuestaEscrita.trim()) return;

        // NORMALIZADOR PRO: Quita tildes, pasa a minúsculas y quita espacios extra
        const normalizar = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
        
        const introducida = normalizar(respuestaEscrita);
        const correcta = normalizar(preguntaActual?.respuesta_exacta);

        evaluarAciertoFallo(introducida === correcta);
    };

    const evaluarAciertoFallo = (esCorrecta) => {
        if (esCorrecta) {
            setEstadoBatalla('acierto');
            setTimeout(() => avanzarPregunta(), 1500);
        } else {
            setEstadoBatalla('fallo');
            const nuevasVidas = vidas - 1;
            setVidas(nuevasVidas);
            setTimeout(() => {
                if (nuevasVidas <= 0) setEstadoBatalla('gameover');
                else avanzarPregunta();
            }, 2500); 
        }
    };

    const avanzarPregunta = () => {
        setOpcionSeleccionada(null);
        setRespuestaEscrita(''); // Limpiamos el input
        
        if (!esGlobalTimer) setTiempoRestante(TIEMPO_MAXIMO); 
        
        if (indicePregunta + 1 < preguntas.length) {
            setIndicePregunta(prev => prev + 1);
            setEstadoBatalla('jugando');
        } else {
            setEstadoBatalla('victoria');
        }
    };

    // --- PANTALLAS FINALES ---
    if (!preguntaActual && estadoBatalla === 'jugando') return <div className="absolute inset-0 z-50 bg-[#0d0d14] text-white flex items-center justify-center">Cargando arena...</div>;

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
                <button onClick={() => alCompletar(nivel.id)} className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-black py-4 px-10 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.6)] transition-all transform hover:scale-105 z-10">Continuar la Aventura</button>
            </div>
        );
    }

    const limitePeligro = esGlobalTimer ? 15 : 5; 
    const enPeligro = tiempoRestante <= limitePeligro && estadoBatalla === 'jugando';
    const esPalabraClave = nivel.tipo === 'palabra_clave';

    // --- PANTALLA PRINCIPAL DE COMBATE ---
    return (
        <div className="absolute inset-0 bg-[#0d0d14] z-50 flex flex-col font-sans select-none overflow-hidden">
            {/* EFECTOS DE FONDO */}
            <div className={`absolute inset-0 transition-colors duration-500 pointer-events-none 
                ${estadoBatalla === 'fallo' ? 'bg-red-900/30' : estadoBatalla === 'timeout' ? 'bg-orange-900/30' : estadoBatalla === 'acierto' ? 'bg-green-900/10' : enPeligro ? 'bg-red-900/10 animate-pulse' : 'bg-transparent'}`}>
            </div>

            {/* HUD SUPERIOR */}
            <header className="flex flex-col p-6 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10 gap-4">
                <div className="flex justify-between items-center w-full">
                    <div className="flex gap-2 text-2xl bg-black/50 p-3 rounded-2xl border border-white/10 shadow-inner">
                        {[1, 2, 3].map((v) => (
                            <span key={v} className={`transition-all duration-300 ${vidas >= v ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'opacity-20 grayscale scale-75'}`}>❤️</span>
                        ))}
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">{nivel.nombre}</span>
                        <span className="text-sm font-bold text-gray-400 mt-1">Pregunta {indicePregunta + 1} de {preguntas.length}</span>
                    </div>
                    <button onClick={alHuir} className="text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all">🏃‍♂️ Rendirse</button>
                </div>
                {/* BARRA DE TIEMPO */}
                <div className="w-full max-w-4xl mx-auto flex items-center gap-4 mt-2">
                    <span className={`text-xl font-black w-10 text-right ${enPeligro ? 'text-red-500 animate-bounce' : 'text-white'}`}>{tiempoRestante}s</span>
                    <div className="flex-1 h-3 bg-gray-800/80 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                        <div className={`h-full transition-all duration-1000 ease-linear rounded-full ${tiempoRestante > (TIEMPO_MAXIMO / 2) ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : tiempoRestante > limitePeligro ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]'}`} style={{ width: `${(tiempoRestante / TIEMPO_MAXIMO) * 100}%` }}></div>
                    </div>
                </div>
            </header>

            {/* ZONA CENTRAL */}
            <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full relative z-10">
                {/* Caja de Pregunta/Definición */}
                <div className={`bg-[#1e1e28] border shadow-2xl rounded-3xl p-10 w-full mb-10 text-center relative transition-colors duration-300 ${enPeligro ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'border-gray-700/50'}`}>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                        {esPalabraClave ? 'Adivina la Palabra' : nivel.tipo === 'minijefe' ? 'Minijefe' : 'Pregunta'}
                    </div>
                    <h2 className="text-3xl font-bold text-white leading-relaxed mt-4">
                        {esPalabraClave ? preguntaActual?.definicion : preguntaActual?.pregunta}
                    </h2>
                </div>

                {/* INTERFAZ DINÁMICA: Botones vs Input de Texto */}
                {esPalabraClave ? (
                    <form onSubmit={procesarRespuestaEscrita} className="w-full flex flex-col items-center gap-6">
                        <input 
                            type="text"
                            value={respuestaEscrita}
                            onChange={(e) => setRespuestaEscrita(e.target.value)}
                            disabled={estadoBatalla !== 'jugando'}
                            placeholder="Escribe la palabra o concepto exacto..."
                            autoFocus
                            className={`w-full max-w-2xl bg-[#252532] border-2 rounded-2xl p-6 text-center text-3xl font-bold text-white outline-none transition-all duration-300
                                ${estadoBatalla === 'acierto' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] text-green-400' : 
                                  estadoBatalla === 'fallo' || estadoBatalla === 'timeout' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] text-red-400' : 
                                  'border-gray-600 focus:border-indigo-500 focus:shadow-[0_0_30px_rgba(79,70,229,0.3)]'}`}
                        />
                        <button 
                            type="submit"
                            disabled={estadoBatalla !== 'jugando' || !respuestaEscrita.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-black uppercase tracking-widest py-4 px-12 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all transform hover:scale-105"
                        >
                            Confirmar
                        </button>
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
                            return (
                                <button key={i} disabled={estadoBatalla !== 'jugando'} onClick={() => procesarRespuesta(opcion)} className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left font-bold text-lg flex items-center gap-4 ${coloresClase}`}>
                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${estadoBatalla !== 'jugando' && opcion === preguntaActual?.correcta ? 'bg-green-500 text-white' : 'bg-black/30'}`}>{['A', 'B', 'C', 'D'][i]}</span>
                                    {opcion}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Paneles de Error o Timeout */}
                {(estadoBatalla === 'fallo' || estadoBatalla === 'timeout') && (
                    <div className="w-full mt-8 p-6 bg-red-950/40 border border-red-900/50 rounded-2xl animate-fade-in">
                        <span className="text-red-400 font-black block mb-2 uppercase text-sm tracking-widest">
                            {estadoBatalla === 'timeout' ? (esGlobalTimer ? '⏰ ¡EL CASTILLO SE HA DERRUMBADO!' : '⏰ ¡TIEMPO AGOTADO!') : '💥 ¡GOLPE CRÍTICO!'} 
                            - Respuesta Correcta: {esPalabraClave ? preguntaActual?.respuesta_exacta : preguntaActual?.correcta}
                        </span>
                        {preguntaActual?.explicacion && <p className="text-red-200/80">{preguntaActual.explicacion}</p>}
                    </div>
                )}
            </main>
        </div>
    );
}