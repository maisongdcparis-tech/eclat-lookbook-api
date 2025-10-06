export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { concept = "", skus = [], palette = [] } = req.body || {};
  const API_KEY =
    process.env.GOOGLE_GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Missing Gemini API key in env' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(API_KEY)}`;

    const prompt = `Luxury lookbook frame (ONE image).
Concept: ${concept}
Palette: ${[].concat(palette).join(', ')}
SKUs: ${[].concat(skus).join(', ')}
Style: Parisian minimalist luxe, candlelight 2700K, cohesive editorial art direction.`;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!r.ok) return res.status(r.status).json({ error: 'Gemini request failed', details: await r.text() });

    const data = await r.json();
    const part = data?.candidates?.[0]?.content?.parts?.find(p => p?.inline_data?.data);
    const base64 = part?.inline_data?.data;
    const mime = part?.inline_data?.mime_type || 'image/png';
    if (!base64) return res.status(500).json({ error: 'No image returned from Gemini', debug: data });

    return res.status(200).json({ image: `data:${mime};base64,${base64}` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate image', details: String(err) });
  }
}
