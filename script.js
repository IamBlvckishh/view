lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const status = document.getElementById('status');
const loader = document.getElementById('loader');

let continuation = null; // OpenSea uses 'next' cursor
let currentWallet = "";
let isFetching = false;

// ENS RESOLVER (Translates .eth to 0x)
async function resolveENS(name) {
    if (name.endsWith('.eth')) {
        try {
            status.innerText = "RESOLVING NAME...";
            const res = await fetch(`https://api.ensoul.xyz/resolve/${name}`);
            const data = await res.json();
            return data.address || null;
        } catch (e) { return null; }
    }
    return name;
}

async function fetchArt(isNew = false) {
    if (!currentWallet || isFetching) return;
    
    isFetching = true;
    loader.classList.remove('hidden');
    status.innerText = "VIEWING OPENSEA...";

    if (isNew) {
        gallery.innerHTML = "";
        continuation = null;
    }

    try {
        let url = `/api/view?wallet=${currentWallet}`;
        if (continuation) url += `&next=${continuation}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.nfts && data.nfts.length > 0) {
            render(data.nfts);
            continuation = data.next; 
            status.innerText = continuation ? "SCROLL FOR MORE" : "END OF VIEW";
        } else if (isNew) {
            status.innerText = "NO NFTS FOUND";
        }
    } catch (e) {
        status.innerText = "CONNECTION FAILED";
    } finally {
        isFetching = false;
        loader.classList.add('hidden');
    }
}

function render(nfts) {
    nfts.forEach(nft => {
        const img = nft.image_url || nft.display_image_url;
        if (!img) return;

        const card = document.createElement('div');
        card.className = 'art-card';
        card.innerHTML = `
            <div class="img-frame">
                <img src="${img}" loading="lazy">
            </div>
            <div class="meta">
                <div class="name">${nft.name || 'UNTITLED'}</div>
                <div class="collection">${nft.collection || 'SHAPE ART'}</div>
            </div>
        `;
        gallery.appendChild(card);
    });
}

async function initiateSearch() {
    const rawValue = input.value.trim();
    if (!rawValue) return;
    currentWallet = await resolveENS(rawValue);
    if (!currentWallet) {
        status.innerText = "INVALID ADDRESS";
        return;
    }
    fetchArt(true);
}

btn.onclick = initiateSearch;
input.onkeydown = (e) => { if (e.key === 'Enter') initiateSearch(); };

window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1200) {
        if (continuation && !isFetching) fetchArt();
    }
};
