import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown';

// ==========================================
// COMPONENTE 1: DASHBOARD
// ==========================================
function Dashboard() {
  const [cuadernos, setCuadernos] = useState({});
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const navigate = useNavigate();

  useEffect(() => { cargarCuadernos(); }, []);

  const cargarCuadernos = () => {
    fetch("http://localhost:8000/api/notebooks")
      .then(res => res.json())
      .then(data => setCuadernos(data))
      .catch(err => console.error(err));
  };

  const handleCrearCuaderno = (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim()) return;

    fetch("http://localhost:8000/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: nuevoTitulo })
    })
      .then(res => res.json())
      .then(data => navigate(`/notebook/${data.id}`));
  };

  return (
    <div className="min-h-screen bg-[#1e1e24] text-gray-200 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold mb-8">StudyFlow: Cuadernos</h1>
        <form onSubmit={handleCrearCuaderno} className="mb-10 flex gap-4">
          <input type="text" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} placeholder="Nueva asignatura..." className="bg-[#2a2a35] border border-gray-600 rounded-lg px-4 py-3 w-80 focus:outline-none focus:border-blue-500 transition"/>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition">+ Crear cuaderno</button>
        </form>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Object.entries(cuadernos).map(([id, datos]) => (
            <div key={id} onClick={() => navigate(`/notebook/${id}`)} className="bg-[#2a2a35] border border-transparent hover:border-gray-500 rounded-xl p-6 cursor-pointer transition shadow-sm hover:shadow-md flex flex-col h-40">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500/20 p-2 rounded-full"><span className="text-xl">📘</span></div>
                <h3 className="text-lg font-medium truncate">{datos.titulo}</h3>
              </div>
              <div className="mt-auto text-sm text-gray-400">
                <p>{datos.creado.split(' ')[0]} • {datos.fuentes?.length || 0} fuentes</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE 2: VISTA INDIVIDUAL
// ==========================================
function VistaCuaderno() {
  const { id } = useParams();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFichero, setSubiendoFichero] = useState(false);
  const [iaPensando, setIaPensando] = useState(false);

  // CONTROL DE VISTAS ('chat', 'resumen', 'quiz')
  const [vistaActiva, setVistaActiva] = useState('chat');

  // --- ESTADOS DE RESUMEN ---
  const [resumenActivo, setResumenActivo] = useState(0); // Índice de pestaña
  const [creandoNuevoResumen, setCreandoNuevoResumen] = useState(false);
  const [fuentesSeleccionadas, setFuentesSeleccionadas] = useState([]);

  // --- ESTADOS DEL QUIZ ---
  const [preguntas, setPreguntas] = useState([]);      
  const [indicePregunta, setIndicePregunta] = useState(0);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
  const [mostrandoResultado, setMostrandoResultado] = useState(false); 
  const [mostrandoPista, setMostrandoPista] = useState(false);
  const [puntuacion, setPuntuacion] = useState(0);
  const [omitidas, setOmitidas] = useState(0);
  const [quizFinalizado, setQuizFinalizado] = useState(false);

  const cargarDatosCuaderno = () => {
    fetch(`http://localhost:8000/api/notebooks/${id}`)
      .then(res => res.json())
      .then(data => { 
        setDatos(data); 
        setCargando(false);
        // Si no hay resúmenes, forzamos la vista de creación cuando entren a resumen
        if (!data.resumenes || data.resumenes.length === 0) {
            setCreandoNuevoResumen(true);
        }
      })
      .catch(err => { console.error(err); setCargando(false); });
  };

  useEffect(() => { cargarDatosCuaderno(); }, [id]);

  const handleSubirArchivo = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") return alert("Solo PDFs.");
    setSubiendoFichero(true);
    const formData = new FormData();
    formData.append("file", file);

    fetch(`http://localhost:8000/api/notebooks/${id}/files`, {
      method: "POST", body: formData
    })
    .then(() => {
      setSubiendoFichero(false);
      cargarDatosCuaderno();
    })
    .catch(err => { console.error(err); setSubiendoFichero(false); });
  };

  // --- LÓGICA DE RESÚMENES ---
  const abrirPestanaResumen = () => {
      setVistaActiva('resumen');
      if (datos?.resumenes?.length > 0) {
          setCreandoNuevoResumen(false);
          setResumenActivo(datos.resumenes.length - 1); // Va a la última pestaña (el más reciente)
      } else {
          setCreandoNuevoResumen(true);
      }
  };

  const toggleFuente = (fuente) => {
      setFuentesSeleccionadas(prev => 
          prev.includes(fuente) ? prev.filter(f => f !== fuente) : [...prev, fuente]
      );
  };

  const solicitarGeneracionResumen = () => {
      if (fuentesSeleccionadas.length === 0) return alert("Selecciona al menos 1 fuente.");
      setIaPensando(true);
      
      fetch(`http://localhost:8000/api/notebooks/${id}/summary`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fuentes: fuentesSeleccionadas })
      })
      .then(res => res.json())
      .then(() => {
          setIaPensando(false);
          setCreandoNuevoResumen(false);
          cargarDatosCuaderno(); // Recarga y pintará la nueva pestaña
      })
      .catch(err => { console.error(err); setIaPensando(false); });
  };

  // --- LÓGICA DEL QUIZ ---
  const handleIniciarQuiz = () => {
    setVistaActiva('quiz');
    setIaPensando(true);
    fetch(`http://localhost:8000/api/notebooks/${id}/quiz`, { method: "POST" })
      .then(res => res.json())
      .then(data => {
          setPreguntas(data.quiz);
          setIndicePregunta(0);
          setPuntuacion(0);
          setOmitidas(0);
          setQuizFinalizado(false);
          setIaPensando(false);
          setMostrandoPista(false);
      });
  };

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

  if (cargando) return <div className="h-screen bg-[#1e1e24] flex items-center justify-center text-white">Iniciando sistemas...</div>;

  return (
    <div className="h-screen bg-[#1e1e24] text-gray-200 font-sans flex flex-col overflow-hidden">
      <header className="border-b border-gray-700 bg-[#2a2a35] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition bg-gray-700 px-3 py-1 rounded">⬅ Volver</Link>
            <h1 className="text-xl font-bold">📘 {datos.titulo}</h1>
        </div>
        {/* Navegador central */}
        <div className="flex bg-gray-800 rounded-lg p-1">
            <button onClick={() => setVistaActiva('chat')} className={`px-4 py-1 rounded-md text-sm transition ${vistaActiva === 'chat' ? 'bg-blue-600 font-bold' : 'text-gray-400 hover:text-white'}`}>💬 Chat</button>
            <button onClick={abrirPestanaResumen} className={`px-4 py-1 rounded-md text-sm transition ${vistaActiva === 'resumen' ? 'bg-blue-600 font-bold' : 'text-gray-400 hover:text-white'}`}>📝 Resúmenes</button>
            <button onClick={() => setVistaActiva('quiz')} className={`px-4 py-1 rounded-md text-sm transition ${vistaActiva === 'quiz' ? 'bg-blue-600 font-bold' : 'text-gray-400 hover:text-white'}`}>❓ Test</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* COL 1: FUENTES */}
        <div className="w-1/4 border-r border-gray-700 p-4 bg-[#212128] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">📂 Fuentes</h2>
            <div className="relative mb-4">
                <input type="file" accept=".pdf" onChange={handleSubirArchivo} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <button className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm transition">+ Añadir PDF</button>
            </div>
            {datos.fuentes?.map((f, i) => <div key={i} className="bg-gray-800 border border-gray-700 p-3 rounded-lg text-sm mb-2 break-words shadow-sm">📄 {f}</div>)}
        </div>

        {/* COL 2: VISTA DINÁMICA CENTRAL */}
        <div className="w-2/4 flex flex-col bg-[#1e1e24] border-r border-gray-700">
          <div className="flex-1 p-6 overflow-y-auto">
            
            {/* --- VISTA: CHAT --- */}
            {vistaActiva === 'chat' && (
              <div className="flex items-center justify-center h-full text-gray-500 flex-col">
                  <span className="text-6xl mb-4">💬</span>
                  <p>El chat con el documento está en construcción.</p>
                  <p className="text-sm mt-2">Usa las pestañas superiores para ver los resúmenes o el test.</p>
              </div>
            )}

            {/* --- VISTA: RESUMEN --- */}
            {vistaActiva === 'resumen' && (
              <div className="flex flex-col h-full">
                  {creandoNuevoResumen || !datos.resumenes?.length ? (
                      /* PANTALLA: SELECCIONAR FUENTES */
                      <div className="bg-[#2a2a35] p-8 rounded-2xl border border-gray-700 shadow-xl max-w-lg mx-auto w-full mt-10">
                          <h2 className="text-2xl font-bold mb-2">Nuevo Resumen</h2>
                          <p className="text-gray-400 text-sm mb-6">Selecciona de qué PDFs quieres extraer la información.</p>
                          
                          {datos.fuentes?.length === 0 ? (
                              <p className="text-red-400 p-4 bg-red-900/20 rounded-lg">No hay PDFs subidos. Sube uno a la izquierda.</p>
                          ) : (
                              <div className="space-y-3 mb-8">
                                  {datos.fuentes.map((f, i) => (
                                      <label key={i} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${fuentesSeleccionadas.includes(f) ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 bg-gray-800'}`}>
                                          <input type="checkbox" className="w-5 h-5 accent-blue-500" checked={fuentesSeleccionadas.includes(f)} onChange={() => toggleFuente(f)}/>
                                          <span className="text-sm truncate">{f}</span>
                                      </label>
                                  ))}
                              </div>
                          )}
                          <button onClick={solicitarGeneracionResumen} disabled={iaPensando || datos.fuentes?.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 p-4 rounded-xl font-bold transition flex justify-center items-center">
                              {iaPensando ? "🧠 Procesando..." : "✨ Generar Resumen Mágico"}
                          </button>
                          {datos.resumenes?.length > 0 && !iaPensando && (
                              <button onClick={() => setCreandoNuevoResumen(false)} className="w-full text-gray-400 text-sm mt-4 hover:text-white transition">Cancelar y volver</button>
                          )}
                      </div>
                  ) : (
                      /* PANTALLA: VER RESÚMENES (PESTAÑAS) */
                      <div className="flex flex-col h-full">
                          <div className="flex gap-2 overflow-x-auto pb-4 shrink-0 border-b border-gray-700 mb-6">
                              {datos.resumenes.map((res, idx) => (
                                  <button key={res.id} onClick={() => setResumenActivo(idx)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm transition ${resumenActivo === idx ? 'bg-blue-600 text-white font-bold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                                      Resumen {idx + 1} <span className="text-xs opacity-70 ml-2">({res.fecha})</span>
                                  </button>
                              ))}
                              <button onClick={() => { setCreandoNuevoResumen(true); setFuentesSeleccionadas([...datos.fuentes]); }} className="whitespace-nowrap px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition font-bold shadow-md">
                                  + Nuevo
                              </button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto">
                              <div className="bg-[#2a2a35] p-8 rounded-2xl border border-gray-700 shadow-lg">
                                  <div className="mb-6 pb-6 border-b border-gray-700 text-sm text-gray-400">
                                      <p className="font-bold text-gray-300 mb-2">📚 Fuentes utilizadas:</p>
                                      <ul className="list-disc pl-5 space-y-1">
                                          {datos.resumenes[resumenActivo].fuentes_usadas.map((f,i) => <li key={i}>{f}</li>)}
                                      </ul>
                                  </div>
                                  <div className="prose prose-invert prose-blue max-w-none prose-headings:text-blue-300">
                                      <ReactMarkdown>{datos.resumenes[resumenActivo].texto}</ReactMarkdown>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
            )}

            {/* --- VISTA: QUIZ --- */}
            {vistaActiva === 'quiz' && (
              <div className="max-w-2xl mx-auto h-full flex flex-col justify-center py-10">
                {iaPensando ? (
                    <div className="text-center animate-pulse text-gray-400">🧠 Formulando preguntas retadoras...</div>
                ) : !quizFinalizado && preguntas.length > 0 ? (
                  <div className="bg-[#2a2a35] p-8 rounded-3xl border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xs font-bold text-blue-400 tracking-widest uppercase">Pregunta {indicePregunta + 1} de {preguntas.length}</span>
                      <div className="h-1 w-32 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{width: `${((indicePregunta+1)/preguntas.length)*100}%`}}></div>
                      </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-4 leading-tight">{preguntas[indicePregunta].pregunta}</h2>
                    
                    {/* BOTÓN PISTA */}
                    <div className="mb-8">
                        <button onClick={() => setMostrandoPista(!mostrandoPista)} className="text-yellow-500/80 hover:text-yellow-400 text-sm font-bold flex items-center gap-2 transition">
                            💡 {mostrandoPista ? "Ocultar pista" : "¿Necesitas una pista?"}
                        </button>
                        {mostrandoPista && (
                            <div className="mt-3 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl text-sm text-yellow-200/80 italic">
                                "{preguntas[indicePregunta].pista}"
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                      {preguntas[indicePregunta].opciones.map((opc, i) => {
                        let color = "bg-[#353542] border-transparent hover:border-gray-500";
                        if (mostrandoResultado) {
                          if (opc === preguntas[indicePregunta].correcta) color = "bg-green-500/20 border-green-500 text-green-200";
                          else if (opc === opcionSeleccionada) color = "bg-red-500/20 border-red-500 text-red-200";
                          else color = "opacity-50 bg-[#353542]";
                        } else if (opcionSeleccionada === opc) {
                          color = "border-blue-500 bg-blue-500/10";
                        }
                        
                        return (
                          <button key={i} disabled={mostrandoResultado} onClick={() => setOpcionSeleccionada(opc)} className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${color}`}>
                            <span className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-bold shrink-0">{String.fromCharCode(65 + i)}</span>
                            {opc}
                          </button>
                        )
                      })}
                    </div>

                    {mostrandoResultado && (
                      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm italic text-blue-200">
                        📖 {preguntas[indicePregunta].explicacion}
                      </div>
                    )}

                    <div className="mt-10 flex gap-4">
                      {!mostrandoResultado ? (
                        <>
                            {/* BOTÓN OMITIR */}
                            <button onClick={omitirPregunta} className="flex-1 bg-gray-700 hover:bg-gray-600 p-4 rounded-2xl font-bold transition text-gray-300">
                                ⏭️ Omitir
                            </button>
                            <button onClick={resolverPregunta} disabled={!opcionSeleccionada} className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-2xl font-bold transition">
                                ✅ Resolver
                            </button>
                        </>
                      ) : (
                        <button onClick={siguientePregunta} className="w-full bg-gray-600 hover:bg-gray-500 p-4 rounded-2xl font-bold transition">
                            Siguiente ➡️
                        </button>
                      )}
                    </div>
                  </div>
                ) : preguntas.length > 0 ? (
                  /* RESULTADOS */
                  <div className="text-center bg-[#2a2a35] p-12 rounded-3xl border border-gray-700 shadow-2xl">
                    <div className="w-32 h-32 rounded-full border-8 border-blue-500 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl font-black">{Math.round((puntuacion/preguntas.length)*100)}%</span>
                    </div>
                    <h2 className="text-3xl font-bold mb-8">¡Test Finalizado!</h2>
                    <div className="grid grid-cols-3 gap-4 mb-10">
                      <div className="bg-green-500/10 p-4 rounded-2xl"><div className="text-2xl font-bold text-green-500">{puntuacion}</div><div className="text-xs text-green-500/70 uppercase font-bold">Correctas</div></div>
                      <div className="bg-red-500/10 p-4 rounded-2xl"><div className="text-2xl font-bold text-red-500">{preguntas.length - puntuacion - omitidas}</div><div className="text-xs text-red-500/70 uppercase font-bold">Incorrectas</div></div>
                      <div className="bg-gray-500/10 p-4 rounded-2xl"><div className="text-2xl font-bold text-gray-400">{omitidas}</div><div className="text-xs text-gray-500/70 uppercase font-bold">Omitidas</div></div>
                    </div>
                    <button onClick={handleIniciarQuiz} className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-bold transition">🔁 Repetir Test</button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* COL 3: HERRAMIENTAS DIRECTAS */}
        <div className="w-1/4 p-4 bg-[#212128]">
          <h2 className="text-lg font-semibold mb-6">Studio</h2>
          <div className="space-y-3">
            <button onClick={abrirPestanaResumen} className="w-full bg-[#2a2a35] hover:bg-gray-700 p-4 rounded-2xl text-sm font-bold flex justify-between items-center transition border border-gray-700 shadow-sm">
              📝 Resúmenes {datos.resumenes?.length > 0 && <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">{datos.resumenes.length}</span>}
            </button>
            <button onClick={handleIniciarQuiz} className="w-full bg-[#2a2a35] hover:bg-gray-700 p-4 rounded-2xl text-sm font-bold flex justify-between items-center transition border border-gray-700 shadow-sm">
              ❓ Cuestionario {datos.quiz && "✅"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/notebook/:id" element={<VistaCuaderno />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;