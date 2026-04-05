import { useState, useEffect } from 'react';

export default function Quiz({ id, datos, fuentesSeleccionadas, toggleFuente, recargarBD }) {
    // --- ESTADOS DEL QUIZ ---
    const [preguntas, setPreguntas] = useState([]);      
    const [indicePregunta, setIndicePregunta] = useState(0);
    const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
    const [mostrandoResultado, setMostrandoResultado] = useState(false); 
    const [mostrandoPista, setMostrandoPista] = useState(false);
    const [puntuacion, setPuntuacion] = useState(0);
    const [omitidas, setOmitidas] = useState(0);
    const [quizFinalizado, setQuizFinalizado] = useState(false);
    
    const [quizActivoIdx, setQuizActivoIdx] = useState(0); 
    const [configurandoQuiz, setConfigurandoQuiz] = useState(false);
    const [numPreguntas, setNumPreguntas] = useState(10);
    const [recomendacion, setRecomendacion] = useState(null);
    const [iaPensando, setIaPensando] = useState(false);

    const handleIniciarQuiz = () => {
        if (fuentesSeleccionadas.length === 0) return alert("Selecciona al menos una fuente");
    
        setIaPensando(true);
        
        fetch(`http://127.0.0.1:8000/api/notebooks/${id}/quiz`, { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                fuentes: fuentesSeleccionadas, 
                num_preguntas: numPreguntas 
            })
        })
        .then(res => {
            if (!res.ok) throw new Error("Error en el servidor");
            return res.json();
        })
        .then(data => {
            setIaPensando(false);
            setConfigurandoQuiz(false);
            const nuevasPreguntas = data.quiz || data.preguntas || [];
            setPreguntas(nuevasPreguntas); 
            setIndicePregunta(0);
            setQuizFinalizado(false);
            setOpcionSeleccionada(null);
            setMostrandoResultado(false);
            setPuntuacion(0);
            setOmitidas(0);
            recargarBD(); // Llamamos a la función de App.jsx para recargar el historial
        })
        .catch(err => {
            console.error(err);
            setIaPensando(false);
            alert("La IA está saturada o no hay texto suficiente. Prueba con menos preguntas.");
        });
      };
  
    useEffect(() => {
      if (configurandoQuiz && fuentesSeleccionadas.length > 0) {
          fetch(`http://127.0.0.1:8000/api/notebooks/${id}/quiz/recommend`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fuentes: fuentesSeleccionadas })
          })
          .then(res => res.json())
          .then(data => {
              setRecomendacion(data.recomendadas);
              setNumPreguntas(data.recomendadas);
          });
      }
    }, [fuentesSeleccionadas, configurandoQuiz, id]);
  
    const resolverPregunta = () => {
      if (opcionSeleccionada === preguntas[indicePregunta].correcta) setPuntuacion(puntuacion + 1);
      setMostrandoResultado(true);
    };
  
    const siguientePregunta = () => {
      setOpcionSeleccionada(null);
      setMostrandoResultado(false);
      setMostrandoPista(false);
      if (indicePregunta + 1 < preguntas.length) setIndicePregunta(indicePregunta + 1);
      else setQuizFinalizado(true);
    };
  
    const omitirPregunta = () => {
      setOmitidas(omitidas + 1);
      siguientePregunta();
    };

