import { put } from '@vercel/blob';

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } }; // allow larger model response

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { concept = "", skus = [], palette = [] } = req.body || {};
  const API_KEY =
    process.env.GOOGLE_GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Missing Gemini API key in env' });

  try {
    const model = "gemini-2.5-flash-image";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`;

    // Short, safe prompt (keeps responses consistent)
    const prompt = `One luxury lookbook frame.
Concept: ${concept}
Palette: ${[].concat(palette).join(', ')}
SKUs: ${[].concat(skus).join(', ')}
Style: Parisian minimalist luxe; candlelight 2700K; cohesive editorial art direction.`;

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

    // Upload to Vercel Blob → get a public URL
    const buf = Buffer.from(base64, 'base64');
    const fileName = `lookbooks/${Date.now()}-${(concept || 'concept').slice(0,32).replace(/\s+/g,'-')}.png`;
    const { url: publicUrl } = await put(fileName, buf, { access: 'public', contentType: mime });

    return res.status(200).json({ message: 'Lookbook image generated', url: publicUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate image', details: String(err) });
  }
}
