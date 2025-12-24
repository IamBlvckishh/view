lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect'), backToTop = document.getElementById('backToTop');

let allNfts = [], displayList = [], continuation = null, currentWallet = "", isFetching = false, lastScrollY = 0;

window.onload = () => {
    const saved = sessionStorage.getItem('tempWallet');
    if (saved) { input.value = saved; fetchArt(true); sessionStorage.removeItem('tempWallet'); }
};

const setUIHidden = (hidden) => {
    header.classList.toggle('ui-hidden', hidden);
    bottomNav.classList.toggle('ui-hidden', hidden);
};

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    const mode = document.documentElement.getAttribute('data-view');
    if (cur > lastScrollY && cur > 100) setUIHidden(true);
    else if (cur < lastScrollY) setUIHidden(false);
    lastScrollY = cur;
    backToTop.classList.toggle('show', mode === 'grid' && cur > 500);
    if (cur + gallery.clientHeight >= gallery.scrollHeight - 1000 && continuation && !isFetching) fetchArt();
};

function updateCounter(slider) {
    setUIHidden(true);
    const index = Math.round(slider.scrollLeft / slider.offsetWidth);
    const counter = slider.parentElement.querySelector('.collection-counter');
    if (counter) counter.innerText = `${index + 1} / ${slider.children.length}`;
}

async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    sessionStorage.setItem('tempWallet', currentWallet);
    isFetching = true;
    if (isNew) { allNfts = []; displayList = []; gallery.innerHTML = ""; }
    try {
        const res = await fetch(`/api/view?wallet=${currentWallet}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        if (data.nfts) {
            allNfts = [...allNfts, ...data.nfts];
            if (isNew) displayList = [...allNfts].sort(() => Math.random() - 0.5);
            else displayList = [...displayList, ...data.nfts];
            continuation = data.next;
            document.getElementById('dynamicControls').classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll();
            let t = document.getElementById('toast'); t.style.opacity = '1'; setTimeout(() => t.style.opacity = '0', 2000);
        }
    } catch (e) {} finally { isFetching = false; }
}

function renderAll(filter = "") {
    gallery.innerHTML = "";
    const mode = document.documentElement.getAttribute('data-view'), sort = sortSelect.value;
    let list = [...displayList].filter(n => (n.collection || "").toLowerCase().includes(filter.toLowerCase()));

    if (mode === 'snap') {
        const groups = {};
        list.forEach((n, i) => { const k = n.collection || i; if (!groups[k]) groups[k] = []; groups[k].push(n); });
        Object.keys(groups).forEach(k => {
            const items = groups[k], card = document.createElement('div'), slider = document.createElement('div');
            card.className = 'art-card'; slider.className = 'collection-slider';
            slider.addEventListener('scroll', () => updateCounter(slider));
            items.forEach((n, idx) => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.innerHTML = `<div class="collection-counter">${idx + 1} / ${items.length}</div><img src="${n.image_url || n.display_image_url}">`;
                s.onclick = () => showDetails(n.contract, n.identifier, false);
                slider.appendChild(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
        });
    } else {
        if (sort === 'project') list.sort((a,b) => (a.collection||"").localeCompare(b.collection||""));
        else if (sort === 'name') list.sort((a,b) => (a.name||"").localeCompare(b.name||""));
        let lastG = "";
        list.forEach(n => {
            const curG = sort === 'project' ? n.collection : sort === 'name' ? (n.name||"#")[0].toUpperCase() : "";
            if (sort !== 'none' && curG !== lastG) {
                const h = document.createElement('div'); h.className = 'grid-header'; h.innerText = curG || "UNKNOWN";
                gallery.appendChild(h); lastG = curG;
            }
            const c = document.createElement('div'); c.className = 'art-card';
            c.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
            c.onclick = () => showDetails(n.contract, n.identifier, true);
            gallery.appendChild(c);
        });
    }
    lucide.createIcons();
}

sortSelect.onchange = () => {
    let sc = document.getElementById('searchContainer');
    if (!sc) {
        sc = document.createElement('div'); sc.id = "searchContainer"; sc.className = "search-container hidden";
        sc.innerHTML = `<input type="text" id="projectSearch" placeholder="SEARCH PROJECTS...">`;
        document.getElementById('dynamicControls').appendChild(sc);
        document.getElementById('projectSearch').oninput = (e) => renderAll(e.target.value);
    }
    sc.classList.toggle('hidden', sortSelect.value !== 'project');
    renderAll();
};

async function showDetails(c, id, isTwoStep) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        m.innerHTML = `<div class="modal-body"><div class="modal-img-container"><img src="${n.image_url || n.display_image_url}" id="modalMainImg"></div><div class="modal-text-content"><h2>${n.name || 'UNTITLED'}</h2><p>${n.collection || ''}</p><p>${n.description || ''}</p><a href="${n.opensea_url}" target="_blank" class="os-btn">VIEW ON OPENSEA</a></div></div>`;
        m.querySelector('.modal-img-container').onclick = () => { if(isTwoStep) document.querySelector('.modal-content').classList.toggle('show-details'); };
        if(!isTwoStep) document.querySelector('.modal-content').classList.add('show-details');
    } catch (e) {}
}

document.getElementById('themeToggle').onclick = () => {
    const doc = document.documentElement; const next = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    doc.setAttribute('data-theme', next); document.querySelector('#themeToggle i').setAttribute('data-lucide', next === 'light' ? 'moon' : 'sun'); lucide.createIcons();
};
document.getElementById('goBtn').onclick = () => fetchArt(true);
document.getElementById('shuffleBtn').onclick = () => { displayList.sort(() => Math.random() - 0.5); renderAll(); gallery.scrollTo(0,0); };
document.getElementById('backToTop').onclick = () => gallery.scrollTo({top:0, behavior:'smooth'});
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.getElementById('navHome').onclick = () => { document.documentElement.setAttribute('data-view', 'snap'); renderAll(); };
document.getElementById('navGrid').onclick = () => { document.documentElement.setAttribute('data-view', 'grid'); renderAll(); };