return (
        <div className="flex flex-col h-full">
            {/* Pestañas de Historial de Tests */}
            {!iaPensando && datos.quizzes?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 shrink-0 border-b border-gray-200 dark:border-gray-700 mb-6 custom-scrollbar">
                    {datos.quizzes.map((q, idx) => (
                        <button key={q.id} onClick={() => { setConfigurandoQuiz(false); setQuizActivoIdx(idx); setQuizFinalizado(false); setIndicePregunta(0); setPreguntas(q.preguntas); }} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm transition-all shadow-sm ${!configurandoQuiz && quizActivoIdx === idx ? 'bg-blue-600 text-white font-bold' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-transparent'}`}>
                            Test {idx + 1} <span className="text-xs opacity-70 ml-2">({q.fecha})</span>
                        </button>
                    ))}
                    <button onClick={() => { setConfigurandoQuiz(true); }} className="whitespace-nowrap px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition font-bold shadow-md">
                        + Nuevo Test
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto flex flex-col justify-center pr-2 custom-scrollbar">
                {iaPensando ? (
                    <div className="text-center animate-pulse text-gray-500 dark:text-gray-400 flex flex-col items-center">
                        <span className="text-5xl mb-4">🧠</span>
                        <p className="text-xl font-medium text-gray-800 dark:text-gray-200">Formulando preguntas basadas en tus fuentes...</p>
                        <p className="text-sm mt-2">Esto puede tardar un poco según el tamaño de los PDFs</p>
                    </div>
                ) : (configurandoQuiz || !datos.quizzes?.length) ? (
                    /* PANTALLA DE CONFIGURACIÓN */
                    <div className="bg-white dark:bg-[#2a2a35] p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl max-w-xl mx-auto w-full transition-colors">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-white">⚙️ Configurar nuevo Test</h2>
                        
                        <div className="mb-6">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">1. Selecciona las fuentes:</p>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {datos.fuentes.map((f, i) => (
                                    <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${fuentesSeleccionadas.includes(f) ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'}`}>
                                        <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={fuentesSeleccionadas.includes(f)} onChange={() => toggleFuente(f)}/>
                                        <span className="text-sm truncate text-gray-700 dark:text-gray-200">{f}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-600">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">2. Número de preguntas:</p>
                                <span className="bg-blue-600 px-3 py-1 rounded-full text-sm font-bold text-white">{numPreguntas}</span>
                            </div>
                            <input type="range" min="5" max="50" step="5" value={numPreguntas} onChange={(e) => setNumPreguntas(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-2"/>
                            {recomendacion && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-2">✨ Recomendado para tus documentos: <span className="underline">{recomendacion} preguntas</span></p>
                            )}
                        </div>

                        <button 
                            onClick={handleIniciarQuiz} 
                            disabled={fuentesSeleccionadas.length === 0 || iaPensando} 
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 p-4 rounded-xl font-bold transition-all shadow-lg text-white"
                        >
                            {iaPensando ? "🧠 Generando..." : "🚀 Comenzar Desafío"}
                        </button>
                        {datos.quizzes?.length > 0 && (
                            <button onClick={() => setConfigurandoQuiz(false)} className="w-full text-gray-500 text-sm mt-4 hover:text-gray-800 dark:hover:text-white transition">Volver al historial</button>
                        )}
                    </div>
            ) : (!quizFinalizado && preguntas.length > 0) ? (
            /* PANTALLA DE JUEGO (EL TEST INTERACTIVO) */
            <div className="bg-white dark:bg-[#2a2a35] p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl max-w-2xl mx-auto w-full transition-colors">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
                        Pregunta {indicePregunta + 1} de {preguntas.length}
                    </span>
                    <div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${((indicePregunta+1)/preguntas.length)*100}%`}}></div>
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold mb-4 leading-relaxed text-gray-800 dark:text-gray-100">
                    {preguntas[indicePregunta]?.pregunta}
                </h2>
                
                <div className="mb-8">
                    <button onClick={() => setMostrandoPista(!mostrandoPista)} className="text-yellow-600 dark:text-yellow-500/80 hover:text-yellow-500 text-sm font-bold flex items-center gap-2 transition">
                        💡 {mostrandoPista ? "Ocultar pista" : "¿Necesitas una pista?"}
                    </button>
                    {mostrandoPista && (
                        <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl text-sm text-yellow-800 dark:text-yellow-200/80 italic">
                            "{preguntas[indicePregunta]?.pista}"
                        </div>
                    )}
                </div>
                
                <div className="space-y-3">
                    {preguntas[indicePregunta]?.opciones?.map((opc, i) => {
                        // Colores por defecto para modo claro y oscuro
                        let color = "bg-gray-50 dark:bg-[#353542] border-gray-200 dark:border-transparent hover:border-blue-400 dark:hover:border-gray-500 shadow-sm text-gray-700 dark:text-gray-200";
                        
                        if (mostrandoResultado) {
                            if (opc === preguntas[indicePregunta]?.correcta) {
                                color = "bg-green-50 dark:bg-green-500/20 border-green-500 text-green-800 dark:text-green-200 ring-2 ring-green-500/50";
                            } else if (opc === opcionSeleccionada) {
                                color = "bg-red-50 dark:bg-red-500/20 border-red-500 text-red-800 dark:text-red-200 ring-2 ring-red-500/50";
                            } else {
                                color = "opacity-40 bg-gray-50 dark:bg-[#353542] border-gray-200 dark:border-transparent";
                            }
                        } else if (opcionSeleccionada === opc) {
                            color = "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-white ring-2 ring-blue-500/30";
                        }
                        
                        return (
                            <button key={i} disabled={mostrandoResultado} onClick={() => setOpcionSeleccionada(opc)} className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${color}`}>
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${mostrandoResultado && opc === preguntas[indicePregunta]?.correcta ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-black/20 text-gray-700 dark:text-gray-300'}`}>
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span className="text-sm font-medium">{opc}</span>
                            </button>
                        )
                    })}
                </div>

                {mostrandoResultado && (
                    <div className="mt-6 p-5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl text-sm text-blue-900 dark:text-blue-100 leading-relaxed shadow-inner">
                        <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">📖 Explicación:</span>
                        {preguntas[indicePregunta]?.explicacion}
                    </div>
                )}

                <div className="mt-10 flex gap-4">
                    {!mostrandoResultado ? (
                        <>
                            <button onClick={omitirPregunta} className="flex-1 bg-gray-100 dark:bg-[#353542] hover:bg-gray-200 dark:hover:bg-gray-600 p-4 rounded-2xl font-bold transition text-gray-600 dark:text-gray-300">⏭️ Omitir</button>
                            <button onClick={resolverPregunta} disabled={!opcionSeleccionada} className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 p-4 rounded-2xl font-bold transition text-white">✅ Resolver</button>
                        </>
                    ) : (
                        <button onClick={siguientePregunta} className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold transition text-white shadow-lg">Siguiente Pregunta ➡️</button>
                    )}
                </div>
            </div>
        ) : (
                    /* PANTALLA DE RESULTADOS */
                    <div className="text-center bg-white dark:bg-[#2a2a35] p-12 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl max-w-lg mx-auto w-full transition-colors">
                        <div className="w-32 h-32 rounded-full border-8 border-blue-500 flex items-center justify-center mx-auto mb-6 bg-blue-50 dark:bg-blue-500/10">
                            <span className="text-4xl font-black text-gray-800 dark:text-white">{Math.round((puntuacion/preguntas.length)*100)}%</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">¡Test Finalizado!</h2>
                        <div className="grid grid-cols-3 gap-4 mb-10">
                            <div className="bg-green-50 dark:bg-green-500/10 p-4 rounded-2xl border border-green-200 dark:border-green-500/20"><div className="text-3xl font-bold text-green-600 dark:text-green-500 mb-1">{puntuacion}</div><div className="text-[10px] text-green-700/80 dark:text-green-500/80 uppercase font-black tracking-wider">Correctas</div></div>
                            <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-200 dark:border-red-500/20"><div className="text-3xl font-bold text-red-600 dark:text-red-500 mb-1">{preguntas.length - puntuacion - omitidas}</div><div className="text-[10px] text-red-700/80 dark:text-red-500/80 uppercase font-black tracking-wider">Incorrectas</div></div>
                            <div className="bg-gray-100 dark:bg-gray-500/10 p-4 rounded-2xl border border-gray-200 dark:border-gray-500/20"><div className="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-1">{omitidas}</div><div className="text-[10px] text-gray-500/80 uppercase font-black tracking-wider">Omitidas</div></div>
                        </div>
                        <button onClick={() => { setIndicePregunta(0); setPuntuacion(0); setOmitidas(0); setQuizFinalizado(false); }} className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold transition text-white shadow-lg mb-3">🔁 Repetir este Test</button>
                        <button onClick={() => setConfigurandoQuiz(true)} className="w-full bg-gray-100 dark:bg-[#353542] hover:bg-gray-200 dark:hover:bg-gray-600 p-4 rounded-xl font-bold transition text-gray-700 dark:text-gray-300">Crear otro test diferente</button>
                    </div>
                )}
            </div>
        </div>
    );
}