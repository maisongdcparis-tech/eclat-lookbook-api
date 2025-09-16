export default function handler(req, res) {
  if (req.method === 'POST') {
    const { concept, skus, palette } = req.body;

    res.status(200).json({
      message: "Lookbook generated successfully!",
      concept,
      skus,
      palette,
      preview_image: "https://via.placeholder.com/600x400?text=Éclat+Moodboard"
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
