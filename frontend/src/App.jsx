import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'

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
      .catch(err => console.error("Error:", err));
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
        <h1 className="text-3xl font-semibold mb-8">StudyFlow: Cuadernos recientes</h1>
        <form onSubmit={handleCrearCuaderno} className="mb-10 flex gap-4">
          <input type="text" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} placeholder="Nombre de la nueva asignatura..." className="bg-[#2a2a35] border border-gray-600 rounded-lg px-4 py-3 w-80 focus:outline-none focus:border-blue-500 transition"/>
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
// COMPONENTE 2: VISTA INDIVIDUAL DEL CUADERNO
// ==========================================
function VistaCuaderno() {
  const { id } = useParams();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFichero, setSubiendoFichero] = useState(false);
  
  // NUEVO: Estado para el chat/resumen central
  const [historialChat, setHistorialChat] = useState([
    { rol: 'ia', texto: 'Sistema Preparado. La conexión con la base de datos está activa. Sube tus PDFs a la izquierda para alimentar el contexto de este cuaderno.' }
  ]);
  const [iaPensando, setIaPensando] = useState(false);

  const cargarDatosCuaderno = () => {
    fetch(`http://localhost:8000/api/notebooks/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("No encontrado");
        return res.json();
      })
      .then(data => { setDatos(data); setCargando(false); })
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
      method: "POST",
      body: formData
    })
    .then(res => res.json())
    .then(() => {
      setSubiendoFichero(false);
      cargarDatosCuaderno();
      // Le avisamos por el chat que el PDF se ha leído
      setHistorialChat(prev => [...prev, { rol: 'ia', texto: `📄 Archivo '${file.name}' procesado y añadido al contexto.` }]);
    })
    .catch(err => { console.error(err); setSubiendoFichero(false); });
  };

  // NUEVA FUNCIÓN: Pedir Resumen a la IA
  const handleGenerarResumen = () => {
    if (datos?.fuentes?.length === 0) {
        setHistorialChat(prev => [...prev, { rol: 'ia', texto: "⚠️ No hay fuentes. Sube un PDF primero." }]);
        return;
    }

    setIaPensando(true);
    setHistorialChat(prev => [...prev, { rol: 'user', texto: "Por favor, génere un resumen de todos mis apuntes." }]);

    fetch(`http://localhost:8000/api/notebooks/${id}/summary`, { method: "POST" })
      .then(res => {
          if (!res.ok) throw new Error("Error en el servidor");
          return res.json();
      })
      .then(data => {
          setHistorialChat(prev => [...prev, { rol: 'ia', texto: data.resultado }]);
          setIaPensando(false);
      })
      .catch(err => {
          console.error(err);
          setHistorialChat(prev => [...prev, { rol: 'ia', texto: "❌ Hubo un error al conectar con el cerebro de la IA." }]);
          setIaPensando(false);
      });
  };

  if (cargando) return <div className="min-h-screen bg-[#1e1e24] text-white p-8 flex justify-center items-center"><div className="animate-pulse">Cargando el cerebro...</div></div>;
  if (!datos) return <div className="min-h-screen bg-[#1e1e24] text-white p-8">Error: Cuaderno no encontrado. <Link to="/" className="text-blue-400 underline">Volver al inicio</Link></div>;

  return (
    <div className="min-h-screen bg-[#1e1e24] text-gray-200 font-sans flex flex-col">
      <header className="border-b border-gray-700 bg-[#2a2a35] p-4 flex items-center gap-4">
        <Link to="/" className="text-gray-400 hover:text-white transition bg-gray-700 px-3 py-1 rounded">⬅ Volver</Link>
        <h1 className="text-xl font-bold">📘 {datos.titulo}</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* COLUMNA 1: FUENTES */}
        <div className="w-1/4 border-r border-gray-700 p-4 bg-[#212128]">
          <h2 className="text-lg font-semibold mb-4">📂 Fuentes</h2>
          <div className="relative mb-4">
            <input type="file" accept=".pdf" onChange={handleSubirArchivo} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={subiendoFichero}/>
            <button className={`w-full p-2 rounded text-sm transition ${subiendoFichero ? 'bg-blue-800 text-gray-300' : 'bg-gray-700 hover:bg-gray-600'}`}>
              {subiendoFichero ? '⏳ Subiendo...' : '+ Añadir PDF'}
            </button>
          </div>
          <div className="space-y-2">
            {datos.fuentes?.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay fuentes aún.</p>
            ) : (
              datos.fuentes?.map((f, i) => <div key={i} className="bg-gray-800 border border-gray-700 p-3 rounded-lg text-sm break-words shadow-sm flex items-center gap-2">📄 <span className="truncate">{f}</span></div>)
            )}
          </div>
        </div>

        {/* COLUMNA 2: CHAT INTELIGENTE */}
        <div className="w-2/4 flex flex-col bg-[#1e1e24]">
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {historialChat.map((msg, index) => (
              <div key={index} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-xl text-sm leading-relaxed shadow-sm ${msg.rol === 'user' ? 'bg-blue-600 text-white' : 'bg-[#2a2a35] border border-gray-700 text-gray-200'}`}>
                   {/* Renderizamos el Markdown envolviéndolo en un div para evitar el error de className */}
                    {msg.rol === 'ia' ? (
                        <div className="text-gray-200">
                            <ReactMarkdown>
                                {msg.texto}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        msg.texto
                    )}
                </div>
              </div>
            ))}
            {iaPensando && (
                <div className="flex justify-start">
                    <div className="bg-[#2a2a35] border border-gray-700 p-4 rounded-xl text-sm text-gray-400 animate-pulse">
                        🧠 Procesando documentos y pensando...
                    </div>
                </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-700">
            <input type="text" placeholder="Pregunta algo sobre las fuentes... (Próximamente)" disabled className="w-full bg-[#2a2a35] border border-gray-600 rounded-lg p-3 text-sm focus:outline-none opacity-50 cursor-not-allowed"/>
          </div>
        </div>

        {/* COLUMNA 3: HERRAMIENTAS */}
        <div className="w-1/4 border-l border-gray-700 p-4 bg-[#212128]">
          <h2 className="text-lg font-semibold mb-4">🛠️ Studio</h2>
          <div className="space-y-3">
            {/* AQUÍ CONECTAMOS EL BOTÓN A LA FUNCIÓN */}
            <button 
                onClick={handleGenerarResumen}
                disabled={iaPensando}
                className={`w-full p-3 rounded-xl text-sm font-medium text-left flex justify-between items-center transition shadow-md ${iaPensando ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              <span>📝 Generar Resumen</span> <span>→</span>
            </button>
            <button className="w-full bg-[#2a2a35] border border-gray-700 p-3 rounded-xl text-sm font-medium text-left flex justify-between items-center opacity-50 cursor-not-allowed">
              <span>❓ Cuestionario (Siguiente)</span> <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ENRUTADOR
// ==========================================
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