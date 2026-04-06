import { useState, useEffect } from 'react';

export default function TableroConexiones({ conexiones, onResultado, disabled = false }) {
    const [itemsIzquierda, setItemsIzquierda] = useState([]);
    const [itemsDerecha, setItemsDerecha] = useState([]);
    const [seleccionIzq, setSeleccionIzq] = useState(null);
    const [seleccionDer, setSeleccionDer] = useState(null);
    const [resueltos, setResueltos] = useState([]);
    const [bloqueoAnimacion, setBloqueoAnimacion] = useState(false); // Para evitar clics durante el error

    useEffect(() => {
        if (!conexiones || conexiones.length === 0) return;
        const izq = conexiones.map((c, i) => ({ id: i, texto: c.termino })).sort(() => Math.random() - 0.5);
        const der = conexiones.map((c, i) => ({ id: i, texto: c.definicion })).sort(() => Math.random() - 0.5);
        setItemsIzquierda(izq);
        setItemsDerecha(der);
        setResueltos([]);
        setSeleccionIzq(null);
        setSeleccionDer(null);
    }, [conexiones]);

    // ✅ CORREGIDO: Lógica de validación
    useEffect(() => {
        // Solo actuamos si tenemos uno de cada lado y NO estamos en medio de una animación de error
        if (seleccionIzq !== null && seleccionDer !== null && !bloqueoAnimacion) {
            
            if (seleccionIzq === seleccionDer) {
                // ACIERTO
                const nuevosResueltos = [...resueltos, seleccionIzq];
                setResueltos(nuevosResueltos);
                setSeleccionIzq(null);
                setSeleccionDer(null);

                if (nuevosResueltos.length === conexiones.length) {
                    setTimeout(() => onResultado(true), 500);
                }
            } else {
                // FALLO
                setBloqueoAnimacion(true); // Bloqueamos clics extra
                onResultado(false); // Avisamos al padre (solo una vez)

                // Esperamos un poco para que el usuario vea el error, pero reseteamos el estado
                setTimeout(() => {
                    setSeleccionIzq(null);
                    setSeleccionDer(null);
                    setBloqueoAnimacion(false);
                }, 800);
            }
        }
    }, [seleccionIzq, seleccionDer, resueltos, conexiones, onResultado, bloqueoAnimacion]);

    return (
        <div className="w-full flex justify-between gap-8 max-w-5xl mx-auto animate-fade-in relative px-4">
            
            {/* Overlay sutil de error si fallas */}
            {bloqueoAnimacion && seleccionIzq !== null && (
                <div className="absolute inset-0 bg-red-500/5 rounded-3xl pointer-events-none z-10 animate-pulse"></div>
            )}

            {/* COLUMNA IZQUIERDA */}
            <div className="flex-1 flex flex-col gap-3">
                <span className="text-center font-black text-indigo-400 uppercase tracking-widest text-xs mb-2 opacity-60">Conceptos</span>
                {itemsIzquierda.map((item) => {
                    const isResuelto = resueltos.includes(item.id);
                    const isSeleccionado = seleccionIzq === item.id;
                    const isError = bloqueoAnimacion && isSeleccionado;

                    return (
                        <button
                            key={`izq-${item.id}`}
                            disabled={disabled || isResuelto || bloqueoAnimacion}
                            onClick={() => setSeleccionIzq(isSeleccionado ? null : item.id)}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 font-bold text-sm min-h-[70px] flex items-center justify-center text-center
                                ${isResuelto ? 'bg-green-900/20 border-green-800 text-green-700 opacity-40 grayscale cursor-default scale-95' : 
                                  isError ? 'bg-red-900/60 border-red-500 text-white animate-shake shadow-[0_0_20px_rgba(239,68,68,0.4)]' :
                                  isSeleccionado ? 'bg-indigo-600 border-indigo-300 text-white scale-105 shadow-[0_0_20px_rgba(79,70,229,0.5)]' :
                                  'bg-[#1a1a24] border-white/5 text-gray-300 hover:border-indigo-500/50 hover:bg-[#1f1f2e]'}`}
                        >
                            {item.texto}
                        </button>
                    );
                })}
            </div>

            {/* COLUMNA DERECHA */}
            <div className="flex-1 flex flex-col gap-3">
                <span className="text-center font-black text-indigo-400 uppercase tracking-widest text-xs mb-2 opacity-60">Definiciones</span>
                {itemsDerecha.map((item) => {
                    const isResuelto = resueltos.includes(item.id);
                    const isSeleccionado = seleccionDer === item.id;
                    const isError = bloqueoAnimacion && isSeleccionado;

                    return (
                        <button
                            key={`der-${item.id}`}
                            disabled={disabled || isResuelto || bloqueoAnimacion}
                            onClick={() => setSeleccionDer(isSeleccionado ? null : item.id)}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 font-medium text-xs min-h-[70px] flex items-center justify-center text-center
                                ${isResuelto ? 'bg-green-900/20 border-green-800 text-green-700 opacity-40 grayscale cursor-default scale-95' : 
                                  isError ? 'bg-red-900/60 border-red-500 text-white animate-shake shadow-[0_0_20px_rgba(239,68,68,0.4)]' :
                                  isSeleccionado ? 'bg-indigo-600 border-indigo-300 text-white scale-105 shadow-[0_0_20px_rgba(79,70,229,0.5)]' :
                                  'bg-[#1a1a24] border-white/5 text-gray-400 hover:border-indigo-500/50 hover:bg-[#1f1f2e]'}`}
                        >
                            {item.texto}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}