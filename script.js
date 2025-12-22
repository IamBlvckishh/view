lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const status = document.getElementById('status');
const loader = document.getElementById('loader');

let continuation = null;
let currentWallet = "";

async function fetchArt(isNew = false) {
    if (!currentWallet) return;
    
    loader.classList.remove('hidden');
    if (status) status.innerText = "Scanning..."; // Added a safety check here

    if (isNew) {
        gallery.innerHTML = "";
        continuation = null;
    }

    try {
        const url = `https://api-shape.reservoir.tools/users/${currentWallet}/tokens/v7?limit=12${continuation ? `&continuation=${continuation}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.tokens) {
            data.tokens.forEach(item => {
                const card = document.createElement('div');
                card.className = 'nft-card';
                card.innerHTML = `
                    <div class="img-frame">
                        <img src="${item.token.image || ''}" loading="lazy">
                    </div>
                    <div class="meta">
                        <div class="name">${item.token.name || 'Untitled'}</div>
                        <div class="collection">${item.token.collection.name}</div>
                    </div>
                `;
                gallery.appendChild(card);
            });
            continuation = data.continuation;
            if (status) status.innerText = continuation ? "Scroll for more" : "End of View";
        }
    } catch (e) {
        if (status) status.innerText = "Error loading wallet";
    } finally {
        loader.classList.add('hidden');
    }
}

btn.onclick = () => {
    currentWallet = input.value.trim();
    fetchArt(true);
};

input.onkeydown = (e) => {
    if (e.key === 'Enter') {
        currentWallet = input.value.trim();
        fetchArt(true);
    }
};
