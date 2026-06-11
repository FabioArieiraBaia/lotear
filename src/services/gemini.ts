export const extractLotesFromImage = async (base64Image: string, mimeType: string) => {
  const token = localStorage.getItem('adminToken');
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'api/gemini/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Erro ao processar planta no servidor.');
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling Gemini API proxy:", error);
    throw error;
  }
};
