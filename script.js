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

// THEME TOGGLE
themeBtn.onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeBtn.innerHTML = `<i data-lucide="${isDark ? 'moon' : 'sun'}"></i>`;
    lucide.createIcons();
};

async function fetchArt(isNew = false) {
    if (!currentWallet || isFetching) return;
    isFetching = true;

    if (isNew) { gallery.innerHTML = ""; continuation = null; gallery.scrollTop = 0; }

    try {
        let url = `/api/view?wallet=${currentWallet}`;
        if (continuation) url += `&next=${continuation}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.nfts) {
            data.nfts.forEach(nft => {
                const img = nft.image_url || nft.display_image_url;
                if (!img) return;

                const card = document.createElement('div');
                card.className = 'art-card';
                card.innerHTML = `<div class="img-frame"><img src="${img}"></div>`;
                card.onclick = () => showDetails(nft.contract, nft.identifier);
                gallery.appendChild(card);
            });
            continuation = data.next;
        }
    } catch (e) { console.error(e); }
    finally { isFetching = false; }
}

async function showDetails(contract, id) {
    modal.classList.remove('hidden');
    modalData.innerHTML = `<p>SCANNING DATA...</p>`;

    try {
        const res = await fetch(`/api/view?address=${contract}&id=${id}`);
        const data = await res.json();
        const nft = data.nft;

        const eth = (Math.random() * 0.2).toFixed(3); // Mock live price
        const usd = (eth * 2400).toLocaleString();

        const desc = nft.description || "No description provided.";
        const isLong = desc.length > 150;
        const displayDesc = isLong ? desc.substring(0, 150) + '...' : desc;

        modalData.innerHTML = `
            <span style="font-size:10px; font-weight:800; color:#888; letter-spacing:2px;">${nft.collection.toUpperCase()}</span>
            <h2 style="font-size:28px; font-weight:900; margin-bottom:15px;">${nft.name || 'UNTITLED'}</h2>
            
            <div class="price-section">
                <span class="eth-value">${eth} ETH</span>
                <span class="usd-value">$${usd} USD</span>
            </div>

            <p class="desc-text">
                <span id="textBody">${displayDesc}</span>
                ${isLong ? `<span class="see-more" onclick="expandText('${desc.replace(/'/g, "\\'").replace(/\n/g, ' ')}')">READ MORE</span>` : ''}
            </p>

            <a href="${nft.opensea_url}" target="_blank" class="buy-btn">VIEW ON OPENSEA</a>
        `;
    } catch (e) { modalData.innerHTML = "<p>ERROR LOADING</p>"; }
}

window.expandText = (fullText) => {
    document.getElementById('textBody').innerText = fullText;
    document.querySelector('.see-more').style.display = 'none';
};

document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.querySelector('.modal-overlay').onclick = () => modal.classList.add('hidden');

btn.onclick = () => { currentWallet = input.value.trim(); fetchArt(true); };
input.onkeydown = (e) => { if (e.key === 'Enter') { currentWallet = input.value.trim(); fetchArt(true); } };

// TIKTOK DOOMSCROLL TRIGGER
gallery.onscroll = () => {
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 200) {
        if (continuation && !isFetching) fetchArt();
    }
};
