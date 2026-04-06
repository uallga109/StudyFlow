import { useState, useRef, useEffect } from 'react';

export default function RellenarHuecos({ frase, respuestaCorrecta, onResultado, disabled = false }) {
    const [valor, setValor] = useState('');
    const [estadoLocal, setEstadoLocal] = useState('escribiendo'); // escribiendo, acierto, fallo
    const inputRef = useRef(null);

    // Si cambia la frase (pasamos a la siguiente pregunta), reseteamos todo
    useEffect(() => {
        setValor('');
        setEstadoLocal('escribiendo');
        if (inputRef.current && !disabled) {
            inputRef.current.focus();
        }
    }, [frase, disabled]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (disabled || estadoLocal !== 'escribiendo' || !valor.trim()) return;

        // Nuestro glorioso normalizador (ignora tildes y mayúsculas)
        const normalizar = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
        
        const esCorrecta = normalizar(valor) === normalizar(respuestaCorrecta);

        setEstadoLocal(esCorrecta ? 'acierto' : 'fallo');
        
        // Avisamos al componente padre (NivelBatalla o ModoEstudio) de lo que ha pasado
        onResultado(esCorrecta, valor);
    };

    // La IA nos devuelve algo como "La ___ es la central energética". 
    // Lo partimos por los guiones bajos para meter el input en medio.
    const partes = frase.split('___');

    // Clases dinámicas para el input según si hemos acertado o fallado
    let clasesInput = "bg-[#252532] border-gray-500 text-white focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(79,70,229,0.3)]";
    if (estadoLocal === 'acierto') clasesInput = "bg-green-900/50 border-green-500 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.4)]";
    if (estadoLocal === 'fallo') clasesInput = "bg-red-900/50 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)]";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-8 w-full animate-fade-in">
            {/* LA FRASE CON EL INPUT INCRUSTADO */}
            <div className="text-2xl md:text-3xl font-bold text-white leading-loose text-center max-w-3xl">
                {partes[0]}
                <input
                    ref={inputRef}
                    type="text"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    disabled={disabled || estadoLocal !== 'escribiendo'}
                    className={`mx-3 px-4 py-2 min-w-[150px] w-auto text-center rounded-xl border-b-4 outline-none transition-all duration-300 ${clasesInput}`}
                    placeholder="..."
                    style={{ width: `${Math.max(150, valor.length * 20)}px` }} // El input crece si escribes mucho
                />
                {partes[1]}
            </div>
            
            {/* BOTÓN DE CONFIRMAR */}
            {estadoLocal === 'escribiendo' && (
                <button 
                    type="submit"
                    disabled={!valor.trim() || disabled}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-black uppercase tracking-widest py-3 px-10 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all transform hover:scale-105"
                >
                    Comprobar
                </button>
            )}

            {/* FEEDBACK VISUAL SI FALLA */}
            {estadoLocal === 'fallo' && (
                <div className="text-red-400 font-bold bg-red-900/20 px-6 py-3 rounded-xl border border-red-500/30">
                    Respuesta correcta: <span className="text-white">{respuestaCorrecta}</span>
                </div>
            )}
        </form>
    );
}