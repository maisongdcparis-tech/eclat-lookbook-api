export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { concept, skus, palette } = req.body;

  try {
    const prompt = `
      Create a stylized product photoshoot with the following details:
      - Concept: ${concept}
      - Color Palette: ${palette.join(', ')}
      - Featured SKUs: ${skus.join(', ')}
      The scene should be artistic, editorial, and richly detailed.
      Output should be a 1024x1024 stylized JPG or PNG image.
    `;

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await geminiResponse.json();

    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inline_data?.data);
    const base64Image = imagePart?.inline_data?.data;

    if (!base64Image) {
      return res.status(500).json({ error: 'No image returned from Gemini API', debug: data });
    }

    res.status(200).json({
      message: "Lookbook generated successfully!",
      concept,
      skus,
      palette,
      preview_image: `data:image/png;base64,${base64Image}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate image', details: error.message });
  }
}
