from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database as db
from google import genai  # <--- Nueva librería de 2026
import os
import json
from dotenv import load_dotenv
import uuid
from datetime import datetime
import traceback # Añade esto arriba del todo con los otros imports

# --- CONFIGURACIÓN INICIAL ---
load_dotenv()

app = FastAPI(title="StudyFlow API Pro", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURACIÓN DE IA (NUEVA SDK) ---
# Inicializamos el cliente moderno
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
# Usamos el modelo Flash 2.0, que es el más rápido y estable ahora mismo
MODEL_ID = "gemini-2.5-flash"

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

class PeticionFlashcards(BaseModel):
    fuentes: list[str]
    num_tarjetas: int

class PeticionMapaMental(BaseModel):
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
    texto_extraido = db.extraer_texto_cuaderno(notebook_id, [file.filename])
    db.indexar_pdf(notebook_id, file.filename, texto_extraido)
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
        respuesta = client.models.generate_content(
            model=MODEL_ID,
            contents=instrucciones
        )
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
        
        print("❌ ERROR QUIZ:")
        print(traceback.format_exc()) # ESTO IMPRIMIRÁ TODA LA RUTA DEL ERROR
        raise HTTPException(status_code=500, detail="Error generando quiz")

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
    try:
        # 1. BUSCAMOS CONTEXTO
        busqueda = db.buscar_contexto(notebook_id, peticion.mensaje)
        
        # ESCUDO: Verificamos que realmente hayamos encontrado algo
        hay_contexto = (
            busqueda and 
            'documents' in busqueda and 
            len(busqueda['documents']) > 0 and 
            len(busqueda['documents'][0]) > 0
        )

        if not hay_contexto:
            contexto_formateado = "No se ha encontrado información específica en los apuntes para esta pregunta."
        else:
            fragmentos = busqueda['documents'][0]
            fuentes = busqueda['metadatas'][0]
            contexto_formateado = ""
            for i in range(len(fragmentos)):
                nombre_fuente = fuentes[i].get('source', 'Archivo desconocido')
                contexto_formateado += f"\n--- FRAGMENTO DE {nombre_fuente} ---\n{fragmentos[i]}\n"

        # 2. PROMPT CON SEGURIDAD
        instrucciones = f"""
        Eres un asistente de estudio experto. 
        Responde a la pregunta del alumno usando el contexto de sus apuntes.
        Si la información no está clara en los apuntes, intenta responder con tu conocimiento general pero adviértelo.
        Al final de tu respuesta, indica siempre los archivos usados como referencia.

        CONTEXTO DE LOS APUNTES:
        {contexto_formateado}
        
        PREGUNTA DEL ALUMNO:
        {peticion.mensaje}
        """
        
        # Antes: respuesta = model.generate_content(instrucciones)
        # Ahora (con el nuevo SDK):
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=instrucciones
        )
        return {"respuesta": response.text}

    except Exception as e:
       # Si el error es el 429 (límite de peticiones de Google)
        if "429" in str(e):
            return {
                "respuesta": "⚠️ **¡Límite de API alcanzado!** \n\nHas agotado las 20 peticiones gratuitas de hoy para el modelo Flash. "
                             "Google nos ha cortado el grifo temporalmente. Toca esperar unas horas o cambiar de API Key. "
                             "¡Pero oye, la búsqueda en los PDFs ha funcionado perfecto!"
            }
        
        # Para cualquier otro error, lo sacamos por consola
        print(f"❌ ERROR EN EL CHAT: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno de la IA")

# NUEVO: Endpoint para indexar todo lo que ya existe
@app.post("/api/notebooks/{notebook_id}/sync")
def sincronizar_biblioteca(notebook_id: str):
    cuaderno = db.obtener_cuaderno(notebook_id)
    if not cuaderno: raise HTTPException(status_code=404)
    
    # Extraemos el texto de todos los archivos que tiene el cuaderno
    for archivo in cuaderno["fuentes"]:
        texto = db.extraer_texto_cuaderno(notebook_id, [archivo])
        if texto:
            db.indexar_pdf(notebook_id, archivo, texto)
            
    return {"mensaje": f"Sincronizados {len(cuaderno['fuentes'])} archivos en el cerebro vectorial."}


