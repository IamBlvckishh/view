lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const status = document.getElementById('status');
const loader = document.getElementById('loader');

let continuation = null;
let currentWallet = "";
let isFetching = false;

async function fetchArt(isNew = false) {
    // 1. Validation: Don't run if empty or already loading
    if (!currentWallet || isFetching) return;
    
    isFetching = true;
    loader.classList.remove('hidden');
    if (status) status.innerText = "Connecting to Shape...";

    if (isNew) {
        gallery.innerHTML = "";
        continuation = null;
    }

    try {
        // 2. The Request: Using the specific Shape L2 Reservoir endpoint
        const endpoint = `https://api-shape.reservoir.tools/users/${currentWallet}/tokens/v7?limit=12`;
        const url = continuation ? `${endpoint}&continuation=${continuation}` : endpoint;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        // 3. Error Check: Did the API actually answer?
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (data.tokens && data.tokens.length > 0) {
            render(data.tokens);
            continuation = data.continuation;
            if (status) status.innerText = continuation ? "Scroll to see more" : "End of collection";
        } else if (isNew) {
            if (status) status.innerText = "This wallet is empty or doesn't exist on Shape.";
        }
        
    } catch (e) {
        console.error("View Error:", e);
        if (status) status.innerText = "Error: Use a valid 0x address";
    } finally {
        isFetching = false;
        loader.classList.add('hidden');
    }
}

function render(tokens) {
    tokens.forEach(item => {
        const card = document.createElement('div');
        card.className = 'nft-card';
        // We use the 'token' object inside each result
        const t = item.token;
        card.innerHTML = `
            <div class="img-frame">
                <img src="${t.image || 'https://via.placeholder.com/600?text=Shape+Art'}" loading="lazy" onerror="this.src='https://via.placeholder.com/600?text=Image+Load+Failed'">
            </div>
            <div class="meta">
                <div class="name">${t.name || '#' + t.tokenId.slice(0, 5)}</div>
                <div class="collection">${t.collection.name || 'Unknown Collection'}</div>
            </div>
        `;
        gallery.appendChild(card);
    });
}

// Infinite Scroll Trigger
window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        if (continuation && !isFetching) fetchArt();
    }
};

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
