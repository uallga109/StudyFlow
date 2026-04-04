import google.generativeai as genai
import os
from dotenv import load_dotenv

# Cargamos tu clave
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Buscando modelos disponibles...")
print("-" * 30)

# Le pedimos a Google la lista de modelos que soportan texto
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)