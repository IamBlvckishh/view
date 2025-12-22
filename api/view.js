export default async function handler(req, res) {
    const { wallet, next } = req.query;
    // Get this from your Vercel Environment Variables
    const apiKey = process.env.OPENSEA_API_KEY; 

    // OpenSea API v2 endpoint for Shape L2
    const baseUrl = `https://api.opensea.io/api/v2/chain/shape/account/${wallet}/nfts`;
    const url = next ? `${baseUrl}?next=${next}&limit=12` : `${baseUrl}?limit=12`;

    try {
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'x-api-key': apiKey
            }
        });
        
        if (!response.ok) throw new Error(`OpenSea error: ${response.status}`);
        
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
