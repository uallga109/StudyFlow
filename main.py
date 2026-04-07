from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database as db
from google import genai  
import os
import json
from dotenv import load_dotenv
import uuid
from datetime import datetime
import traceback 
import random

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

class PeticionCompra(BaseModel):
    precio: int
    item_id: str

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
        data_limpia = json.loads(texto_limpio)
        nuevo_mazo = {
            "id": str(uuid.uuid4()),
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "fuentes_usadas": peticion.fuentes,
            "tarjetas": data_limpia["flashcards"]
        }
        db.guardar_flashcards_cuaderno(notebook_id, nuevo_mazo)
        return nuevo_mazo
    
    except Exception as e:
        print("❌ ERROR FLASHCARDS:")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error generando flashcards")

# --- RUTA PARA EL MAPA MENTAL ---
class PeticionMapa(BaseModel):
    fuentes: list[str]

@app.post("/api/notebooks/{notebook_id}/mapamental")
def generar_mapa_mental(notebook_id: str, peticion: PeticionMapa):
    try:
        # 1. Extraemos el texto usando nuestra función fiable
        contexto_formateado = db.extraer_texto_cuaderno(notebook_id, peticion.fuentes)

        if not contexto_formateado or not contexto_formateado.strip():
            raise HTTPException(status_code=400, detail="No hay texto en las fuentes.")

       # 2. Las instrucciones para Gemini (Solo estructura lógica)
        instrucciones = f"""
        Eres un experto creando mapas mentales. Analiza el siguiente texto y extrae los conceptos principales.
        Crea un mapa mental estructurado en forma de árbol:
        - 1 Nivel Raíz (El Tema Principal, su id DEBE ser "root").
        - Niveles secundarios (Subtemas).
        - Niveles terciarios (Detalles).

        Devuelve ÚNICAMENTE un JSON con dos listas: "nodos" y "lineas".
        NO incluyas coordenadas (position), solo la etiqueta (label) y el id.

        Ejemplo exacto del formato JSON requerido:
        {{
            "nodos": [
                {{"id": "root", "data": {{"label": "Tema Central"}}, "type": "input", "style": {{"background": "#3b82f6", "color": "white", "fontWeight": "bold", "borderRadius": "8px"}}}},
                {{"id": "2", "data": {{"label": "Subtema 1"}}}},
                {{"id": "3", "data": {{"label": "Subtema 2"}}}}
            ],
            "lineas": [
                {{"id": "e-root-2", "source": "root", "target": "2", "animated": true}},
                {{"id": "e-root-3", "source": "root", "target": "3", "animated": true}}
            ]
        }}

        CONTEXTO A ANALIZAR:
        {contexto_formateado}
        """

        # 3. Llamada a Gemini
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=instrucciones
        )

        # 4. Limpieza del JSON
        texto_bruto = response.text
        inicio = texto_bruto.find('{')
        fin = texto_bruto.rfind('}') + 1
        
        if inicio == -1 or fin == 0:
            raise ValueError("No se encontró un JSON válido en la respuesta de la IA")
        
        data_mapa = json.loads(texto_bruto[inicio:fin])
        nuevo_mapa = {
            "id": str(uuid.uuid4()),
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "fuentes_usadas": peticion.fuentes,
            "nodos": data_mapa["nodos"],
            "lineas": data_mapa["lineas"]
        }
        db.guardar_mapa_cuaderno(notebook_id, nuevo_mapa)
        return nuevo_mapa
    
    except Exception as e:
        print("❌ ERROR MAPA MENTAL:")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error generando mapa mental")
    
    # --- RUTA PARA GENERAR EL MUNDO MARIO (EL JUEGO) ---
