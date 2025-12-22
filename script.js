lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');
const dynamicControls = document.getElementById('dynamicControls'), backToTopBtn = document.getElementById('backToTop');

let allNfts = [], continuation = null, currentWallet = "", isFetching = false, lastScrollY = 0;
let touchStartX = 0, touchStartY = 0;

document.getElementById('themeToggle').onclick = () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
    lucide.createIcons();
};

document.getElementById('shuffleBtn').onclick = () => { if (allNfts.length > 0) renderAll(); gallery.scrollTo({ top: 0, behavior: 'smooth' }); };

gallery.addEventListener('touchstart', e => { 
    touchStartX = e.changedTouches[0].screenX; 
    touchStartY = e.changedTouches[0].screenY; 
}, {passive: true});

gallery.addEventListener('touchend', e => {
    const xDiff = e.changedTouches[0].screenX - touchStartX;
    if (document.documentElement.getAttribute('data-view') === 'grid' && xDiff > 100 && Math.abs(e.changedTouches[0].screenY - touchStartY) < 50) switchView('snap');
}, {passive: true});

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 100) hideUI();
    else if (cur < lastScrollY) showUI();
    
    if (cur > 500) backToTopBtn.classList.remove('hidden');
    else backToTopBtn.classList.add('hidden');

    lastScrollY = cur;
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 1000 && continuation && !isFetching) fetchArt();
};

function hideUI() { header.classList.add('ui-hidden'); bottomNav.classList.add('ui-hidden'); }
function showUI() { header.classList.remove('ui-hidden'); bottomNav.classList.remove('ui-hidden'); }

backToTopBtn.onclick = () => gallery.scrollTo({ top: 0, behavior: 'smooth' });

async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    isFetching = true;
    if (isNew) { allNfts = []; continuation = null; gallery.innerHTML = ""; }
    try {
        const res = await fetch(`/api/view?wallet=${currentWallet}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        if (data.nfts) { 
            allNfts = [...allNfts, ...data.nfts]; 
            continuation = data.next; 
            dynamicControls.classList.remove('hidden'); 
            bottomNav.classList.remove('hidden'); 
            renderAll(); 
        }
    } catch (e) {} finally { isFetching = false; }
}

function renderAll() {
    gallery.innerHTML = "";
    const mode = document.documentElement.getAttribute('data-view');
    
    if (mode === 'snap') {
        const groups = {};
        allNfts.forEach((n, i) => { const s = n.collection || `unique-${i}`; if (!groups[s]) groups[s] = []; groups[s].push(n); });
        Object.keys(groups).sort(() => Math.random() - 0.5).forEach(k => {
            const items = groups[k], card = document.createElement('div'), slider = document.createElement('div');
            card.className = 'art-card'; slider.className = 'collection-slider';
            
            // Hides UI on horizontal swipe
            slider.addEventListener('scroll', () => { hideUI(); checkEndSwipe(slider); }, {passive: true});
            
            items.forEach((n, idx) => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.innerHTML = `<div class="collection-counter">${idx + 1}/${items.length}</div><button class="quick-share" onclick="event.stopPropagation(); share('${n.opensea_url}')"><i data-lucide="share-2"></i></button><img src="${n.image_url || n.display_image_url}" loading="lazy">`;
                s.onclick = () => showDetails(n.contract, n.identifier); slider.appendChild(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
        });
    } else {
        const sort = sortSelect.value;
        let list = [...allNfts];
        if (sort === 'project') {
            list.sort((a,b) => (a.collection||"").localeCompare(b.collection||""));
            let last = ""; list.forEach(n => {
                if (n.collection !== last) { appendHeader(n.collection || "UNCATEGORIZED"); last = n.collection; }
                gallery.appendChild(createGridCard(n));
            });
        } else if (sort === 'artist') {
            list.sort((a,b) => (a.creator||"").localeCompare(b.creator||""));
            let lastA = ""; list.forEach(n => {
                const artistName = n.creator || "UNKNOWN ARTIST";
                if (artistName !== lastA) { appendHeader(artistName); lastA = artistName; }
                gallery.appendChild(createGridCard(n));
            });
        } else if (sort === 'name') {
            list.sort((a,b) => (a.name||"#").localeCompare(b.name||"#"));
            let lastL = ""; list.forEach(n => {
                const char = (n.name||"#").charAt(0).toUpperCase();
                if (char !== lastL) { appendHeader(isNaN(char) ? char : "#"); lastL = char; }
                gallery.appendChild(createGridCard(n));
            });
        } else { list.forEach(n => gallery.appendChild(createGridCard(n))); }
    }
    lucide.createIcons();
}

function appendHeader(text) {
    const h = document.createElement('div'); h.className = 'grid-header'; h.innerText = text;
    h.onclick = () => {
        h.classList.toggle('collapsed');
        let next = h.nextElementSibling;
        while (next && !next.classList.contains('grid-header')) {
            next.classList.toggle('collapsed-group');
            next = next.nextElementSibling;
        }
    };
    gallery.appendChild(h);
}

function createGridCard(n) {
    const c = document.createElement('div'); c.className = 'art-card';
    c.innerHTML = `<img src="${n.image_url || n.display_image_url}" loading="lazy">`;
    c.onclick = () => showDetails(n.contract, n.identifier); return c;
}

function checkEndSwipe(el) {
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
        el.addEventListener('touchend', (e) => { if (touchStartX - e.changedTouches[0].screenX > 80) switchView('grid'); }, { once: true });
    }
}

async function showDetails(c, id) {
    modal.classList.remove('hidden'); const m = document.getElementById('modalData');
    m.innerHTML = `<p style="text-align:center; padding: 40px;">LOADING...</p>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        document.getElementById('modalShareBtn').onclick = () => share(n.opensea_url);
        m.innerHTML = `<h2 style="font-weight:900;">${n.name || 'UNTITLED'}</h2><p style="opacity:0.5; font-size:10px; letter-spacing:1px;">${(n.collection||'').toUpperCase()}</p><p style="margin-top:15px; line-height:1.6;">${n.description || ''}</p><a href="${n.opensea_url}" target="_blank" style="display:block; padding:20px; background:var(--text); color:var(--bg); text-align:center; border-radius:14px; font-weight:900; margin-top:30px; text-decoration:none;">VIEW ON OPENSEA</a>`;
    } catch (e) { m.innerHTML = "Error."; }
    lucide.createIcons();
}

window.share = (u) => { if (navigator.share) navigator.share({ url: u }); else { navigator.clipboard.writeText(u); const t = document.getElementById('toast'); t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 2000); } };
document.getElementById('goBtn').onclick = () => fetchArt(true);
input.onkeydown = (e) => { if (e.key === 'Enter') fetchArt(true); };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.querySelector('.modal-overlay').onclick = () => modal.classList.add('hidden');

function switchView(mode) {
    gallery.classList.remove('view-slide-in'); void gallery.offsetWidth; gallery.classList.add('view-slide-in');
    document.documentElement.setAttribute('data-view', mode);
    document.getElementById('navHome').classList.toggle('active', mode === 'snap');
    document.getElementById('navGrid').classList.toggle('active', mode === 'grid');
    showUI(); backToTopBtn.classList.add('hidden'); gallery.scrollTo(0,0); renderAll();
}
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');
sortSelect.onchange = () => renderAll();
