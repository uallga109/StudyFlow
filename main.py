from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database as db
import google.generativeai as genai
import os
from dotenv import load_dotenv

app = FastAPI(title="StudyFlow API Pro", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURACIÓN DE IA ---
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Usamos Flash para que sea rapidísimo y gratis
model = genai.GenerativeModel('gemini-2.5-flash')

db.inicializar_base_de_datos()

class NuevoCuaderno(BaseModel):
    titulo: str

# 1. Obtener todos
@app.get("/api/notebooks")
def obtener_cuadernos():
    return db.listar_cuadernos()

# 2. Crear uno nuevo
@app.post("/api/notebooks")
def crear_nuevo_cuaderno(cuaderno: NuevoCuaderno):
    notebook_id = db.crear_cuaderno(cuaderno.titulo)
    return {"id": notebook_id, "titulo": cuaderno.titulo}

# 3. Obtener solo un cuaderno (¡Aquí estaba tu bug!)
@app.get("/api/notebooks/{notebook_id}")
def obtener_un_cuaderno(notebook_id: str):
    cuaderno = db.obtener_cuaderno(notebook_id)
    if not cuaderno:
        raise HTTPException(status_code=404, detail="Cuaderno no encontrado en el servidor")
    return cuaderno

# 4. NUEVO: Subir archivo a un cuaderno
@app.post("/api/notebooks/{notebook_id}/files")
def subir_pdf_a_cuaderno(notebook_id: str, file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se admiten documentos PDF")
    
    exito = db.guardar_archivo_en_cuaderno(notebook_id, file)
    if not exito:
        raise HTTPException(status_code=404, detail="Cuaderno no existe")
    
    return {"mensaje": "Archivo guardado con éxito", "fuente": file.filename}

@app.post("/api/notebooks/{notebook_id}/summary")
def generar_resumen_cuaderno(notebook_id: str):
    # 1. Extraemos el texto de todos los PDFs del cuaderno
    texto_contexto = db.extraer_texto_cuaderno(notebook_id)
    
    if not texto_contexto.strip():
        raise HTTPException(status_code=400, detail="No hay texto en las fuentes. Sube un PDF primero.")
    
    # 2. Preparamos la orden estricta para la IA
    instrucciones = f"""
    Eres un tutor universitario experto. 
    Basándote ÚNICA Y EXCLUSIVAMENTE en los siguientes textos extraídos de los apuntes del alumno, 
    genera un resumen exhaustivo y estructurado. 
    Usa formato Markdown. Divide por temas o bloques lógicos. Destaca los conceptos clave en negrita.
    
    APUNTES DEL ALUMNO:
    {texto_contexto}
    """
    
    try:
        # 3. Pedimos la respuesta a Gemini
        respuesta = model.generate_content(instrucciones)
        return {"resultado": respuesta.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la IA: {str(e)}")