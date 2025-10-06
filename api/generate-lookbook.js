export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { concept = "", skus = [], palette = [], count = 1 } = req.body || {};
  const API_KEY =
    process.env.GOOGLE_GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Missing Gemini API key in env' });
  }

  try {
    const model = "gemini-2.5-flash-image"; // image-capable model id
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`;

    const safeCount = Math.max(1, Math.min(8, Number(count) || 1));

    const prompt = `
Create a stylized product photoshoot for a Maison GDC lookbook.
Concept: ${concept}
Color Palette: ${Array.isArray(palette) ? palette.join(', ') : palette}
Featured SKUs: ${Array.isArray(skus) ? skus.join(', ') : skus}
Style: Parisian minimalist luxe, cohesive editorial lighting at 2700K candlelight.
Output: ${safeCount} cohesive frames suitable for a luxury deck; avoid generic props; interpret listed SKUs for finishes/styling.
`.trim();

    const body = { contents: [{ parts: [{ text: prompt }] }] };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const details = await r.text();
      return res.status(r.status).json({ error: 'Gemini request failed', details });
    }

    const data = await r.json();

    // Collect any returned images (inline_data)
    const images = [];
    for (const c of data.candidates || []) {
      for (const p of c.content?.parts || []) {
        if (p.inline_data?.data) {
          images.push({
            mime: p.inline_data.mime_type || 'image/png',
            base64: p.inline_data.data
          });
        }
      }
    }

    if (images.length === 0) {
      return res.status(500).json({ error: 'No image returned from Gemini', debug: data });
    }

    // Return first image as preview; keep all for future
    return res.status(200).json({
      message: 'Lookbook image(s) generated',
      concept, skus, palette,
      images: images.slice(0, safeCount).map((im) => ({
        mime: im.mime,
        data_url: `data:${im.mime};base64,${im.base64}`
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate image', details: String(err) });
  }
}
