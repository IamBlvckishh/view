// Initialize Icons
lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const status = document.getElementById('status');

let continuation = null;
let currentWallet = "";
let isFetching = false;

// The main function to get data from Shape
async function fetchArt(isNewSearch = false) {
    if (isFetching || !currentWallet) return;
    
    isFetching = true;
    status.innerText = "Scanning...";

    if (isNewSearch) {
        gallery.innerHTML = "";
        continuation = null;
    }

    try {
        let url = `https://api-shape.reservoir.tools/users/${currentWallet}/tokens/v7?limit=10`;
        if (continuation) url += `&continuation=${continuation}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.tokens.length === 0 && isNewSearch) {
            status.innerText = "Empty Wallet";
        } else {
            renderTokens(data.tokens);
            continuation = data.continuation;
            status.innerText = continuation ? "Keep Scrolling" : "End of View";
        }
    } catch (err) {
        status.innerText = "Error Connecting";
        console.error(err);
    } finally {
        isFetching = false;
    }
}

function renderTokens(tokens) {
    tokens.forEach(item => {
        const card = document.createElement('div');
        card.className = 'art-card';
        
        const imgSrc = item.token.image || 'https://via.placeholder.com/500x500?text=No+Image';
        const name = item.token.name || `#${item.token.tokenId.slice(0, 5)}`;
        
        card.innerHTML = `
            <div class="image-wrapper">
                <img src="${imgSrc}" loading="lazy">
            </div>
            <div class="meta">
                <div class="art-name">${name}</div>
                <div class="collection-name">${item.token.collection.name}</div>
            </div>
        `;
        gallery.appendChild(card);
        
        // Trigger the fade-in animation
        setTimeout(() => card.classList.add('visible'), 100);
    });
    lucide.createIcons();
}

// --- DOOMSCROLL TRIGGER ---
window.onscroll = () => {
    // If user is near the bottom of the page
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        if (continuation && !isFetching) {
            fetchArt();
        }
    }
};

// Search Interactions
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
