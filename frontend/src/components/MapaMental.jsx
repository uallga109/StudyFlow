import { useState, useCallback, useEffect } from 'react';
import ReactFlow, { Background, Controls, MiniMap, applyNodeChanges, applyEdgeChanges, useReactFlow, ReactFlowProvider } from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

// --- CONFIGURACIÓN DEL MOTOR AUTOMÁTICO (DAGRE) ---
const getLayoutedElements = (nodes, edges) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 280, height: 80 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        
        // Detectamos si es el nodo principal (no tiene ninguna línea que llegue hacia él)
        const isRoot = !edges.some(e => e.target === node.id);

        return {
            ...node,
            targetPosition: 'top',
            sourcePosition: 'bottom',
            position: { x: nodeWithPosition.x - 140, y: nodeWithPosition.y - 40 },
            // FORZAMOS EL DISEÑO PREMIUM AQUÍ (Ignoramos el de la IA)
            style: { 
                width: 280, 
                padding: '16px',
                backgroundColor: isRoot ? '#3b82f6' : '#2a2a35', // Azul si es principal, Gris oscuro si es hijo
                color: '#ffffff',
                border: isRoot ? 'none' : '1px solid #4b5563',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: isRoot ? 'bold' : '500',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                wordWrap: 'break-word',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
            }
        };
    });

    // Forzamos el diseño de las líneas
    const layoutedEdges = edges.map(edge => ({
        ...edge,
        animated: true,
        style: { stroke: '#6b7280', strokeWidth: 2 }
    }));

    return { nodes: layoutedNodes, edges: layoutedEdges };
};

// --- COMPONENTE INTERNO DEL MAPA ---
function MapaFlow({ mapaData }) {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const { fitView } = useReactFlow();

    useEffect(() => {
        if (!mapaData || !mapaData.nodos || !mapaData.lineas) return;

        // Buscamos cuál es el verdadero Nodo Raíz dinámicamente
        const targetIds = new Set(mapaData.lineas.map(e => e.target));
        const rootNode = mapaData.nodos.find(n => !targetIds.has(n.id)) || mapaData.nodos[0];

        // Ocultamos todos los que NO sean el nodo raíz
        const nodosIniciales = mapaData.nodos.map(n => ({
            ...n,
            hidden: n.id !== rootNode.id
        }));
        
        const lineasIniciales = mapaData.lineas.map(e => ({
            ...e,
            hidden: true
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodosIniciales, lineasIniciales);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        
        setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 100);
    }, [mapaData, fitView]);

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    // --- LÓGICA DE DESPLEGAR/COLAPSAR AL HACER CLIC ---
    const onNodeClick = useCallback((_, clickedNode) => {
        if (!mapaData) return;

        const hijosDirectos = mapaData.lineas.filter(e => e.source === clickedNode.id).map(e => e.target);
        if (hijosDirectos.length === 0) return;

        setNodes((nds) => {
            const nuevosNodos = [...nds];
            const nuevasLineas = [...edges];
            
            const estanOcultos = nuevosNodos.find(n => n.id === hijosDirectos[0])?.hidden ?? true;

            const toggleDescendientes = (nodoId, mostrar) => {
                const hijos = mapaData.lineas.filter(e => e.source === nodoId).map(e => e.target);
                hijos.forEach(hijoId => {
                    const n = nuevosNodos.find(no => no.id === hijoId);
                    if (n) n.hidden = !mostrar;
                    
                    const e = nuevasLineas.find(li => li.target === hijoId);
                    if (e) e.hidden = !mostrar;

                    if (!mostrar) {
                        toggleDescendientes(hijoId, false);
                    }
                });
            };

            toggleDescendientes(clickedNode.id, estanOcultos);

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nuevosNodos, nuevasLineas);
            setEdges(layoutedEdges);
            
            // Efecto visual: borde brillante si está desplegado
            return layoutedNodes.map(n => {
                if (n.id === clickedNode.id && n.id !== mapaData.nodos[0]?.id) { // Solo cambiamos el borde si no es la raíz azul
                    return { ...n, style: { ...n.style, border: estanOcultos ? '2px solid #3b82f6' : '1px solid #4b5563' }};
                }
                return n;
            });
        });
        
        setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 50);
    }, [mapaData, edges, fitView]);

    return (
        <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            className="dark:bg-[#1e1e24]"
            minZoom={0.1}
            nodesDraggable={false} // Evita que se rompa la estructura si los arrastras a lo loco
        >
            <Background color="#6b7280" gap={16} size={1} />
            <Controls className="dark:bg-gray-800 dark:text-white dark:border-gray-700 bg-white border-gray-200" />
            <MiniMap className="dark:bg-gray-800 bg-gray-50" maskColor="rgba(0, 0, 0, 0.2)" nodeColor="#3b82f6" />
        </ReactFlow>
    );
}

