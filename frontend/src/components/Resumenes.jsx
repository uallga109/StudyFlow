import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';

export default function Resumenes({ id, datos, fuentesSeleccionadas, toggleFuente, recargarBD }) {
    const [resumenActivo, setResumenActivo] = useState(0); 
    const [creandoNuevoResumen, setCreandoNuevoResumen] = useState(!datos?.resumenes?.length);
    const [iaPensando, setIaPensando] = useState(false);

    const solicitarGeneracionResumen = () => {
        if (fuentesSeleccionadas.length === 0) return alert("Selecciona al menos 1 fuente.");
        setIaPensando(true);
        
        fetch(`http://127.0.0.1:8000/api/notebooks/${id}/summary`, { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fuentes: fuentesSeleccionadas })
        })
        .then(res => res.json())
        .then(() => {
            setIaPensando(false);
            setCreandoNuevoResumen(false);
            recargarBD(); // Recarga y pintará la nueva pestaña
        })
        .catch(err => { console.error(err); setIaPensando(false); });
    };

    // Referencia para saber qué parte de la pantalla hay que imprimir
    const componentePDF = useRef(null);

    const descargarPDF = useReactToPrint({
        contentRef: componentePDF, 
        documentTitle: 'Resumen_StudyFlow',
        // Opcional: Esto le dice al navegador que imprima también los fondos oscuros
        pageStyle: `
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        `,
    });

    return (
        <div className="flex flex-col h-full">
            {creandoNuevoResumen || !datos.resumenes?.length ? (
                /* PANTALLA: SELECCIONAR FUENTES */
                <div className="bg-white dark:bg-[#2a2a35] p-10 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl max-w-lg mx-auto w-full mt-10 transition-colors">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                        <span className="text-2xl">📄</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Nuevo Resumen</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Selecciona de qué PDFs quieres extraer y sintetizar la información.</p>
                    
                    {datos.fuentes?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-[#1e1e24]">
                            <span className="text-gray-400 dark:text-gray-500 text-4xl mb-3">📁</span>
                            <p className="text-gray-500 dark:text-gray-400 text-center font-medium">No hay PDFs subidos.</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 text-center">Sube tus apuntes en la columna de la izquierda.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {datos.fuentes.map((f, i) => (
                                <label key={i} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${fuentesSeleccionadas.includes(f) ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${fuentesSeleccionadas.includes(f) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-[#1e1e24]'}`}>
                                        {fuentesSeleccionadas.includes(f) && <span className="text-white text-xs">✓</span>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={fuentesSeleccionadas.includes(f)} onChange={() => toggleFuente(f)}/>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{f}</span>
                                </label>
                            ))}
                        </div>
                    )}
                    <button onClick={solicitarGeneracionResumen} disabled={iaPensando || datos.fuentes?.length === 0 || fuentesSeleccionadas.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 p-4 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 text-white">
                        {iaPensando ? (
                            <><span className="animate-spin">⏳</span> Procesando síntesis...</>
                        ) : "✨ Generar Resumen Mágico"}
                    </button>
                    {datos.resumenes?.length > 0 && !iaPensando && (
                        <button onClick={() => setCreandoNuevoResumen(false)} className="w-full text-gray-500 font-medium text-sm mt-4 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                            Cancelar y volver al historial
                        </button>
                    )}
                </div>
            ) : (
                /* PANTALLA: VER RESÚMENES (PESTAÑAS) */
                <div className="flex flex-col h-full">
                    <div className="flex gap-2 overflow-x-auto pb-4 shrink-0 border-b border-gray-200 dark:border-gray-700 mb-6 custom-scrollbar">
                        {datos.resumenes.map((res, idx) => (
                            <button key={res.id} onClick={() => setResumenActivo(idx)} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 ${resumenActivo === idx ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-500/50 ring-offset-2 ring-offset-white dark:ring-offset-[#1e1e24]' : 'bg-white dark:bg-[#2a2a35] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'}`}>
                                <span>Resumen {idx + 1}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${resumenActivo === idx ? 'bg-blue-800 text-blue-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                    {res.fecha}
                                </span>
                            </button>
                        ))}
                        <button onClick={() => { setCreandoNuevoResumen(true); }} className="whitespace-nowrap px-5 py-2.5 rounded-xl text-sm bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-600 hover:text-indigo-700 dark:hover:text-white transition-all font-bold flex items-center gap-2 ml-2">
                            <span>➕</span> Nuevo Resumen
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span>📚</span> Documento Sintetizado
                            </h3>
                            <button onClick={descargarPDF} className="bg-white dark:bg-[#2a2a35] hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm text-gray-700 dark:text-gray-300 dark:hover:text-white group">
                                <span className="group-hover:-translate-y-0.5 transition-transform">📥</span> Descargar PDF
                            </button>
                        </div>

                        <div ref={componentePDF} className="bg-white dark:bg-[#2a2a35] p-10 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-xl print-container transition-colors">
                            <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700/50 text-sm text-gray-500 dark:text-gray-400">
                                <p className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <span className="text-blue-500">ℹ️</span> Fuentes utilizadas para esta síntesis:
                                </p>
                                <ul className="flex flex-wrap gap-2">
                                    {datos.resumenes[resumenActivo].fuentes_usadas.map((f,i) => (
                                        <li key={i} className="bg-gray-50 dark:bg-[#1e1e24] border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            📄 {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* ReactMarkdown adaptado para claro/oscuro automáticamente */}
                            <div className="prose dark:prose-invert prose-blue max-w-none prose-headings:text-gray-900 dark:prose-headings:text-blue-400 prose-h1:text-3xl prose-h2:text-2xl prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-gray-700 dark:prose-li:text-gray-300">
                                <ReactMarkdown>{datos.resumenes[resumenActivo].texto}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}