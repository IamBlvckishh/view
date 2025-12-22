lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const themeBtn = document.getElementById('themeToggle');
const modal = document.getElementById('detailModal');
const modalData = document.getElementById('modalData');

let continuation = null;
let currentWallet = "";
let isFetching = false;

// THEME SWITCHER
themeBtn.onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    themeBtn.innerHTML = `<i data-lucide="${next === 'dark' ? 'sun' : 'moon'}"></i>`;
    lucide.createIcons();
};

async function fetchArt(isNew = false) {
    if (!currentWallet || isFetching) return;
    isFetching = true;

    if (isNew) { gallery.innerHTML = ""; continuation = null; gallery.scrollTop = 0; }

    try {
        let url = `/api/view?wallet=${currentWallet}`;
        if (continuation) url += `&next=${continuation}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.nfts) {
            render(data.nfts);
            continuation = data.next;
        }
    } catch (e) { console.error(e); }
    finally { isFetching = false; }
}

function render(nfts) {
    nfts.forEach(nft => {
        const img = nft.image_url || nft.display_image_url;
        if (!img) return;

        const card = document.createElement('div');
        card.className = 'art-card';
        card.innerHTML = `<div class="img-frame"><img src="${img}"></div>`;
        
        // CLICK FOR DETAILS
        card.onclick = () => showDetails(nft.contract, nft.identifier);
        gallery.appendChild(card);
    });
}

async function showDetails(contract, id) {
    modal.classList.remove('hidden');
    modalData.innerHTML = `<p>LOADING DETAILS...</p>`;

    try {
        const res = await fetch(`/api/view?address=${contract}&id=${id}`);
        const data = await res.json();
        const nft = data.nft;

        // Mock price logic (as OpenSea API prices vary by listing state)
        const ethPrice = (Math.random() * 0.5).toFixed(3); 
        const usdPrice = (ethPrice * 2500).toLocaleString();

        modalData.innerHTML = `
            <div class="collection" style="color:#888; font-size:12px; font-weight:800; letter-spacing:2px;">${nft.collection.toUpperCase()}</div>
            <h2 style="font-size:32px; font-weight:900; margin-top:10px;">${nft.name || 'UNTITLED'}</h2>
            <div class="price-box">
                <span class="eth-price">${ethPrice} ETH</span>
                <span class="usd-price">$${usdPrice}</span>
            </div>
            <p style="color:#888; line-height:1.6; margin-bottom:20px;">${nft.description || 'No description provided.'}</p>
            <a href="${nft.opensea_url}" target="_blank" class="buy-btn">VIEW ON OPENSEA</a>
        `;
    } catch (e) { modalData.innerHTML = "<p>ERROR LOADING DETAILS</p>"; }
}

document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');

btn.onclick = () => { currentWallet = input.value.trim(); fetchArt(true); };
input.onkeydown = (e) => { if (e.key === 'Enter') { currentWallet = input.value.trim(); fetchArt(true); } };

// TIKTOK INFINITE SCROLL
gallery.onscroll = () => {
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 500) {
        if (continuation && !isFetching) fetchArt();
    }
};
