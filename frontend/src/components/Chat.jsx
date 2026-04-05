import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Chat({ id }) {
    const [historialChat, setHistorialChat] = useState([]);
    const [mensajeInput, setMensajeInput] = useState("");
    const [iaPensando, setIaPensando] = useState(false);
    const chatEndRef = useRef(null);

    // Hace que el chat baje automáticamente cuando hay un nuevo mensaje
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [historialChat, iaPensando]);

    const handleEnviarMensaje = (e) => {
        e.preventDefault();
        if (!mensajeInput.trim() || iaPensando) return;

        const mensajeUsuario = mensajeInput;
        setMensajeInput(""); // Limpiamos el input
        setHistorialChat(prev => [...prev, { rol: 'user', texto: mensajeUsuario }]);
        setIaPensando(true);

        fetch(`http://127.0.0.1:8000/api/notebooks/${id}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensaje: mensajeUsuario })
        })
        .then(res => res.json())
        .then(data => {
            setHistorialChat(prev => [...prev, { rol: 'ia', texto: data.respuesta }]);
            setIaPensando(false);
        })
        .catch(err => {
            console.error(err);
            setHistorialChat(prev => [...prev, { rol: 'ia', texto: "❌ Hubo un error de conexión." }]);
            setIaPensando(false);
        });
    };

return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {historialChat.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 flex-col animate-fade-in">
                        <span className="text-6xl mb-4 opacity-50 hover:opacity-100 transition-opacity cursor-default">💬</span>
                        <p className="text-xl font-medium text-gray-500 dark:text-gray-400">¡Pregúntale a tus apuntes!</p>
                        <p className="text-sm mt-3 bg-gray-100 dark:bg-gray-800/50 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-400">Ej: "¿Cuáles son las causas de la Revolución Francesa?"</p>
                    </div>
                ) : (
                    historialChat.map((msg, i) => (
                        <div key={i} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] p-5 rounded-2xl shadow-sm dark:shadow-lg ${
                                msg.rol === 'user' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white dark:bg-[#2a2a35] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                            }`}>
                                {msg.rol === 'ia' ? (
                                    <div className="prose dark:prose-invert prose-blue max-w-none text-gray-700 dark:text-gray-300 prose-p:leading-relaxed prose-pre:bg-gray-50 dark:prose-pre:bg-[#1e1e24] prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700">
                                        <ReactMarkdown>{msg.texto}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="font-medium text-[15px]">{msg.texto}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {iaPensando && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-[#2a2a35] border border-gray-200 dark:border-gray-700 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Analizando fuentes...</span>
                        </div>
                    </div>
                )}
                {/* Elemento invisible para forzar el scroll al final del chat */}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleEnviarMensaje} className="mt-4 shrink-0 flex gap-2 relative">
                <input 
                    type="text" 
                    value={mensajeInput}
                    onChange={(e) => setMensajeInput(e.target.value)}
                    placeholder="Escribe tu pregunta sobre el documento..." 
                    className="flex-1 bg-white dark:bg-[#2a2a35] border border-gray-300 dark:border-gray-600 rounded-2xl py-4 pl-5 pr-16 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm dark:shadow-none"
                />
                <button 
                    type="submit" 
                    disabled={!mensajeInput.trim() || iaPensando} 
                    className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 px-6 rounded-xl transition-colors font-bold text-white shadow-md flex items-center"
                >
                    Enviar
                </button>
            </form>
        </div>
    );
}