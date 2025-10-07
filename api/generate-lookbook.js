import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: { sizeLimit: '32mb' }, // allow big image payloads from Google
    responseLimit: false               // don’t cap our JSON response
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { concept = "", skus = [], palette = [] } = req.body || {};
  const API_KEY =
    process.env.GOOGLE_GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Missing Gemini API key' });

  try {
    const model = 'gemini-2.5-flash-image';
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`;

    // Keep prompt short; hint a smaller JPEG to reduce payload size
    const prompt =
`One luxury lookbook hero frame for Maison GDC.
Concept: ${concept}
Palette: ${[].concat(palette).join(', ')}
SKUs: ${[].concat(skus).join(', ')}
Style: Parisian minimalist luxe; candlelight ~2700K; cohesive editorial art direction.
Return a single JPEG around 896×504 (landscape).`;

    // Minimal schema (no generationConfig/size field)
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

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

    // Extract first inline image
    const part = data?.candidates?.[0]?.content?.parts?.find(p => p?.inline_data?.data);
    const base64 = part?.inline_data?.data;
    const mime = part?.inline_data?.mime_type || 'image/jpeg';
    if (!base64) return res.status(500).json({ error: 'No image returned from Gemini', debug: data });

    // Upload to Vercel Blob → return URL
    const buf = Buffer.from(base64, 'base64');
    const fileName = `lookbooks/${Date.now()}-${(concept || 'concept').slice(0,32).replace(/\s+/g,'-')}.jpg`;
    const { url: publicUrl } = await put(fileName, buf, { access: 'public', contentType: mime });

    return res.status(200).json({ message: 'Lookbook image generated', url: publicUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate image', details: String(err) });
  }
}
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: { sizeLimit: '6mb' }, // allow slightly bigger incoming payloads
    responseLimit: false              // don't cap our JSON response
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { concept = "", skus = [], palette = [] } = req.body || {};
  const API_KEY =
    process.env.GOOGLE_GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_IMAGE_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!API_KEY)
    return res.status(500).json({ error: 'Missing Gemini API key' });

  try {
    const model = "gemini-2.5-flash-image";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`;

    const prompt =
`One luxury lookbook frame for Maison GDC.
Concept: ${concept}
Palette: ${[].concat(palette).join(', ')}
SKUs: ${[].concat(skus).join(', ')}
Style: Parisian minimalist luxe; candlelight 2700K; cohesive editorial art direction.`;

    // ↓↓↓ CRUCIAL: ask for small, compressed output so the inbound payload fits
    const body = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "image/jpeg",
        // 1024x576 keeps quality but avoids >5–6MB base64 responses
        size: "1024x576"
      }
    };

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
    const part = data?.candidates?.[0]?.content?.parts?.find(p => p?.inline_data?.data);
    const base64 = part?.inline_data?.data;
    const mime = part?.inline_data?.mime_type || 'image/jpeg';

    if (!base64)
      return res.status(500).json({ error: 'No image returned from Gemini', debug: data });

    // Upload to Vercel Blob → return a URL (tiny JSON response)
    const buf = Buffer.from(base64, 'base64');
    const fileName = `lookbooks/${Date.now()}-${(concept || 'concept').slice(0,32).replace(/\s+/g,'-')}.jpg`;
    const { url: publicUrl } = await put(fileName, buf, { access: 'public', contentType: mime });

    return res.status(200).json({ message: 'Lookbook image generated', url: publicUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate image', details: String(err) });
  }
}
