let currentPage = 1;
let itemsPerPage = 10;
let allResults = [];

// --- Export CSV ---
document.getElementById('exportBtn').addEventListener('click', function () {
    if (allResults.length === 0) {
        alert("Aucun résultat à exporter !");
        return;
    }

    const csvContent = "\uFEFF" + [
        "Nom;Adresse;Téléphone;Site Web;Menu;Plus Code;Horaires;Note;Scrapé à;Status",
        ...allResults.map(r => {
            return [
                `"${(r.name || 'N/A').replace(/"/g, '""')}"`,
                `"${(r.address || 'N/A').replace(/"/g, '""')}"`,
                `"${(r.phone || 'N/A').replace(/"/g, '""')}"`,
                `"${(r.website || 'N/A').replace(/"/g, '""')}"`,
                `"${(r.menu || 'N/A').replace(/"/g, '""')}"`,
                `"${(r.plus_code || 'N/A').replace(/"/g, '""')}"`,
                `"${(r.horaires || 'N/A').replace(/"/g, '""')}"`,
                `"${(r.note || 'N/A').replace(/"/g, '""')}"`,
                `"${(formatFRDate(r.scraped_at) || 'N/A').replace(/"/g, '""')}"`,
                `"${r.already_scrapped ? 'Deja scrappé' : 'Nouveau'}"`
            ].join(';');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'resultats_scraping.csv');
    link.click();
});



// --- Autocomplete Code NAF ---
const input = document.getElementById('codeNafSecteur');
const listContainer = document.getElementById('autocomplete-list');

input.addEventListener('input', async function () {
    listContainer.innerHTML = '';
    if (!this.value) return;

    const response = await fetch('naf-activity.json');
    const data = await response.json();

    data.forEach(item => {
        const displayText = `${item.id} - ${item.label}`;
        const inputValue = input.value.trim().toLowerCase();

        if (displayText.toLowerCase().includes(inputValue)) {
            const itemDiv = document.createElement("DIV");
            const regex = new RegExp(`(${inputValue})`, 'gi');
            itemDiv.innerHTML = displayText.replace(regex, '<span class="autocomplete-match">$1</span>');

            itemDiv.classList.add('autocomplete-item');
            itemDiv.addEventListener("click", function () {
                input.value = item.label;
                listContainer.innerHTML = '';
            });
            listContainer.appendChild(itemDiv);
        }
    });
});

document.addEventListener("click", function (e) {
    if (e.target !== input) listContainer.innerHTML = '';
});

// --- Sélection Source ---
document.querySelectorAll('.source-card').forEach(card => {
    card.addEventListener('click', function () {
        document.querySelectorAll('.source-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        const radio = this.querySelector('input[type="radio"]');
        radio.checked = true;
    });
});
document.querySelector('.source-card').classList.add('active');

// --- Variables globales TomSelect ---
let regionSelect, departementSelect, regionTS, departementTS;
const villeInput = document.getElementById('ville');
const villeList = document.getElementById('ville-autocomplete');

// --- Gestion exclusive Région / Département / Ville ---
function exclusif(changed) {
    if (changed === 'region' && regionSelect.getValue()) {
        departementTS.disable();
        villeInput.disabled = true;
    } else if (changed === 'departement' && departementSelect.getValue()) {
        regionTS.disable();
        villeInput.disabled = true;
    } else if (changed === 'ville' && villeInput.value) {
        regionTS.disable();
        departementTS.disable();
    } else {
        regionTS.enable();
        departementTS.enable();
        villeInput.disabled = false;
    }
}

// --- Reset ---
document.getElementById('resetBtn').addEventListener('click', function () {
    document.getElementById('scrapingForm').reset();
    regionTS.clear();
    regionTS.enable();
    departementTS.clear();
    departementTS.enable();
    villeInput.value = "";
    villeInput.disabled = false;
    document.getElementById('resultsContainer').innerHTML = '';
    document.getElementById('resultsSection').classList.add('d-none');
});

// Ajoutez ces nouvelles fonctions :
function displayPage(page) {
    currentPage = page;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = allResults.slice(startIndex, endIndex);

    let html = `<table class="table table-hover align-middle"><thead>
        <tr class="bg-light">
            <th>Nom</th><th>Adresse</th><th>Téléphone</th><th>Site Web</th>
            <th>Plus Code</th><th>Horaires</th><th>Note</th><th>Status</th><th>Scrapé à</th>
        </tr></thead><tbody>`;

    paginatedResults.forEach(r => {
        const website = r.website
            ? `<a href="${r.website.startsWith('http') ? r.website : 'https://' + r.website}" target="_blank">${r.website}</a>`
            : 'N/A';
        const phone = r.phone
            ? r.phone.split(',').map(num => `<a href="tel:${num.trim()}">${num.trim()}</a>`).join('<br>')
            : 'N/A';

        html += `<tr>
            <td>${r.name || 'N/A'}</td>
            <td>${r.address || 'N/A'}</td>
            <td>${phone}</td>
            <td>${website}</td>
            <td>${r.plus_code || 'N/A'}</td>
            <td>${r.horaires || 'N/A'}</td>
            <td>${r.note || 'N/A'}</td>
            <td>
                ${r.already_scrapped
                ? '<span class="badge bg-primary">Deja scrappé</span>'
                : '<span class="badge bg-success">Nouveau</span>'}
            </td>
            <td>${formatFRDate(r.scraped_at) || 'N/A'}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('resultsContainer').innerHTML = html;

    // Mettre à jour l'état actif de la pagination
    document.querySelectorAll('#pagination .page-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.getAttribute('data-page')) === page) {
            item.classList.add('active');
        }
    });
}

function setupPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const pageCount = Math.ceil(allResults.length / itemsPerPage);

    if (pageCount <= 1) return;

    // Bouton Précédent
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
    </a>`;
    prevLi.addEventListener('click', () => {
        if (currentPage > 1) displayPage(currentPage - 1);
    });
    pagination.appendChild(prevLi);

    // Pages
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pageCount, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link">1</a>`;
        firstLi.addEventListener('click', () => displayPage(1));
        pagination.appendChild(firstLi);

        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<a class="page-link">...</a>`;
            pagination.appendChild(ellipsisLi);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.setAttribute('data-page', i);
        pageLi.innerHTML = `<a class="page-link">${i}</a>`;
        pageLi.addEventListener('click', () => displayPage(i));
        pagination.appendChild(pageLi);
    }

    if (endPage < pageCount) {
        if (endPage < pageCount - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<a class="page-link">...</a>`;
            pagination.appendChild(ellipsisLi);
        }

        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link">${pageCount}</a>`;
        lastLi.addEventListener('click', () => displayPage(pageCount));
        pagination.appendChild(lastLi);
    }

    // Bouton Suivant
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === pageCount ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
    </a>`;
    nextLi.addEventListener('click', () => {
        if (currentPage < pageCount) displayPage(currentPage + 1);
    });
    pagination.appendChild(nextLi);
}
// --- AJAX submit ---
document.getElementById('scrapingForm').addEventListener('submit', function (e) {
    e.preventDefault();
    document.getElementById('historiqueSection').classList.add('d-none');
    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    loadingModal.show();

    const query = document.getElementById('codeNafSecteur').value || '';
    const region = regionSelect.getValue();
    const departement = departementSelect.getValue();
    const ville = villeInput.value;
    const max_results = parseInt(document.getElementById('maxResults').value || 5);

    const location = ville || departement || region;
    const source = document.querySelector('input[name="source"]:checked').value;
    const apiUrl = source === 'googlemaps' ? 'http://localhost:8000/scrape/googlemaps' : 'http://localhost:8000/scrape/pagesjaunes';

    if (!query) return alert('Le Code NAF / Secteur est requis !');
    if (!location) return alert('Veuillez sélectionner une région, un département ou une ville !');
    if (!max_results || max_results < 1) return alert('Veuillez entrer un nombre de résultats valide !');

    const startTime = new Date();
    const timerInterval = setInterval(() => {
        const elapsed = Math.floor((new Date() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('loadingTime').innerHTML =
            `<div class="badge bg-secondary">Temps écoulé: ${minutes}m ${seconds}s</div>`;
    }, 1000);

    const controller = new AbortController();
    const timeout = 120 * 60 * 1000;
    const id = setTimeout(() => controller.abort(), timeout);

    const payload = { query, location, max_results };


    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
    })
        .then(resp => resp.json())
        .then(json => {


            clearInterval(timerInterval);
            clearTimeout(id);
            loadingModal.hide();

            // Stocker tous les résultats
            allResults = json.results || [];

            // Afficher le temps écoulé
            const elapsed = Math.floor((new Date() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('elapsedTime').textContent = `Durée: ${minutes}m ${seconds}s`;

            const resultsSection = document.getElementById('resultsSection');
            resultsSection.classList.remove('d-none');

            // Afficher le nombre total de résultats
            document.getElementById('resultsCount').textContent = `${allResults.length} résultat(s)`;

            // Initialiser la pagination
            currentPage = 1;
            setupPagination();
            displayPage(currentPage);
        })
        .catch(err => {
            clearInterval(timerInterval);
            clearTimeout(id);
            loadingModal.hide();
            document.getElementById('resultsContainer').innerHTML = `
						<div class="alert alert-danger">Erreur scraping : ${err.message || err}</div>`;
        });
});

// --- Charger options Région / Département ---
async function chargerSelectOptions() {
    // Régions
    const regResp = await fetch('reg_names.json');
    const regData = await regResp.json();
    const regionSel = document.getElementById('region');
    regData.sort().forEach(region => {
        const opt = document.createElement('option');
        opt.value = region;
        opt.textContent = region;
        regionSel.appendChild(opt);
    });
    regionTS = new TomSelect('#region', { create: false, sortField: { field: "text", direction: "asc" } });
    regionSelect = regionTS;

    // Départements
    const depResp = await fetch('dep_names.json');
    const depData = await depResp.json();
    depData.sort((a, b, c) => a.departement.localeCompare(b.departement));
    const depSel = document.getElementById('departement');

    depData.forEach(dep => {
        const opt = document.createElement('option');
        opt.value = dep.departement;

        opt.text = `${dep.numero} - ${dep.departement} - ${dep.region}`;
        depSel.appendChild(opt);
    });
    departementTS = new TomSelect('#departement', {
        create: false,
        render: {
            option: (data) => {
                const [num, dep, reg] = data.text.split(' - ');
                return `<div>${num} - <strong>${dep}</strong> - ${reg}</div>`;
            },
            item: (data) => {
                const [num, dep, reg] = data.text.split(' - ');
                return `<div>${num} - <strong>${dep}</strong> - ${reg}</div>`;
            }
        },
        sortField: { field: "text", direction: "asc" }
    });
    departementSelect = departementTS;

    // Gestion exclusive avec TomSelect events
    regionTS.on("change", () => exclusif('region'));
    departementTS.on("change", () => exclusif('departement'));
    villeInput.addEventListener('input', () => exclusif('ville'));
}

document.addEventListener('DOMContentLoaded', chargerSelectOptions);

// --- Autocomplete Ville ---
let franceData = null;
async function loadFranceData() {
    if (!franceData) {
        const resp = await fetch('villes.json');
        franceData = await resp.json();
    }
}

villeInput.addEventListener('input', async function () {
    const query = this.value.trim().toLowerCase();
    villeList.innerHTML = '';
    if (query.length < 2) return;

    await loadFranceData();
    const results = franceData
        .filter(v => v.Nom_commune && v.Nom_commune.toLowerCase().includes(query))
        .slice(0, 30);
    results.forEach(ville => {
        const div = document.createElement('div');
        div.classList.add('autocomplete-item');
        div.textContent = ville.Nom_commune;
        div.addEventListener('click', () => {
            villeInput.value = ville.Nom_commune;
            villeList.innerHTML = '';
            exclusif('ville');
        });
        villeList.appendChild(div);
    });
});

document.addEventListener('click', (e) => {
    if (e.target !== villeInput) villeList.innerHTML = '';
});







// --- Historique global ---
let histoPage = 1;
const histoPerPage = 10;
let totalPages = 1;

// --- Charger l'historique depuis le serveur ---


// --- Afficher l'historique avec pagination ---
function afficherHistorique(rows) {
    const tableHtml = buildHistoryTable(rows);
    const paginationHtml = buildHistoryPagination();

    document.getElementById('historiqueTable').innerHTML = `
    <div class="card shadow-sm border-0 mb-3">
        <div class="card-header">
            <strong>Historique</strong> — Page ${histoPage} / ${totalPages}
        </div>
        <div class="card-body">
            ${tableHtml}
            <nav class="mt-3">
                <ul class="pagination justify-content-center">${paginationHtml}</ul>
            </nav>
        </div>
    </div>`;
}
// --- Générer le tableau historique ---
function buildHistoryTable(rows) {
    if (!rows || rows.length === 0) return `<div class="text-muted">Aucune donnée</div>`;

    const thead = `<thead class="table-light"><tr>
        <th>ID</th><th>Date Scraping</th><th>Query</th><th>Location</th><th>Source</th>
        <th>Nom</th><th>Adresse</th><th>Téléphone</th><th>Site Web</th><th>Plus Code</th>
        <th>Note</th><th>Horaires</th>
    </tr></thead>`;

    const tbody = `<tbody>${rows.map(r =>
        `<tr>
            <td>${r.history_id}</td>
            <td>${formatFRDate(r.scraped_at)}</td>
            <td>${escapeHtml(r.query)}</td>
            <td>${escapeHtml(r.location)}</td>
            <td>${escapeHtml(r.source)}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.address)}</td>
            <td>${escapeHtml(r.phone)}</td>
            <td>${escapeHtml(r.website)}</td>
            <td>${escapeHtml(r.plus_code)}</td>
            <td>${escapeHtml(r.note)}</td>
            <td>${escapeHtml(r.horaires)}</td>
        </tr>`).join('')}</tbody>`;

    return `<div class="table-responsive"><table class="table table-sm table-striped table-bordered mb-0">${thead}${tbody}</table></div>`;
}

// --- Pagination ---
function buildHistoryPagination() {
    if (totalPages <= 1) return '';
    let html = '';

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === histoPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="chargerHistorique(${i}); return false;">${i}</a>
                 </li>`;
    }
    return html;
}

// --- Utils ---
function escapeHtml(val) {
    return String(val ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

function formatFRDate(str) {
    if (!str) return '';
    const d = new Date(str.replace(' ', 'T'));
    if (isNaN(d)) return str;
    return d.toLocaleString('fr-FR', {
        year: 'numeric', month: 'long', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('historiqueTable')) {
        chargerHistorique();
    }
});
// ---------- Navigation ----------
document.getElementById('menuHistorique').addEventListener('click', () => {

    document.getElementById('globalform')?.classList.add('d-none');
    document.getElementById('resultsSection')?.classList.add('d-none');
    document.getElementById('historiqueSection').classList.remove('d-none');
    chargerHistorique();
});
document.getElementById('menuScraping').addEventListener('click', () => {
    document.getElementById('historiqueSection').classList.add('d-none');
    //document.getElementById('resultsSection')?.classList.remove('d-none');
    document.getElementById('globalform')?.classList.remove('d-none');

});






// --- Variables historiques ---


let histoFilters = {
    query: '',
    location: '',
    source: ''
};


let nafData = null;
let departementData = null;
let regionData = null;

async function chargerHistorique(page = 1) {
    try {
        const params = new URLSearchParams({
            page, per_page: histoPerPage,
            query: histoFilters.query,
            location: histoFilters.location,
            source: histoFilters.source,
            date_from: histoFilters.dateFrom || '',
            date_to: histoFilters.dateTo || ''
        });

        const resp = await fetch(`http://localhost:8000/historique?${params.toString()}`);
        const data = await resp.json();

        histoPage = data.page;
        totalPages = Math.ceil(data.total / data.per_page);
        afficherHistorique(data.historique);
    } catch (err) {
        console.error("Erreur chargement historique :", err);
        document.getElementById('historiqueSection').innerHTML =
            `<div class="alert alert-danger">Impossible de charger l'historique.</div>`;
    }
}

// --- Charger les datas pour autocomplete ---
async function loadHistoriqueData() {
    if (!franceData) {
        const resp = await fetch('villes.json');
        franceData = await resp.json();
    }
    if (!nafData) {
        const resp = await fetch('naf-activity.json');
        nafData = await resp.json();
    }
}
async function loadHistoriqueDataMixed() {
    if (!franceData) {
        const resp = await fetch('villes.json');
        franceData = await resp.json();
    }
    if (!departementData) {
        const resp = await fetch('dep_names.json');
        const depRaw = await resp.json();
        departementData = depRaw.map(d => d.departement);
    }
    if (!regionData) {
        const resp = await fetch('reg_names.json');
        regionData = await resp.json();
    }
}

// --- Initialiser les filtres autocomplete ---
function initFiltresHistorique() {
    const html = `
   <div class="row g-3">
                <!-- Code NAF / Query -->
                <div class="col-md-6 position-relative">
                    <label class="form-label fw-bold">Code NAF / Query</label>
                    <input type="text" id="filterQuery" class="form-control" placeholder="Saisir un code NAF ou terme de recherche">
                    <div id="filterQueryList" class="autocomplete-items position-absolute w-100 d-none"></div>
                </div>
                
                <!-- Location -->
                <div class="col-md-6 position-relative">
                    <label class="form-label fw-bold">Localisation (Ville / Département / Région)</label>
                    <input type="text" id="filterLocation" class="form-control" placeholder="Saisir une localisation">
                    <div id="filterLocationList" class="autocomplete-items position-absolute w-100 d-none"></div>
                </div>
                
                <!-- Date Scraping -->
                <div class="col-md-6">
                    <label class="form-label fw-bold">Date Scraping</label>
                    <div class="row g-2">
                        <div class="col-md-6">
                            <label class="date-label">De</label>
                            <input type="date" id="filterDateFrom" class="form-control">
                        </div>
                        <div class="col-md-6">
                            <label class="date-label">À</label>
                            <input type="date" id="filterDateTo" class="form-control">
                        </div>
                    </div>
                </div>
                
                <!-- Source -->
                <div class="col-md-6">
                    <label class="form-label fw-bold">Source</label>
                    <div style="margin-top:30px" class="d-flex flex-wrap gap-3">
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="filterSource" id="filterSourceAll" value="" checked>
                            <label class="form-check-label" for="filterSourceAll">Toutes les sources</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="filterSource" id="filterSourceGoogle" value="googlemaps">
                            <label class="form-check-label" for="filterSourceGoogle">Google Maps</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="filterSource" id="filterSourcePages" value="pagesjaunes">
                            <label class="form-check-label" for="filterSourcePages">PagesJaunes.fr</label>
                        </div>
                    </div>
                </div>
                
                <!-- Buttons -->
                <div class="col-12 mt-3">
                    <div class="d-flex gap-2 justify-content-end">
                        <button class="btn btn-primary px-4" onclick="appliquerFiltres()">Appliquer les filtres</button>
                        <button class="btn btn-outline-secondary px-4" onclick="resetFiltres()">Réinitialiser</button>
						<button class="btn btn-success" id="exportCsvBtn">Exporter CSV</button>
                    </div>
                </div>
            </div>
`;

    document.getElementById('historiqueFiltres').innerHTML = html;

    // --- Query autocomplete ---
    const filterQuery = document.getElementById('filterQuery');
    const filterQueryList = document.getElementById('filterQueryList');

    filterQuery.addEventListener('input', async () => {
        await loadHistoriqueData();
        const val = filterQuery.value.trim().toLowerCase();
        filterQueryList.innerHTML = '';
        if (!val) return;

        nafData.forEach(item => {
            const display = `${item.id} - ${item.label}`;
            if (display.toLowerCase().includes(val)) {
                const div = document.createElement('div');
                const regex = new RegExp(`(${val})`, 'gi');
                div.innerHTML = display.replace(regex, '<span class="autocomplete-match">$1</span>');
                div.classList.add('autocomplete-item');
                div.addEventListener('click', () => {
                    filterQuery.value = item.label;
                    filterQueryList.innerHTML = '';
                });
                filterQueryList.appendChild(div);
            }
        });
    });
    document.addEventListener('click', e => { if (e.target !== filterQuery) filterQueryList.innerHTML = ''; });
    document.getElementById('exportCsvBtn').addEventListener('click', async () => {
        // Récupérer les filtres actuels
        const query = document.getElementById('filterQuery').value.trim();
        const location = document.getElementById('filterLocation').value.trim();
        const source = document.querySelector('input[name="filterSource"]:checked')?.value || '';
        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;

        // Construire les paramètres URL
        const params = new URLSearchParams({
            page: 1,
            per_page: 1000, // ou un max raisonnable
            query,
            location,
            source,
            date_from: dateFrom,
            date_to: dateTo
        });

        try {
            const resp = await fetch(`http://localhost:8000/historique?${params.toString()}`);
            const data = await resp.json();
            const rows = data.historique || [];

            if (rows.length === 0) {
                alert("Aucune donnée à exporter pour ces filtres !");
                return;
            }

            // Construire CSV
            const safeString = v => (v !== null && v !== undefined ? String(v).replace(/"/g, '""') : '');

            const csvContent = "\uFEFF" + [
                "ID;Date Scraping;Query;Location;Source;Nom;Adresse;Téléphone;Site Web;Plus Code;Note;Horaires",
                ...rows.map(r => [
                    r.history_id,
                    r.scraped_at,
                    `"${safeString(r.query)}"`,
                    `"${safeString(r.location)}"`,
                    r.source,
                    `"${safeString(r.name)}"`,
                    `"${safeString(r.address)}"`,
                    `"${safeString(r.phone)}"`,
                    `"${safeString(r.website)}"`,
                    `"${safeString(r.plus_code)}"`,
                    `"${safeString(r.note)}"`,
                    `"${safeString(r.horaires)}"`
                ].join(';'))
            ].join('\n');

            // Téléchargement
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'historique_filtré.csv');
            link.click();

        } catch (err) {
            console.error("Erreur export CSV :", err);
            alert("Erreur lors de l'export CSV");
        }
    });
    // --- Location autocomplete ---
    const filterLocation = document.getElementById('filterLocation');
    const filterLocationList = document.getElementById('filterLocationList');

    filterLocation.addEventListener('input', async () => {
        await loadHistoriqueDataMixed();
        const val = filterLocation.value.trim().toLowerCase();
        filterLocationList.innerHTML = '';
        if (!val || val.length < 1) return;

        // Combiner les 3 sources
        const combined = [
            ...franceData.map(v => v.Nom_commune),
            ...departementData,
            ...regionData
        ];

        const results = combined.filter(item => item.toLowerCase().startsWith(val))
            .slice(0, 30); // limiter à 30 résultats

        results.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('autocomplete-item');
            div.textContent = item;
            div.addEventListener('click', () => {
                filterLocation.value = item;
                filterLocationList.innerHTML = '';
            });
            filterLocationList.appendChild(div);
        });
    });

    document.addEventListener('click', e => {
        if (e.target !== filterLocation) filterLocationList.innerHTML = '';
    });
}


// --- Lire les dates ---
function getFilterDates() {
    const from = document.getElementById('filterDateFrom').value;
    const to = document.getElementById('filterDateTo').value;
    return { from, to };
}
// --- Appliquer / Reset filtres ---
function appliquerFiltres() {
    histoFilters.query = document.getElementById('filterQuery').value.trim();
    histoFilters.location = document.getElementById('filterLocation').value.trim();
    histoFilters.source = document.querySelector('input[name="filterSource"]:checked')?.value || '';
    const { from, to } = getFilterDates();
    histoFilters.dateFrom = from;
    histoFilters.dateTo = to;
    chargerHistorique(1);
}
function resetFiltres() {
    document.getElementById('filterQuery').value = '';
    document.getElementById('filterLocation').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.querySelector('input[name="filterSource"][value=""]').checked = true;
    histoFilters = { query: '', location: '', source: '', dateFrom: '', dateTo: '' };
    chargerHistorique(1);
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', initFiltresHistorique);


