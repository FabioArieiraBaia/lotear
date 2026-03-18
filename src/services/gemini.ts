import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const extractLotesFromImage = async (base64Image: string, mimeType: string) => {
  const prompt = `
    Analise esta imagem de planta de loteamento.
    Identifique todos os lotes individuais visíveis.
    Para cada lote, extraia as coordenadas dos cantos (polígono) em um formato normalizado de 0 a 1000 (onde [0,0] é o topo esquerdo e [1000,1000] o inferior direito).
    Tente ler o número ou identificação de cada lote se estiver escrito.
    Retorne os dados estritamente em um formato JSON estruturado assim:
    {"lotes": [{"name": "Lote 01", "polygon": [[y1, x1], [y2, x2]], "area": "..."}]}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1], // remove data:image/jpeg;base64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  polygon: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER }
                    }
                  },
                  area: { type: Type.STRING }
                },
                required: ["name", "polygon"]
              }
            }
          },
          required: ["lotes"]
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return null;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
