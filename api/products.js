export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { search = '' } = req.query;

  const baseURL = 'https://maisongdcparis.com/wp-json/wc/v3/products';
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;

  try {
    const response = await fetch(`${baseURL}?search=${search}&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`);
    const data = await response.json();

    const formatted = data.map(item => ({
      id: item.id,
      name: item.name,
      image: item.images[0]?.src || null,
      description: item.short_description,
      permalink: item.permalink
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'WooCommerce API request failed' });
  }
}
