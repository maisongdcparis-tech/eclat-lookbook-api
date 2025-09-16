export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { search = '' } = req.query;

  const baseURL = 'https://maisongdcparis.com/wp-json/wc/v3/products';
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;

  try {
    // Add more query parameters if needed: per_page, category, sku, etc.
    const url = `${baseURL}?search=${encodeURIComponent(search)}&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=20`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`WooCommerce API responded with status ${response.status}`);
    }
    const data = await response.json();

    const formatted = data.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      image: item.images[0]?.src || null,
      description: item.short_description,
      price: item.price,             // price
      regular_price: item.regular_price,
      sale_price: item.sale_price,
      permalink: item.permalink,
      tags: (item.tags || []).map(t => t.name),         // tags array
      categories: (item.categories || []).map(c => c.name), // categories array
      attributes: (item.attributes || []).map(attr => ({
        name: attr.name,
        options: attr.options
      }))
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching products from WooCommerce:', error);
    res.status(500).json({ error: 'WooCommerce API request failed' });
  }
}
