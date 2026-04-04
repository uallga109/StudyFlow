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
        "fuentes": []
    }
    cuadernos[id_unico] = nuevo_cuaderno
    with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
        json.dump(cuadernos, f, indent=4, ensure_ascii=False)
    return id_unico

# ACTUALIZADO: Adaptado para FastAPI (UploadFile)
def guardar_archivo_en_cuaderno(notebook_id, archivo_fastapi):
    cuaderno = obtener_cuaderno(notebook_id)
    if not cuaderno: return False
    
    carpeta_destino = os.path.join(FILES_DIR, notebook_id)
    if not os.path.exists(carpeta_destino):
        os.makedirs(carpeta_destino)
        
    # FastAPI usa .filename, Streamlit usaba .name
    nombre_archivo = archivo_fastapi.filename
    ruta_destino = os.path.join(carpeta_destino, nombre_archivo)
    
    # Guardamos el archivo físico (método de alto rendimiento de Python)
    with open(ruta_destino, "wb") as f:
        shutil.copyfileobj(archivo_fastapi.file, f)
        
    # Actualizamos el registro JSON
    if nombre_archivo not in cuaderno["fuentes"]:
        cuaderno["fuentes"].append(nombre_archivo)
        cuadernos = listar_cuadernos()
        cuadernos[notebook_id] = cuaderno
        with open(NOTEBOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cuadernos, f, indent=4, ensure_ascii=False)
            
    return True

def extraer_texto_cuaderno(notebook_id):
    """
    Lee todos los PDFs dentro de la carpeta de un cuaderno y devuelve el texto gigante.
    """
    carpeta = os.path.join(FILES_DIR, notebook_id)
    if not os.path.exists(carpeta):
        return ""
        
    texto_total = ""
    # Recorremos todos los archivos de la carpeta
    for archivo in os.listdir(carpeta):
        if archivo.lower().endswith(".pdf"):
            ruta_pdf = os.path.join(carpeta, archivo)
            try:
                lector = PyPDF2.PdfReader(ruta_pdf)
                for pagina in lector.pages:
                    texto_extraido = pagina.extract_text()
                    if texto_extraido:
                        texto_total += texto_extraido + "\n"
            except Exception as e:
                print(f"Error leyendo {archivo}: {e}")
                
    return texto_total