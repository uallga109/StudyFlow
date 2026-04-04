import json
import os
import shutil
from datetime import datetime
import uuid
import PyPDF2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
NOTEBOOKS_FILE = os.path.join(DATA_DIR, "notebooks.json")
FILES_DIR = os.path.join(DATA_DIR, "files")

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
    return cuadernos.get(notebook_id)

def crear_cuaderno(titulo):
    cuadernos = listar_cuadernos()
    id_unico = str(uuid.uuid4())
    nuevo_cuaderno = {
        "id": id_unico,
        "titulo": titulo,
        "creado": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "fuentes": [],
        "resumenes": [] # NUEVO: Ahora es una lista para guardar el historial
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