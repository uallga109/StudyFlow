import React, { useState } from 'react';

export default function Tienda({ monedasTotales, onCerrar, modoHardcore, inventario, onComprar }) {    // Catálogo con descripciones épicas y estilos PRO
    const catalogo = [
        { 
            id: 'vida', 
            nombre: 'Elixir de Vitalidad', 
            desc: modoHardcore ? 'Una gota restaura un punto de vida global.' : 'Otorga un corazón extra para tu próximo duelo.', 
            precio: 50, 
            icono: '❤️',
            orbeColor: 'red',
            claseOrbe: 'from-red-600 via-red-900 to-black',
            shadow: 'shadow-[0_0_50px_rgba(239,68,68,0.3)]'
        },
        { 
            id: 'tiempo', 
            nombre: 'Reloj del Destino', 
            desc: 'Añade +60s de arena temporal para el juicio final.', 
            precio: 100, 
            icono: '⌛',
            orbeColor: 'blue',
            claseOrbe: 'from-blue-600 via-blue-900 to-black',
            shadow: 'shadow-[0_0_50px_rgba(37,99,235,0.3)]'
        },
        { 
            id: 'pista', 
            nombre: 'Visión de los Antiguos', 
            desc: 'El ojo te revela la verdad tras una duda atroz.', 
            precio: 75, 
            icono: '👁️',
            orbeColor: 'emerald',
            claseOrbe: 'from-emerald-600 via-emerald-900 to-black',
            shadow: 'shadow-[0_0_50px_rgba(16,185,129,0.3)]'
        }
    ];

    const [comprando, setComprando] = useState(false);
    const [compraExitosa, setCompraExitosa] = useState(null);

    const manejarCompra = async (item) => {
        if (monedasTotales >= item.precio && !comprando) {
            setComprando(true);
            const exito = await onComprar(item); // 👈 Llamada real al servidor
            
            if (exito) {
                setCompraExitosa(item.id);
                setTimeout(() => setCompraExitosa(null), 1500);
            }
            setComprando(false);
        }
    };
    
    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in font-sans select-none">
            {/* 🌌 NIEBLA DE FONDO CÓSMICA */}
            <div className="absolute inset-0 z-1 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] blur-3xl from-yellow-900/40 via-purple-900/10 to-transparent animate-pulse"></div>
            </div>

            {/* 🏰 CONTENEDOR PRINCIPAL: LA FORJA DE MERCANCÍAS */}
            <div className="relative z-10 w-full max-w-6xl bg-[#030305] border-[3px] border-yellow-800/30 rounded-3xl shadow-[0_0_80px_rgba(251,191,36,0.15)] overflow-hidden flex flex-col scale-100 transform animate-scale-in">
                
                {/* 🏮 HEADER CON RUNAS DORADAS */}
                <div className="relative p-7 border-b-[2px] border-yellow-800/50 bg-[url('/assets/texturas/metal_negro.jpg')] bg-cover flex justify-between items-center shadow-xl">
                    <div className="flex items-center gap-6">
                        {/* Icono de la mochila en orbe */}
                        <div className="w-16 h-16 rounded-full border-4 border-yellow-200 bg-gradient-to-br from-yellow-400 to-amber-700 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(251,191,36,0.8)] relative">
                            <span className="drop-shadow-md">🎒</span>
                            <div className="absolute -inset-2 rounded-full border border-yellow-400 animate-ping opacity-30"></div>
                        </div>
                        <div>
                            {/* Título Estilo Pro Cincelado */}
                            <h2 className="text-3xl font-serif font-black text-white tracking-[0.3em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                                <span className="text-yellow-400">El Mercader</span> <span className="text-gray-400">Errante</span>
                            </h2>
                            <p className="text-yellow-200/60 text-xs font-bold tracking-[0.4em] uppercase -mt-1 drop-shadow-sm">Mercancías que desafían la realidad</p>
                        </div>
                    </div>
                    
                    {/* 🪙 MONEDERO MEDALLÓN DORADO */}
                    <div className="relative bg-black/60 border-2 border-yellow-500/50 px-10 py-3 rounded-xl flex items-center gap-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                        <span className="text-yellow-500 text-3xl font-black drop-shadow-[0_0_10px_rgba(251,191,36,1)] animate-spin-slow">🪙</span>
                        <span className="text-white font-mono font-black text-3xl tracking-widest drop-shadow-[0_2px_0px_rgba(0,0,0,0.8)]">{monedasTotales}</span>
                        <div className="absolute -inset-1 rounded-xl border border-yellow-600 animate-pulse opacity-40"></div>
                    </div>
                </div>

                {/* 📦 EL ESCAPARATE MÁGICO */}
                <div className="relative p-12 grid grid-cols-1 md:grid-cols-3 gap-10 bg-[url('/assets/fondos/bg_hex.jpg')] bg-repeat">
                    {/* Brillo central */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/10 via-transparent to-transparent pointer-events-none z-1"></div>
                    
                    {catalogo.map((item) => {
                        const puedeComprar = monedasTotales >= item.precio;
                        const esComprado = compraExitosa === item.id;

                        return (
                            /* TARJETA DEL ITEM: Diseño Metal Forjado */
                            <div key={item.id} className={`relative group p-10 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center backdrop-blur-sm z-10 ${
                                puedeComprar ? `bg-black/60 border-gray-800 hover:border-yellow-600/50 hover:${item.shadow}` : 'bg-black/80 border-gray-900 opacity-60 grayscale-[70%] cursor-not-allowed'
                            }`}>
                                
                                {/* 🔮 ORBE MÁGICO CON ICONO */}
                                <div className={`relative w-28 h-28 rounded-full bg-gradient-to-b ${item.claseOrbe} flex items-center justify-center text-5xl mb-6 border-4 border-white/10 ${puedeComprar ? `shadow-[0_0_60px_rgba(0,0,0,1)] group-hover:${item.shadow}` : ''} transition-all duration-300`}>
                                    <span className={`transition-transform duration-300 ${puedeComprar ? 'group-hover:scale-125' : ''} drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]`}>
                                        {item.icono}
                                    </span>
                                    {/* Niebla interna del orbe */}
                                    {puedeComprar && <div className={`absolute inset-0 rounded-full bg-gradient-to-t ${item.claseOrbe} blur-lg opacity-40 animate-pulse`}></div>}
                                </div>
                                
                                {/* Textos Pro */}
                                <h3 className="text-white font-black font-serif text-2xl uppercase tracking-[0.1em] mb-2 drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{item.nombre}</h3>
                                <p className="text-gray-400 text-sm font-medium flex-1 leading-relaxed mb-10 tracking-wide">{item.desc}</p>
                                
                                {/* 🛠️ BOTÓN COMPRA: Placa de Bronce Forjado */}
                                <button 
                                    onClick={() => manejarCompra(item)}
                                    disabled={!puedeComprar || esComprado}
                                    className={`w-full py-4 rounded-lg font-black tracking-[0.3em] uppercase text-sm transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group/btn shadow-[0_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_0_0_rgba(0,0,0,1)] ${
                                        esComprado ? 'bg-emerald-600 text-white border-b-4 border-emerald-900 shadow-[0_0_30px_rgba(16,185,129,0.5)]' :
                                        puedeComprar ? 'bg-gradient-to-r from-yellow-700 via-amber-800 to-yellow-700 text-white hover:from-yellow-600 hover:to-amber-700 border-b-4 border-black/80' : 
                                        'bg-gray-800 text-gray-600 cursor-not-allowed border-b-4 border-black/80'
                                    }`}
                                >
                                    {/* Efecto brillo al pasar ratón por el botón */}
                                    {puedeComprar && !esComprado && <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-[200%] transition-transform duration-700 ease-in-out"></div>}
                                    
                                    {esComprado ? '¡ADQUIRIDO!' : (
                                        <>
                                            <span className="drop-shadow-sm">{item.precio}</span> <span className="text-xl -mt-1 drop-shadow-sm">🪙</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* 👣 PIE: PLACA DE SALIR */}
                <div className="p-5 bg-[url('/assets/texturas/metal_negro.jpg')] border-t border-yellow-800/50 flex justify-end shadow-inner">
                    <button 
                        onClick={onCerrar}
                        className="px-10 py-2.5 border-2 border-gray-700 text-gray-500 hover:text-white hover:border-white rounded-lg font-black tracking-[0.3em] uppercase text-xs transition-all duration-300 shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Abandonar Tienda
                    </button>
                </div>
            </div>
        </div>
    );
}