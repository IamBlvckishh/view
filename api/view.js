export default async function handler(req, res) {
    // Added 'chain' to the destructured query
    const { wallet, next, address, id, chain } = req.query;
    const apiKey = process.env.OPENSEA_API_KEY;

    // Default to 'ethereum' if no chain is specified, otherwise use the passed value
    const selectedChain = chain ? chain.toLowerCase() : 'ethereum';

    if (address && id) {
        // Updated URL to use ${selectedChain} instead of hardcoded 'shape'
        const url = `https://api.opensea.io/api/v2/chain/${selectedChain}/contract/${address}/nfts/${id}`;
        try {
            const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
            const data = await response.json();
            
            // Set browser cache for 5 minutes
            res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
            res.status(200).json(data);
        } catch (e) { 
            res.status(500).json({ error: e.message }); 
        }
        return;
    }

    // Updated baseUrl to use ${selectedChain} instead of hardcoded 'shape'
    const baseUrl = `https://api.opensea.io/api/v2/chain/${selectedChain}/account/${wallet}/nfts`;
    const url = next ? `${baseUrl}?next=${next}&limit=50` : `${baseUrl}?limit=50`;

    try {
        const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
        const data = await response.json();
        
        // Set browser cache for 5 minutes
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(data);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
}
