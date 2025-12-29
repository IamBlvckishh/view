export default async function handler(req, res) {
    const { wallet, next, address, id, chain } = req.query;
    const apiKey = process.env.OPENSEA_API_KEY;

    // 1. Handle Single NFT Detail (Specific to one chain)
    if (address && id) {
        const selectedChain = chain ? chain.toLowerCase() : 'ethereum';
        const url = `https://api.opensea.io/api/v2/chain/${selectedChain}/contract/${address}/nfts/${id}`;
        try {
            const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
            const data = await response.json();
            res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
            return res.status(200).json(data);
        } catch (e) { 
            return res.status(500).json({ error: e.message }); 
        }
    }

    // 2. Handle Gallery Fetch (Support for "all")
    // If chain is "all", we define the list, otherwise just the one selected
    const chainList = (chain === 'all' || !chain) 
        ? ['ethereum', 'base', 'shape'] 
        : [chain.toLowerCase()];

    try {
        // We fetch all chains in the list simultaneously
        const promises = chainList.map(async (c) => {
            const baseUrl = `https://api.opensea.io/api/v2/chain/${c}/account/${wallet}/nfts`;
            const url = next ? `${baseUrl}?next=${next}&limit=50` : `${baseUrl}?limit=50`;
            const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
            return response.json();
        });

        const results = await Promise.all(promises);

        // Merge all NFT arrays and keep the last "next" cursor for pagination
        let combinedNfts = [];
        let lastNext = null;

        results.forEach((data, index) => {
            if (data.nfts) {
                // We tag each NFT with its chain so the frontend knows where it came from
                const tagged = data.nfts.map(n => ({ ...n, chain: chainList[index] }));
                combinedNfts = [...combinedNfts, ...tagged];
            }
            if (data.next) lastNext = data.next;
        });

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json({ nfts: combinedNfts, next: lastNext });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