@app.post("/api/notebooks/{notebook_id}/juego")
def generar_juego(notebook_id: str):
    try:
        # 1. Obtener cuaderno
        cuaderno = db.obtener_cuaderno(notebook_id)
        if not cuaderno or not cuaderno.get("fuentes"):
            raise HTTPException(status_code=400, detail="El cuaderno no tiene fuentes.")

        contexto_formateado = db.extraer_texto_cuaderno(notebook_id, cuaderno["fuentes"])

        # 🎲 LÓGICA DEL DADO DEL MULTIVERSO
        mapas_ids = [
            "mapa_01_clasico", "mapa_02_locura", "mapa_03_cielos", 
            "mapa_04_subterraneo", "mapa_05_helado", "mapa_06_oscuro",
            "mapa_07_volcan", "mapa_08_archipielago", "mapa_09_devastadas",
            "mapa_10_peregrino", "mapa_11_estelar", "mapa_12_hardcore"
        ]
        mapa_asignado = random.choice(mapas_ids)

       # 3. El Mega-Prompt para Gemini (Diseñador de Niveles)
        instrucciones = f"""
        Eres un experto diseñador de videojuegos educativos. Tu misión es leer el siguiente temario y generar un juego de 6 niveles basado ESTRICTAMENTE en la información proporcionada.
        La dificultad debe ser progresiva, siguiendo la taxonomía de Bloom (desde reconocimiento hasta enseñanza).

        ESTRUCTURA EXACTA DE LOS NIVELES:
        - Nivel 1 (El Calentamiento): 15 preguntas de Verdadero/Falso. Dificultad media.
        - Nivel 2 (El Bosque Rápido): 10 preguntas de Tipo Test con solo 3 opciones. Dificultad media-baja.
        - Nivel 3 (El Mini-Castillo): Tiene 2 fases. 
            - Fase 1: 
              - 5 pares para un "Tablero de conexiones" (término y definición).
              - 5 frases para "Rellenar huecos". REGLA ESTRICTA PARA HUECOS: Deben ser frases LARGAS y con contexto, donde falte un ÚNICO concepto clave o palabra corta. El lugar de la palabra faltante DEBE indicarse siempre con tres guiones bajos "___". 
                * EJEMPLO MAL: frase: "La ___", respuesta_correcta: "mitocondria produce energía".
                * EJEMPLO BIEN: frase: "La organela encargada de la respiración celular y producción de energía es la ___", respuesta_correcta: "mitocondria".
            - Fase 2: 15 preguntas de Tipo Test (4 opciones) muy difíciles pensadas para hacerse a contrarreloj.
        - Nivel 4 (Las Cavernas del Recuerdo): 10 preguntas de respuesta corta exacta. Das la definición y la respuesta es una sola palabra o término clave.
        - Nivel 5 (La Torre de Casos): 5 escenarios prácticos. Test de 4 opciones donde se aplica la teoría a un problema o situación.
        - Nivel 6 (Jefe Final): tipo "jefe_pokemon". Debes generar un objeto con 4 listas separadas de 5 ejercicios cada una para simular "ataques": 
            1. "ataque_vf": 5 preguntas de verdadero o falso.
            2. "ataque_test": 5 preguntas con 4 opciones.
            3. "ataque_huecos": 5 frases LARGAS Y EXPLICATIVAS donde falte un ÚNICO concepto o palabra corta. 
                - El hueco debe indicarse estrictamente con "___". 
                - EJEMPLO MAL: frase: "El ___", respuesta_correcta: "perro es verde".
                - EJEMPLO BIEN: frase: "El perro de mi vecino es de color ___", respuesta_correcta: "verde".
            4. "ataque_palabra": 5 definiciones con su "respuesta_exacta".

        REGLA ESTRICTA: Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin markdown extra, solo el JSON puro):
        
            "niveles": [
                {{
                    "id": 1,
                    "nombre": "Mundo 1: El Calentamiento",
                    "tipo": "vf",
                    "preguntas": [
                        {{"pregunta": "¿El concepto X significa Y?", "opciones": ["Verdadero", "Falso"], "correcta": "Verdadero", "explicacion": "Porque..."}}
                    ]
                }},
                {{
                    "id": 2,
                    "nombre": "Mundo 2: El Bosque Rápido",
                    "tipo": "test3",
                    "preguntas": [
                        {{"pregunta": "¿Cuál es la causa de Z?", "opciones": ["A", "B", "C"], "correcta": "B", "explicacion": "Porque..."}}
                    ]
                }},
                {{
                    "id": 3,
                    "nombre": "Mundo 3: El Mini-Castillo",
                    "tipo": "minijefe",
                    "fase1_conexiones": [
                        {{"termino": "Concepto", "definicion": "Significado del concepto"}}
                    ],
                    "fase1_huecos": [
                        {{"frase": "La ___ es la parte principal de la célula.", "respuesta_correcta": "mitocondria"}}
                    ],
                    "fase2_test": [
                        {{"pregunta": "Pregunta difícil contrarreloj...", "opciones": ["A", "B", "C", "D"], "correcta": "A", "explicacion": "..."}}
                    ]
                }},
                {{
                    "id": 4,
                    "nombre": "Mundo 4: Las Cavernas del Recuerdo",
                    "tipo": "palabra_clave",
                    "preguntas": [
                        {{"definicion": "Proceso por el cual las plantas...", "respuesta_exacta": "fotosintesis"}}
                    ]
                }},
                {{
                    "id": 5,
                    "nombre": "Mundo 5: La Torre de Casos",
                    "tipo": "casos_practicos",
                    "preguntas": [
                        {{"pregunta": "Situación práctica detallada... ¿Qué solución aplicas?", "opciones": ["Op1", "Op2", "Op3", "Op4"], "correcta": "Op2", "explicacion": "..."}}
                    ]
                }},
                {{
                    "id": 6,
                    "nombre": "Mundo 6: La Ciudadela Cósmica",
                    "tipo": "jefe_pokemon",
                    "ataque_vf": [ {{"pregunta": "...", "opciones": ["Verdadero", "Falso"], "correcta": "...", "explicacion": "..."}} ],
                    "ataque_test": [ {{"pregunta": "...", "opciones": ["A","B","C","D"], "correcta": "...", "explicacion": "..."}} ],
                    "ataque_huecos": [ {{"frase": "La ___ es...", "respuesta_correcta": "..."}} ],
                    "ataque_palabra": [ {{"definicion": "...", "respuesta_exacta": "..."}} ]
                }}
            ]
        

        CONTEXTO A ANALIZAR: {contexto_formateado}
        """

        # Llamada a Gemini
        response = client.models.generate_content(model=MODEL_ID, contents=instrucciones)
        
        # Limpieza y carga de JSON
        texto_bruto = response.text
        inicio = texto_bruto.find('{')
        fin = texto_bruto.rfind('}') + 1
        datos_juego = json.loads(texto_bruto[inicio:fin])

        # 6. Guardar con el MAPA ASIGNADO
        db.guardar_juego_cuaderno(notebook_id, datos_juego, mapa_asignado)
        
        return {"mensaje": "¡Mundo forjado!", "mapa": mapa_asignado}

    except Exception as e:
        print("❌ ERROR GENERANDO JUEGO:")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error generando el juego")
    

# En main.py
@app.post("/api/notebooks/{notebook_id}/progreso")
def actualizar_progreso(notebook_id: str, nivel_id: int, vidas: int = 3, hardcore: bool = False):
    exito, monedas_ganadas, nivel_actual = db.actualizar_progreso_juego(notebook_id, nivel_id, vidas, hardcore)
    if not exito:
        raise HTTPException(status_code=404, detail="Cuaderno no encontrado")
    return {"mensaje": "Progreso guardado", "monedas_ganadas": monedas_ganadas, "nivel_actual": nivel_actual}

@app.post("/api/notebooks/{notebook_id}/comprar")
def comprar_item(notebook_id: str, peticion: PeticionCompra):
    exito = db.restar_monedas(notebook_id, peticion.precio)
    if not exito:
        raise HTTPException(status_code=400, detail="Monedas insuficientes o error")
    return {"mensaje": "Compra realizada con éxito"}


# ESTO TIENE QUE SER OBLIGATORIAMENTE LO ÚLTIMO DEL ARCHIVO
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)