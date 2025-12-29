export default async function handler(req, res) {
    const { wallet, next, address, id, chain } = req.query;
    const apiKey = process.env.OPENSEA_API_KEY;
    const selectedChain = chain ? chain.toLowerCase() : 'ethereum';

    let url = "";
    if (address && id) {
        url = `https://api.opensea.io/api/v2/chain/${selectedChain}/contract/${address}/nfts/${id}`;
    } else {
        const baseUrl = `https://api.opensea.io/api/v2/chain/${selectedChain}/account/${wallet}/nfts`;
        url = next ? `${baseUrl}?next=${next}&limit=50` : `${baseUrl}?limit=50`;
    }

    try {
        const response = await fetch(url, { 
            headers: { 'x-api-key': apiKey, 'accept': 'application/json' },
            next: { revalidate: 300 } // Vercel Cache for 5 mins
        });

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.detail || "API Error" });
        }

        const data = await response.json();
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
