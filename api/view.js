export default async function handler(req, res) {
    const { wallet, continuation } = req.query;
    const apiKey = process.env.RESERVOIR_API_KEY; // Pulled from Vercel Environment Variables

    const baseUrl = `https://api-shape.reservoir.tools/users/${wallet}/tokens/v7`;
    const url = continuation ? `${baseUrl}?continuation=${continuation}&limit=12` : `${baseUrl}?limit=12`;

    try {
        const response = await fetch(url, {
            headers: {
                'accept': '*/*',
                'x-api-key': apiKey
            }
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch from Shape" });
    }
}
