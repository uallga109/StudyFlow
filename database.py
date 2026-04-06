import json
import os
import shutil
from datetime import datetime
import uuid
import PyPDF2
import chromadb
from chromadb.utils import embedding_functions


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
NOTEBOOKS_FILE = os.path.join(DATA_DIR, "notebooks.json")
FILES_DIR = os.path.join(DATA_DIR, "files")


# Inicializamos ChromaDB (creará una carpeta 'chroma_db' en tu proyecto)
chroma_client = chromadb.PersistentClient(path=os.path.join(DATA_DIR, "chroma_db"))
# Usamos un modelo de embeddings ligero que corre en tu ordenador
default_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Creamos o cargamos la colección de documentos
collection = chroma_client.get_or_create_collection(
    name="estudios_flow", 
    embedding_function=default_ef
)


def inicializar_base_de_datos():
    if not os.path.exists(DATA_DIR): os.makedirs(DATA_DIR)
    if not os.path.exists(FILES_DIR): os.makedirs(FILES_DIR)
    if not os.path.exists(NOTEBOOKS_FILE):
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump({}, f)

def listar_cuadernos():
    inicializar_base_de_datos()
    with open(NOTEBOOKS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def obtener_cuaderno(notebook_id):
    cuadernos = listar_cuadernos()
    cuaderno = cuadernos.get(notebook_id)
    
    # MIGRACIÓN SILENCIOSA: Si es un cuaderno antiguo o nuevo, le añadimos las variables del juego
    if cuaderno:
        modificado = False
        if "juego_creado" not in cuaderno:
            cuaderno["juego_creado"] = False
            modificado = True
        if "datos_juego" not in cuaderno:
            cuaderno["datos_juego"] = {}
            modificado = True
        if "monedas" not in cuaderno:
            cuaderno["monedas"] = 0
            modificado = True
            
        # Si le faltaba algo, guardamos los cambios en el JSON
        if modificado:
            cuadernos[notebook_id] = cuaderno
            with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
                json.dump(cuadernos, f, indent=4, ensure_ascii=False)
                
    return cuaderno

def crear_cuaderno(titulo):
    cuadernos = listar_cuadernos()
    id_unico = str(uuid.uuid4())
    nuevo_cuaderno = {
        "id": id_unico,
        "titulo": titulo,
        "creado": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "fuentes": [],
        "resumenes": [],
        "quizzes": [],
        "flashcards": [],
        "mapas": [],
        "juego_creado": False,
        "datos_juego": {},
        "monedas": 0
    }
    cuadernos[id_unico] = nuevo_cuaderno
    with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
        json.dump(cuadernos, f, indent=4, ensure_ascii=False)
    return id_unico

def guardar_archivo_en_cuaderno(notebook_id, archivo_fastapi):
    cuaderno = obtener_cuaderno(notebook_id)
    if not cuaderno: return False
    carpeta_destino = os.path.join(FILES_DIR, notebook_id)
    if not os.path.exists(carpeta_destino):
        os.makedirs(carpeta_destino)
    nombre_archivo = archivo_fastapi.filename
    ruta_destino = os.path.join(carpeta_destino, nombre_archivo)
    with open(ruta_destino, "wb") as f:
        shutil.copyfileobj(archivo_fastapi.file, f)
    if nombre_archivo not in cuaderno["fuentes"]:
        cuaderno["fuentes"].append(nombre_archivo)
        cuadernos = listar_cuadernos()
        cuadernos[notebook_id] = cuaderno
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
    return True

# ACTUALIZADO: Ahora recibe una lista de fuentes específicas
def extraer_texto_cuaderno(notebook_id, fuentes_seleccionadas=None):
    carpeta = os.path.join(FILES_DIR, notebook_id)
    if not os.path.exists(carpeta): return ""
    texto_total = ""
    for archivo in os.listdir(carpeta):
        if archivo.lower().endswith(".pdf"):
            # Si nos pasan una lista, comprobamos que el archivo esté en ella
            if fuentes_seleccionadas is not None and archivo not in fuentes_seleccionadas:
                continue 
            
            ruta_pdf = os.path.join(carpeta, archivo)
            try:
                lector = PyPDF2.PdfReader(ruta_pdf)
                for pagina in lector.pages:
                    texto_extraido = pagina.extract_text()
                    if texto_extraido:
                        texto_total += f"\n--- Archivo: {archivo} ---\n" + texto_extraido + "\n"
            except Exception as e:
                print(f"Error leyendo {archivo}: {e}")
    return texto_total

# ACTUALIZADO: Guarda un nuevo objeto de resumen en la lista
def guardar_resumen_cuaderno(notebook_id, nuevo_resumen):
    cuadernos = listar_cuadernos()
    if notebook_id in cuadernos:
        if "resumenes" not in cuadernos[notebook_id]:
            cuadernos[notebook_id]["resumenes"] = []
        
        # Limpieza de código antiguo (por si tenías el "resumen" antiguo)
        if "resumen" in cuadernos[notebook_id]:
            del cuadernos[notebook_id]["resumen"]
            
        cuadernos[notebook_id]["resumenes"].append(nuevo_resumen)
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
        return True
    return False

def guardar_quiz_cuaderno(notebook_id, quiz_lista):
    cuadernos = listar_cuadernos()
    if notebook_id in cuadernos:
        cuadernos[notebook_id]["quiz"] = quiz_lista
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
        return True
    return False


# --- NUEVAS FUNCIONES DE BORRADO ---

def borrar_cuaderno(notebook_id):
    cuadernos = listar_cuadernos()
    if notebook_id in cuadernos:
        del cuadernos[notebook_id]
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
        # Borramos la carpeta entera con los PDFs
        carpeta = os.path.join(FILES_DIR, notebook_id)
        if os.path.exists(carpeta):
            shutil.rmtree(carpeta)
        return True
    return False

def borrar_archivo_de_cuaderno(notebook_id, nombre_archivo):
    cuadernos = listar_cuadernos()
    if notebook_id in cuadernos and nombre_archivo in cuadernos[notebook_id]["fuentes"]:
        cuadernos[notebook_id]["fuentes"].remove(nombre_archivo)
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
        # Borramos el PDF físico
        ruta_archivo = os.path.join(FILES_DIR, notebook_id, nombre_archivo)
        if os.path.exists(ruta_archivo):
            os.remove(ruta_archivo)
        return True
    return False

def guardar_quiz_en_historial(notebook_id, nuevo_quiz):
    cuadernos = listar_cuadernos()
    if notebook_id in cuadernos:
        if "quizzes" not in cuadernos[notebook_id]:
            cuadernos[notebook_id]["quizzes"] = []
        # Borramos el rastro del quiz antiguo si existiera
        if "quiz" in cuadernos[notebook_id]: del cuadernos[notebook_id]["quiz"]
        
        cuadernos[notebook_id]["quizzes"].append(nuevo_quiz)
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
        return True
    return False

def obtener_info_pdf(notebook_id, fuentes_seleccionadas):
    """Cuenta el total de páginas de los PDFs seleccionados para recomendar preguntas."""
    total_paginas = 0
    carpeta = os.path.join(FILES_DIR, notebook_id)
    for f in fuentes_seleccionadas:
        ruta = os.path.join(carpeta, f)
        if os.path.exists(ruta):
            try:
                lector = PyPDF2.PdfReader(ruta)
                total_paginas += len(lector.pages)
            except: pass
    return total_paginas


def indexar_pdf(notebook_id, nombre_archivo, texto):
    """Corta el texto en trozos y los guarda en la base de datos vectorial."""
    if not texto or len(texto.strip()) < 10:
        print(f"⚠️ Saltando indexación de {nombre_archivo}: No se detectó texto suficiente.")
        return

    chunk_size = 1000
    chunks = [texto[i:i + chunk_size] for i in range(0, len(texto), chunk_size)]
    
    documents = []
    metadatos = []
    ids = []
    
    for i, chunk in enumerate(chunks):
        if chunk.strip(): # Solo trozos con contenido
            documents.append(chunk)
            metadatos.append({
                "notebook_id": notebook_id,
                "source": nombre_archivo
            })
            ids.append(f"{notebook_id}_{nombre_archivo}_{i}_{uuid.uuid4().hex[:4]}")
    
    if documents:
        collection.add(ids=ids, documents=documents, metadatas=metadatos)
        print(f"✅ {nombre_archivo} indexado correctamente ({len(documents)} trozos).")

def buscar_contexto(notebook_id, pregunta, n_resultados=4):
    """Busca los fragmentos más relevantes para una pregunta."""
    resultados = collection.query(
        query_texts=[pregunta],
        n_results=n_resultados,
        where={"notebook_id": notebook_id}
    )
    return resultados

def guardar_flashcards_cuaderno(notebook_id, mazo_nuevo):
    cuadernos = listar_cuadernos()
    if notebook_id in cuadernos:
        if "flashcards" not in cuadernos[notebook_id]:
            cuadernos[notebook_id]["flashcards"] = []
        
        cuadernos[notebook_id]["flashcards"].append(mazo_nuevo)
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
        return True
    return False

def guardar_mapa_cuaderno(notebook_id, mapa_nuevo):
    cuadernos = listar_cuadernos()
    if notebook_id in cuadernos:
        if "mapas" not in cuadernos[notebook_id]:
            cuadernos[notebook_id]["mapas"] = []
            
        cuadernos[notebook_id]["mapas"].append(mapa_nuevo)
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
        return True
    return False

def guardar_juego_cuaderno(notebook_id, datos_del_juego):
    """Guarda el mapa generado y bloquea el cuaderno marcando juego_creado = True"""
    cuadernos = listar_cuadernos()
    if notebook_id in cuadernos:
        cuadernos[notebook_id]["juego_creado"] = True
        cuadernos[notebook_id]["datos_juego"] = datos_del_juego
        
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
        return True
    return False