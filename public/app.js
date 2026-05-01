/**
 * ATTIVANOTE - MOTORE CLOUD V16 (SECURITY GATE)
 * Include: Protezione Password per Cancellazione, Ricerca, Immagini, Cache Busting.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig, GROQ_API_KEY, ADMIN_PASSWORD } from './config.js';
// --- 1. CONFIGURAZIONE FIREBASE ---
 

// --- 2. INIZIALIZZAZIONE SISTEMA ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let monographs = [];

// --- COLLEZIONE AUREA TEMATICA ---
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200";
const CATEGORY_IMAGES = {
    "Storia": "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=1200",
    "Letteratura": "https://images.unsplash.com/photo-1507842217153-e145610bc286?auto=format&fit=crop&q=80&w=1200",
    "Filosofia": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1200",
    "Musica": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=1200",
    "Teatro": "https://images.unsplash.com/photo-1507676184212-d03391599611?auto=format&fit=crop&q=80&w=1200",
    "Arte": "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&q=80&w=1200",
    "Gastronomia": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200",
    "Botanica": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200",
    "Tecnologia": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
    "Digitale": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200",
    "Fisica": "https://images.unsplash.com/photo-1635070041043-a3b9616384d3?auto=format&fit=crop&q=80&w=1200",
    "Astronomia": DEFAULT_IMAGE
};

// --- 3. INTELLIGENZA ARTIFICIALE (MOTORE GROQ) ---
async function generateRealContent(query) {
    console.log("Richiesta inviata a Groq (Llama 3.3) per:", query); 

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const prompt = `
        Sei un professore universitario esperto. Argomento: "${query}".
        RISPOSTA OBBLIGATORIA IN FORMATO JSON PURO.
        Struttura richiesta:
        {
            "title": "Titolo accademico ed evocativo",
            "category": "Scegli UNA categoria (Capitalizzata): Storia, Letteratura, Filosofia, Musica, Teatro, Arte, Gastronomia, Botanica, Tecnologia, Digitale, Fisica, Astronomia. Altrimenti 'Altro'.",
            "abstract": "Un abstract denso e colto di 3 righe.",
            "content": "Il saggio completo in HTML (senza backticks). Usa <h3> e <p>.",
            "sources": ["Autore - Titolo Libro 1", "Autore - Titolo Libro 2"]
        }
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Errore Groq: ${errData.error?.message || response.status}`);
        }

        const data = await response.json();
        let text = data.choices[0].message.content.trim(); 
        return JSON.parse(text);

    } catch (error) {
        console.error("Errore Generazione:", error);
        alert("Errore AI: " + error.message);
        throw error;
    }
}

// --- 4. GESTIONE DATI ---
async function init() {
    console.log("AttivaNote System: Avvio in corso...");
    await loadDataFromCloud();
    renderSidebar();
    renderLibrary();
}

async function loadDataFromCloud() {
    try {
        const q = query(collection(db, "monographs"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        monographs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Errore Cloud:", error);
    }
}

// --- FUNZIONE CANCELLAZIONE PROTETTA ---
window.deleteMonograph = async function(id, event) {
    event.stopPropagation(); // Ferma il click così non apre la scheda

    // 1. Chiedi la Password
    const password = prompt("⚠️ AREA RISERVATA AL DOCENTE.\nInserisci la password per cancellare questo volume:");

    // 2. Controlla la Password
    if (password !== ADMIN_PASSWORD) {
        alert("⛔ Password errata. Impossibile cancellare.");
        return; // Ferma tutto se la password è sbagliata
    }

    // 3. Se la password è giusta, procedi
    if(!confirm("Password corretta. Sei sicuro di voler eliminare definitivamente?")) return;

    try {
        await deleteDoc(doc(db, "monographs", id));
        monographs = monographs.filter(m => m.id !== id);
        renderLibrary();
        renderSidebar();
        alert("✅ Volume eliminato con successo.");
    } catch (e) { 
        alert("Errore tecnico: " + e.message); 
    }
};

window.searchVolumes = function(searchText) {
    const term = searchText.toLowerCase();
    const filtered = monographs.filter(m => 
        m.title.toLowerCase().includes(term) || 
        (m.query && m.query.toLowerCase().includes(term)) ||
        m.category.toLowerCase().includes(term)
    );
    renderLibrary(null, filtered);
};

// --- 5. INTERFACCIA UTENTE (UI) ---
window.renderSidebar = function() {
    const list = document.getElementById('category-list');
    if(!list) return;
    const cats = [...new Set(monographs.map(m => m.category))].sort();
    let html = `
        <li class="mb-4">
            <input type="text" placeholder="🔍 Cerca nell'archivio..." onkeyup="searchVolumes(this.value)"
                   class="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm transition-all">
        </li>
        <li><button onclick="renderLibrary()" class="w-full text-left px-4 py-2 rounded text-slate-300 hover:bg-slate-800 transition-colors font-bold">📚 Tutti i Volumi</button></li>
        <hr class="border-slate-700 my-2">
    `;
    html += cats.map(c => `<li><button onclick="renderLibrary('${c}')" class="w-full text-left px-4 py-2 rounded text-slate-400 hover:bg-slate-800 transition-colors">🏷️ ${c}</button></li>`).join('');
    list.innerHTML = html;
};

window.renderLibrary = function(filter = null, customList = null) {
    const grid = document.getElementById('monograph-grid');
    if (!grid) return;
    
    document.getElementById('view-archive').classList.remove('hidden');
    document.getElementById('view-detail').classList.add('hidden');
    
    let items;
    if (customList) { items = customList; } 
    else { items = filter ? monographs.filter(m => m.category === filter) : monographs; }
    
    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 italic py-10">Nessun volume trovato.</div>`;
        return;
    }

    grid.innerHTML = items.map(m => `
        <div onclick="openMonograph('${m.id}')" class="group relative bg-slate-800 h-64 rounded-xl overflow-hidden border border-slate-700 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all">
            <button onclick="deleteMonograph('${m.id}', event)" class="absolute top-2 right-2 z-20 p-2 text-slate-400 hover:text-red-500 hover:bg-slate-900/50 rounded-full transition-colors" title="Cancella (Solo Docente)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            </button>
            
            <img src="${m.imageUrl}" onerror="this.src='${DEFAULT_IMAGE}'" class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-30 transition-opacity">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
            <div class="relative h-full p-6 flex flex-col justify-end">
                <div class="text-slate-400 text-[10px] uppercase tracking-widest mb-1 truncate">${m.query || 'Ricerca'}</div>
                <div class="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">${m.category}</div>
                <h3 class="text-xl font-bold text-white leading-tight">${m.title}</h3>
            </div>
        </div>
    `).join('');
};

window.openMonograph = function(id) {
    const m = monographs.find(x => x.id === id);
    if (!m) return;
    
    document.getElementById('view-archive').classList.add('hidden');
    const d = document.getElementById('view-detail');
    d.classList.remove('hidden');
    
    const clickableSources = (m.sources || []).map(source => 
        `<a href="https://www.google.com/search?q=${encodeURIComponent(source)}" target="_blank" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors">${source}</a>`
    ).join(' &bull; ');

    d.innerHTML = `
        <div class="max-w-4xl mx-auto animate-fade-in">
            <button onclick="renderLibrary()" class="mb-6 flex items-center text-slate-400 hover:text-white transition-colors">← TORNA ALL'ARCHIVIO</button>
            <div class="w-full h-80 rounded-2xl overflow-hidden relative shadow-2xl mb-10">
                <img src="${m.imageUrl}" onerror="this.src='${DEFAULT_IMAGE}'" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                <div class="absolute bottom-0 left-0 p-8">
                    <span class="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">${m.category}</span>
                    <h1 class="text-4xl md:text-5xl font-bold text-white mt-4 font-serif text-shadow">${m.title}</h1>
                    <p class="text-slate-400 mt-2 text-sm italic">Ricerca originale: "${m.query || '...'}"</p>
                </div>
            </div>
            <div class="prose prose-invert prose-lg max-w-none text-slate-300 font-serif leading-relaxed">
                <div class="bg-slate-800/50 p-6 rounded-lg border border-slate-700 italic text-slate-400 mb-8">${m.abstract}</div>
                ${m.content}
            </div>
            <div class="mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500 font-mono">
                <strong class="text-slate-400 uppercase tracking-wider mr-2">Fonti Esterne (Clicca per verificare):</strong><br>
                <div class="mt-2 leading-relaxed">${clickableSources}</div>
            </div>
        </div>
    `;
    window.scrollTo(0,0);
};

// --- 6. GESTIONE EVENTI ---
document.addEventListener('DOMContentLoaded', function() {
    const btnSearch = document.getElementById('btn-new-search');
    const modal = document.getElementById('modal-search');
    const btnClose = document.getElementById('btn-close-modal');
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');

    if (btnSearch) btnSearch.onclick = () => { modal.classList.remove('hidden'); setTimeout(() => input.focus(), 100); };
    if (btnClose) btnClose.onclick = () => modal.classList.add('hidden');

    if (form) {
        form.onsubmit = async function(e) {
            e.preventDefault();
            const q = input.value.trim();
            if (!q) return;

            document.getElementById('search-form-container').classList.add('hidden');
            document.getElementById('loader-container').classList.remove('hidden');

            try {
                const data = await generateRealContent(q);
                let catKey = data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase() : "Altro";
                let imageUrl = CATEGORY_IMAGES[catKey] || DEFAULT_IMAGE;

                const newMono = { ...data, category: catKey, query: q, imageUrl, createdAt: Date.now() };
                
                const docRef = await addDoc(collection(db, "monographs"), newMono);
                newMono.id = docRef.id;
                monographs.unshift(newMono);
                
                renderSidebar();
                renderLibrary();
                modal.classList.add('hidden');
                openMonograph(newMono.id);

            } catch (err) { console.error(err); } 
            finally {
                document.getElementById('loader-container').classList.add('hidden');
                document.getElementById('search-form-container').classList.remove('hidden');
                input.value = '';
            }
        };
    }
    init();
});