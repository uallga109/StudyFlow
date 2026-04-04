from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database as db
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv
import uuid
from datetime import datetime

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

class PeticionResumen(BaseModel):
    fuentes: list[str]

# 1. Obtener todos
@app.get("/api/notebooks")
def obtener_cuadernos():
    return db.listar_cuadernos()

# 2. Crear uno nuevo
@app.post("/api/notebooks")
def crear_nuevo_cuaderno(cuaderno: NuevoCuaderno):
    notebook_id = db.crear_cuaderno(cuaderno.titulo)
    return {"id": notebook_id, "titulo": cuaderno.titulo}

# 3. Obtener solo un cuaderno
@app.get("/api/notebooks/{notebook_id}")
def obtener_un_cuaderno(notebook_id: str):
    cuaderno = db.obtener_cuaderno(notebook_id)
    if not cuaderno:
        raise HTTPException(status_code=404, detail="Cuaderno no encontrado en el servidor")
    return cuaderno

# 4. Subir archivo a un cuaderno
@app.post("/api/notebooks/{notebook_id}/files")
def subir_pdf_a_cuaderno(notebook_id: str, file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se admiten documentos PDF")
    
    exito = db.guardar_archivo_en_cuaderno(notebook_id, file)
    if not exito:
        raise HTTPException(status_code=404, detail="Cuaderno no existe")
    
    return {"mensaje": "Archivo guardado con éxito", "fuente": file.filename}

# 5. Generar y guardar Resumen (Multifuente e Historial)
@app.post("/api/notebooks/{notebook_id}/summary")
def generar_resumen_cuaderno(notebook_id: str, peticion: PeticionResumen):
    cuaderno = db.obtener_cuaderno(notebook_id)
    if not cuaderno: raise HTTPException(status_code=404)

    if not peticion.fuentes:
        raise HTTPException(status_code=400, detail="Debes seleccionar al menos una fuente.")

    # 1. Extraemos SOLO el texto de los PDFs que nos han pedido
    texto_contexto = db.extraer_texto_cuaderno(notebook_id, peticion.fuentes)
    
    if not texto_contexto.strip():
        raise HTTPException(status_code=400, detail="Los documentos seleccionados están vacíos o no tienen texto.")
    
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
        
        # 4. Empaquetamos el nuevo resumen para el historial
        nuevo_resumen = {
            "id": str(uuid.uuid4()),
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "fuentes_usadas": peticion.fuentes,
            "texto": respuesta.text
        }
        
        # 5. Guardamos y devolvemos a React
        db.guardar_resumen_cuaderno(notebook_id, nuevo_resumen)
        return nuevo_resumen
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la IA: {str(e)}")
    
    
# 6. Generar y guardar Cuestionario
@app.post("/api/notebooks/{notebook_id}/quiz")
def generar_quiz_cuaderno(notebook_id: str, num_preguntas: int = 10):
    cuaderno = db.obtener_cuaderno(notebook_id)
    if not cuaderno: raise HTTPException(status_code=404)

    # Si ya hay un quiz guardado, lo devolvemos
    if cuaderno.get("quiz"):
        return {"quiz": cuaderno["quiz"], "cache": True}

    texto_contexto = db.extraer_texto_cuaderno(notebook_id)
    
    if not texto_contexto.strip():
        raise HTTPException(status_code=400, detail="No hay texto en las fuentes. Sube un PDF primero.")
        
    instrucciones = f"""
    Basándote en estos apuntes, genera un examen de {num_preguntas} preguntas.
    Responde ÚNICAMENTE con un JSON válido (sin markdown, sin texto extra).
    Formato: 
    [
      {{
        "pregunta": "texto",
        "opciones": ["A", "B", "C", "D"],
        "correcta": "texto exacto de la opción",
        "explicacion": "por qué es esa",
        "pista": "una pequeña ayuda"
      }}
    ]
    Apuntes: {texto_contexto}
    """
    
    try:
        respuesta = model.generate_content(instrucciones)
        # Limpiamos posibles etiquetas de markdown que Gemini a veces añade
        json_puro = respuesta.text.replace("```json", "").replace("```", "").strip()
        lista_quiz = json.loads(json_puro)
        
        # Guardamos en DB
        db.guardar_quiz_cuaderno(notebook_id, lista_quiz)
        return {"quiz": lista_quiz, "cache": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error generando el test")