// --- ENVOLTORIO PRINCIPAL ---
export default function MapaMental({ id, datos, fuentesSeleccionadas, setFuentesSeleccionadas, toggleFuente, recargarBD }) {
    const [configurandoMapa, setConfigurandoMapa] = useState(false);
    const [mapaActivoIdx, setMapaActivoIdx] = useState(0);
    const [generandoMapa, setGenerandoMapa] = useState(false);

    useEffect(() => {
        if (datos?.mapas?.length > 0 && !configurandoMapa) {
            setMapaActivoIdx(0);
        }
    }, [datos]);

    const handleGenerarMapa = async () => {
        if (fuentesSeleccionadas.length === 0) return;
        setGenerandoMapa(true);

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/notebooks/${id}/mapamental`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fuentes: fuentesSeleccionadas })
            });
            const data = await res.json();
            
            if (data.nodos) {
                if(recargarBD) recargarBD();
                setConfigurandoMapa(false);
            } else {
                console.error("El backend no devolvió el mapa correctamente", data);
            }
        } catch (error) {
            console.error("Error generando mapa:", error);
            alert("Hubo un error al generar el mapa mental.");
        } finally {
            setGenerandoMapa(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span>🧠</span> Mapa Mental Interactivo
                </h2>
            </div>

            {!generandoMapa && datos.mapas?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 shrink-0 border-b border-gray-200 dark:border-gray-700 mb-6 custom-scrollbar">
                    {datos.mapas.map((mapa, idx) => (
                        <button 
                            key={mapa.id} 
                            onClick={() => { 
                                setConfigurandoMapa(false); 
                                setMapaActivoIdx(idx); 
                            }} 
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm transition-all shadow-sm ${!configurandoMapa && mapaActivoIdx === idx ? 'bg-blue-600 text-white font-bold' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-transparent'}`}
                        >
                            Mapa {idx + 1} <span className="text-xs opacity-70 ml-2">({mapa.fecha.split(' ')[0]})</span>
                        </button>
                    ))}
                    <button 
                        onClick={() => { setConfigurandoMapa(true); }} 
                        className="whitespace-nowrap px-4 py-2 rounded-lg text-sm bg-indigo-50 dark:bg-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500 text-indigo-600 dark:text-white border border-indigo-200 dark:border-transparent transition font-bold shadow-md"
                    >
                        + Nuevo Mapa
                    </button>
                </div>
            )}

            {generandoMapa ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <span className="text-6xl animate-pulse mb-4">🧠</span>
                    <p className="text-xl font-bold">Estructurando conexiones lógicas...</p>
                    <p className="text-sm mt-2">Creando tu mapa mental interactivo</p>
                </div>
            ) : 
            (configurandoMapa || !datos.mapas?.length) ? (
                <div className="bg-white dark:bg-[#2a2a35] p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-xl max-w-xl mx-auto w-full transition-colors mt-4">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Configurar Mapa Mental</h3>
                    <div className="mb-6">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Selecciona el temario a mapear:</p>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {datos.fuentes.map((f, i) => (
                                <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${fuentesSeleccionadas.includes(f) ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                                    <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={fuentesSeleccionadas.includes(f)} onChange={() => toggleFuente(f)}/>
                                    <span className="text-sm truncate text-gray-700 dark:text-gray-200">{f}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleGenerarMapa} disabled={fuentesSeleccionadas.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 p-4 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 text-white">
                        ✨ Comenzar Generación
                    </button>
                    {datos.mapas?.length > 0 && (
                        <button onClick={() => setConfigurandoMapa(false)} className="w-full text-center text-gray-500 text-sm mt-4 hover:text-gray-800 dark:hover:text-white transition">
                            Cancelar y volver al historial
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex-1 border-2 border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden shadow-inner relative">
                    <ReactFlowProvider>
                        <MapaFlow mapaData={datos.mapas[mapaActivoIdx]} />
                    </ReactFlowProvider>
                </div>
            )}
        </div>
    );
}