@app.get("/api/debug/sync/{notebook_id}")
def forzar_indexacion(notebook_id: str):
    cuaderno = db.obtener_cuaderno(notebook_id)
    if not cuaderno: return {"error": "no existe"}
    
    for archivo in cuaderno["fuentes"]:
        texto = db.extraer_texto_cuaderno(notebook_id, [archivo])
        db.indexar_pdf(notebook_id, archivo, texto)
        
    return {"status": "Cerebro actualizado", "archivos": cuaderno["fuentes"]}


@app.post("/api/notebooks/{notebook_id}/flashcards")
def generar_flashcards(notebook_id: str, peticion: PeticionFlashcards):
    try:
        # 1. Usamos TU función nativa para leer todo el texto de los PDFs
        contexto_formateado = db.extraer_texto_cuaderno(notebook_id, peticion.fuentes)

        if not contexto_formateado or not contexto_formateado.strip():
            print("⚠️ ADVERTENCIA: No se pudo extraer texto de los PDFs.")
            raise HTTPException(status_code=400, detail="No hay texto en las fuentes seleccionadas.")

        # 2. Preparamos las instrucciones
        instrucciones = f"""
        Eres un sistema experto en crear material de estudio. 
        Basándote ÚNICAMENTE en el siguiente contexto, genera {peticion.num_tarjetas} flashcards (tarjetas de estudio).
        
        REGLA ESTRICTA: Devuelve ÚNICAMENTE un JSON válido con esta estructura:
        {{
            "flashcards": [
                {{"anverso": "Pregunta o Concepto corto", "reverso": "Respuesta o Definición clara y directa"}},
                {{"anverso": "Siguiente concepto...", "reverso": "Siguiente definición..."}}
            ]
        }}

        CONTEXTO:
        {contexto_formateado}
        """
        
        # 3. Llamamos a Gemini
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=instrucciones
        )
        
        # 4. Limpieza extrema del JSON de Gemini
        texto_bruto = response.text
        inicio = texto_bruto.find('{')
        fin = texto_bruto.rfind('}') + 1
        
        if inicio == -1 or fin == 0:
            raise ValueError("No se encontró un JSON válido en la respuesta de la IA")
        
        texto_limpio = texto_bruto[inicio:fin]
        return json.loads(texto_limpio)

    except Exception as e:
        print("❌ ERROR FLASHCARDS:")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error generando flashcards")

@app.post("/api/notebooks/{notebook_id}/mapa-mental")
def generar_mapa_mental(notebook_id: str, peticion: PeticionMapaMental):
    try:
        # 1. Buscamos el contexto general
        busqueda = db.buscar_contexto(notebook_id, "esquema general, conceptos clave y su jerarquía")
        
        contexto_formateado = ""
        if busqueda and 'documents' in busqueda and len(busqueda['documents']) > 0 and len(busqueda['documents'][0]) > 0:
            for frag in busqueda['documents'][0]:
                contexto_formateado += f"\n{frag}\n"

        # 2. Instrucciones estilo NotebookLM
        instrucciones = f"""
        Eres un sistema experto en organizar conocimiento, similar a NotebookLM.
        Basándote en el contexto, genera un Mapa Mental o Guía de Estudio jerárquica.
        
        REGLA ESTRICTA: Devuelve ÚNICAMENTE un JSON válido con esta estructura:
        {{
            "tema_principal": "Título central de los apuntes",
            "resumen_global": "Un párrafo muy breve de lo que trata",
            "ramas": [
                {{
                    "concepto": "Concepto principal 1",
                    "explicacion": "Breve definición",
                    "sub_ramas": ["Subconcepto A", "Subconcepto B"]
                }},
                {{
                    "concepto": "Concepto principal 2",
                    "explicacion": "Breve definición",
                    "sub_ramas": ["Subconcepto C"]
                }}
            ]
        }}

        CONTEXTO:
        {contexto_formateado}
        """
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=instrucciones
        )
        
        texto_limpio = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(texto_limpio)

    except Exception as e:
        print(f"❌ ERROR MAPA MENTAL: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generando mapa mental")