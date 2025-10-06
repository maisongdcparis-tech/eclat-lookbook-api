export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { concept = "", skus = [], palette = [] } = req.body || {};

  // Ensure an API key is present (works with either var name)
  const API_KEY = process.env.GEMINI_IMAGE_API_KEY || process.env.GOOGLE_GEMINI_IMAGE_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Missing GEMINI_IMAGE_API_KEY / GOOGLE_GEMINI_IMAGE_API_KEY in environment' });
  }

  try {
    const prompt = `
Create a stylized product photoshoot with the following details:
- Concept: ${concept}
- Color Palette: ${Array.isArray(palette) ? palette.join(', ') : palette}
- Featured SKUs: ${Array.isArray(skus) ? skus.join(', ') : skus}
Style: Parisian minimalist luxe, editorial, candlelight at 2700K, cohesive art direction.
Output: one cohesive frame, at least 1024x1024.
Avoid generic props; interpret listed SKUs for finishes/styling.
    `.trim();

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' +
      API_KEY;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { response_mime_type: 'image/png' }, // <-- ensure we get an image
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!geminiResponse.ok) {
      const text = await geminiResponse.text();
      return res.status(geminiResponse.status).json({
        error: 'Gemini request failed',
        details: text
      });
    }

    const data = await geminiResponse.json();

    // Extract first image part
    const imagePart =
      data?.candidates?.[0]?.content?.parts?.find(
        (p) => p.inline_data?.data && /image\/(png|jpeg)/i.test(p.inline_data?.mime_type || '')
      );

    const base64Image = imagePart?.inline_data?.data;

    if (!base64Image) {
      return res.status(500).json({ error: 'No image returned from Gemini API', debug: data });
    }

    return res.status(200).json({
      message: 'Lookbook image generated',
      concept,
      skus,
      palette,
      preview_image: `data:image/png;base64,${base64Image}`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate image', details: String(error) });
  }
}
