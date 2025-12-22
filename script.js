lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const status = document.getElementById('status');
const loader = document.getElementById('loader');

let continuation = null;
let currentWallet = "";
let isFetching = false;

// 1. RESOLVE ENS (.eth to 0x)
async function resolveAddress(inputVal) {
    if (inputVal.endsWith('.eth')) {
        try {
            if (status) status.innerText = "RESOLVING ENS...";
            const res = await fetch(`https://api.ensoul.xyz/resolve/${inputVal}`);
            const data = await res.json();
            if (data.address) return data.address;
            throw new Error("Could not resolve ENS");
        } catch (e) {
            return null;
        }
    }
    return inputVal; // Already a 0x address
}

async function fetchArt(isNew = false) {
    if (!currentWallet || isFetching) return;
    
    isFetching = true;
    loader.classList.remove('hidden');
    if (status) status.innerText = "VIEWING SHAPE...";

    if (isNew) {
        gallery.innerHTML = "";
        continuation = null;
    }

    try {
        const baseUrl = `https://api-shape.reservoir.tools/users/${currentWallet}/tokens/v7`;
        const params = new URLSearchParams({ limit: '12' });
        if (continuation) params.append('continuation', continuation);

        const response = await fetch(`${baseUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                // This looks for the API key in your Vercel settings
                'x-api-key': 'YOUR_RESERVOIR_API_KEY' 
            }
        });

        if (!response.ok) throw new Error("API Blocked");

        const data = await response.json();

        if (data.tokens && data.tokens.length > 0) {
            render(data.tokens);
            continuation = data.continuation;
            if (status) status.innerText = continuation ? "KEEP SCROLLING" : "END OF GALLERY";
        } else if (isNew) {
            if (status) status.innerText = "NO ART FOUND";
        }

    } catch (e) {
        console.error(e);
        if (status) status.innerText = "CONNECTION ERROR";
    } finally {
        isFetching = false;
        loader.classList.add('hidden');
    }
}

function render(tokens) {
    tokens.forEach(item => {
        const t = item.token;
        if (!t.image) return;

        const card = document.createElement('div');
        card.className = 'art-card';
        card.innerHTML = `
            <div class="img-frame">
                <img src="${t.image}" loading="lazy">
            </div>
            <div class="meta">
                <div class="name">${t.name || 'UNTITLED'}</div>
                <div class="collection">${t.collection.name}</div>
            </div>
        `;
        gallery.appendChild(card);
    });
}

// Action Trigger
async function startSearch() {
    const rawInput = input.value.trim();
    if (!rawInput) return;
    
    // Resolve ENS if needed
    currentWallet = await resolveAddress(rawInput);
    
    if (!currentWallet) {
        if (status) status.innerText = "INVALID ENS NAME";
        return;
    }
    
    fetchArt(true);
}

btn.onclick = startSearch;
input.onkeydown = (e) => { if (e.key === 'Enter') startSearch(); };

window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        if (continuation && !isFetching) fetchArt();
    }
};
