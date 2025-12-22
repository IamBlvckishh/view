export default async function handler(req, res) {
    const { wallet, next, address, id } = req.query;
    const apiKey = process.env.OPENSEA_API_KEY;

    // Route A: Fetching Single NFT Details
    if (address && id) {
        const url = `https://api.opensea.io/api/v2/chain/shape/contract/${address}/nfts/${id}`;
        try {
            const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
            const data = await response.json();
            res.status(200).json(data);
        } catch (e) { res.status(500).json({ error: e.message }); }
        return;
    }

    // Route B: The Feed
    const baseUrl = `https://api.opensea.io/api/v2/chain/shape/account/${wallet}/nfts`;
    const url = next ? `${baseUrl}?next=${next}&limit=12` : `${baseUrl}?limit=12`;

    try {
        const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
}
