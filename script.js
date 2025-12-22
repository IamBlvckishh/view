lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('empty-state');

let continuation = null;
let currentWallet = "";
let isFetching = false;

async function fetchNFTs(isNew = false) {
    if (isFetching || !currentWallet) return;
    
    isFetching = true;
    loader.classList.remove('hidden');
    if (isNew) {
        gallery.innerHTML = "";
        emptyState.style.display = "none";
    }

    try {
        // Updated Reservoir endpoint specifically for Shape
        const baseUrl = `https://api-shape.reservoir.tools/users/${currentWallet}/tokens/v7`;
        const url = continuation ? `${baseUrl}?continuation=${continuation}&limit=12` : `${baseUrl}?limit=12`;

        const response = await fetch(url);
        
        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();

        if (data.tokens && data.tokens.length > 0) {
            render(data.tokens);
            continuation = data.continuation;
        } else if (isNew) {
            gallery.innerHTML = '<p style="text-align:center;color:#555">No tokens found in this wallet.</p>';
        }
    } catch (err) {
        console.error(err);
        alert("Failed to load tokens. Check the address or try again.");
    } finally {
        isFetching = false;
        loader.classList.add('hidden');
    }
}

function render(tokens) {
    tokens.forEach(item => {
        const t = item.token;
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.innerHTML = `
            <div class="img-frame">
                <img src="${t.image || 'https://via.placeholder.com/600x600?text=Shape+NFT'}" alt="">
            </div>
            <div class="meta">
                <div class="nft-name">${t.name || '#' + t.tokenId.slice(0,5)}</div>
                <div class="collection">${t.collection.name}</div>
            </div>
        `;
        gallery.appendChild(card);
    });
}

// Doomscroll Logic
window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        if (continuation && !isFetching) fetchNFTs();
    }
};

btn.onclick = () => {
    currentWallet = input.value.trim();
    if (currentWallet) fetchNFTs(true);
};

input.onkeydown = (e) => {
    if (e.key === 'Enter') {
        currentWallet = input.value.trim();
        fetchNFTs(true);
    }
};
