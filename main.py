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

class PeticionChat(BaseModel):
    mensaje: str

class PeticionQuiz(BaseModel):
    fuentes: list[str]
    num_preguntas: int

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
def generar_quiz_cuaderno(notebook_id: str, peticion: PeticionQuiz):
    cuaderno = db.obtener_cuaderno(notebook_id)
    if not cuaderno: raise HTTPException(status_code=404)

    texto_contexto = db.extraer_texto_cuaderno(notebook_id, peticion.fuentes)
    if not texto_contexto.strip(): raise HTTPException(status_code=400)
    
    instrucciones = f"""
    Genera un examen de EXACTAMENTE {peticion.num_preguntas} preguntas sobre estos apuntes.
    Responde ÚNICAMENTE con un JSON válido. 
    Formato: [{{ "pregunta": "...", "opciones": ["A", "B", "C", "D"], "correcta": "...", "explicacion": "...", "pista": "..." }}]
    Apuntes: {texto_contexto}
    """
    try:
        respuesta = model.generate_content(instrucciones)
        json_puro = respuesta.text.replace("```json", "").replace("```", "").strip()
        lista_preguntas = json.loads(json_puro)
        
        nuevo_quiz = {
            "id": str(uuid.uuid4()),
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "fuentes_usadas": peticion.fuentes,
            "preguntas": lista_preguntas
        }
        db.guardar_quiz_en_historial(notebook_id, nuevo_quiz)
        return nuevo_quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NUEVO: Endpoint para obtener recomendación de preguntas
@app.post("/api/notebooks/{notebook_id}/quiz/recommend")
def recomendar_preguntas(notebook_id: str, peticion: PeticionResumen): # Reutilizamos el modelo de fuentes
    paginas = db.obtener_info_pdf(notebook_id, peticion.fuentes)
    # Lógica: 3 preguntas por página, mínimo 5, máximo 50
    recomendadas = max(5, min(50, paginas * 3))
    return {"paginas": paginas, "recomendadas": recomendadas}


# 7. Borrar un Cuaderno entero
@app.delete("/api/notebooks/{notebook_id}")
def eliminar_cuaderno(notebook_id: str):
    if not db.borrar_cuaderno(notebook_id):
        raise HTTPException(status_code=404, detail="Cuaderno no encontrado")
    return {"mensaje": "Cuaderno eliminado correctamente"}

# 8. Borrar un PDF de un Cuaderno
@app.delete("/api/notebooks/{notebook_id}/files/{filename}")
def eliminar_pdf(notebook_id: str, filename: str):
    if not db.borrar_archivo_de_cuaderno(notebook_id, filename):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return {"mensaje": "Archivo eliminado correctamente"}

# 9. Chat Libre con los Apuntes
@app.post("/api/notebooks/{notebook_id}/chat")
def chatear_con_cuaderno(notebook_id: str, peticion: PeticionChat):
    texto_contexto = db.extraer_texto_cuaderno(notebook_id)
    
    if not texto_contexto.strip():
        raise HTTPException(status_code=400, detail="No hay fuentes para consultar. Sube un PDF primero.")
    
    # Orden estricta RAG: Solo puede usar el contexto
    instrucciones = f"""
    Eres un asistente de estudio experto.
    Responde a la pregunta del usuario basándote ÚNICA Y EXCLUSIVAMENTE en el siguiente contexto de sus apuntes.
    Si la respuesta no está en los apuntes, di amablemente "No he encontrado información sobre esto en tus fuentes."
    Usa formato Markdown para que la respuesta sea fácil de leer.
    
    CONTEXTO DE LOS APUNTES:
    {texto_contexto}
    
    PREGUNTA DEL USUARIO:
    {peticion.mensaje}
    """
    
    try:
        respuesta = model.generate_content(instrucciones)
        return {"respuesta": respuesta.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))