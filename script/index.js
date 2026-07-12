
const API_BASE_URL = "https://kadea-chat-api.onrender.com";
const API_KEY = "wksp_c7f8367d338d051ae4fbfe357909497a";
const USER_TOKEN = localStorage.getItem("chat_jwt_token");

async function fetchConnectedUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "Authorization": `Bearer ${USER_TOKEN}`
            }
        });
        const result = await response.json();

        console.log("--- MY USERS RESULT (fetchConnected ---");
        console.log(result);

        // Display user

        const connectedUser = result.data?.user

        // console.log("Mes utilisateurs :", users);
        // console.log(users?.data.users);

        console.log("------------------------------------");
        // const initial = user && user.name ? user.name.trim().charAt(0).toUpperCase() : "?";


        const connectedUserContainer = document.getElementById('connectedUser-container');
        const connectedUserCard = document.createElement('div')


        connectedUserCard.innerHTML = `
                                    <div class="flex items-center gap-3">
                <div class="relative w-10 h-10">
                    <img class="w-full h-full rounded-full object-cover"
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                        alt="Alex Rivera" />
                    <span
                        class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"></span>
                </div>
                <div>
                    <h2 class="font-semibold text-sm leading-tight">${connectedUser.fullName}</h2>
                    <span class="text-xs text-base-content/50">My Status: Active</span>
                </div>
            </div>
            <button class="btn btn-ghost btn-sm btn-square text-base-content/70">
                <i data-lucide="square-pen" class="w-4 h-4"></i>
            </button>
            `
        connectedUserContainer.appendChild(connectedUserCard);

    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

fetchConnectedUser()

console.log("----------------------------------------------");



async function fetchUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "Authorization": `Bearer ${USER_TOKEN}`
            }
        });
        const result = await response.json();
        console.log("--- MY USERS RESULT ---");
        console.log(result);

        // Display user

        const users = result.data?.users

        console.log("Mes utilisateurs :", users);
        // console.log(users?.data.users);

        console.log("------------------------------------");

        users.map(user => {
            const userProfileContainer = document.getElementById('userProfile-container');
            const userProfileCard = document.createElement('div')

            // const initial = user && user.name ? user.name.trim().charAt(0).toUpperCase() : "?";

            userProfileCard.innerHTML = `
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 cursor-pointer border border-blue-100/50">
                <div class="avatar">
                    <div class="w-11 rounded-full">
                        <img src="${user?.avatarUrl}"
                            alt="Sarah Connor" />
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-0.5">
                        <span class="font-semibold text-sm">${user?.fullName}</span>
                        <span class="text-[10px] text-primary font-medium">14:20</span>
                    </div>
                    <p class="text-xs text-base-content/70 truncate">Yeah, that sounds like a great plan!</p>
                </div>
                <div
                    class="badge badge-primary badge-sm text-[10px] h-5 w-5 font-bold rounded-full p-0 flex items-center justify-center">
                    2</div>
            </div>
            `
            userProfileContainer.appendChild(userProfileCard);
        }
        )


    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

fetchUsers();


// /conversations

async function getConversation() {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "Authorization": `Bearer ${USER_TOKEN}`
            }
        });
        const result = await response.json();
        console.log("--- MY CONVERSATIONS RESULT ---");
        console.log(result);

        // Display user

        const users = result

    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

getConversation()

// Send message

async function sendMessage(message, time) {
    const messagesContainer = document.getElementById('messages-container');
    const sendMessageInput = document.getElementById('send-message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');

    sendMessageBtn.addEventListener('click', () => {
        const text = sendMessageInput.value.trim();

        console.log("---------------Inputfield value-------------------------");

        console.log(text);
    });
}

sendMessage()

// async function testFetchConversations() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/users`, {
//             method: "GET",
//             headers: {
//                 "Content-Type": "application/json",
//                 "x-api-key": API_KEY,
//                 "Authorization": `Bearer ${USER_TOKEN}`
//             }
//         });
//         const result = await response.json();
//         console.log("--- MY USERS RESULT ---");
//         console.log(result);
//     } catch (error) {
//         console.error("Fetch failed:", error);
//     }
// }

// testFetchConversations();


// -----------------------------------------------------------------------
// --------------------------------------------------------------------------


import { config } from './config.js';


// ==================== CONFIGURATION GLOBALE ====================

// Utilisation de l'objet externe global 'config'
const API_BASE_URL = config.API_BASE_URL;
const API_KEY = config.API_KEY;
const USER_TOKEN = localStorage.getItem("chatToken");

// Identifiant de session pour la discussion active
let currentConversationId = null;
let localConnectedUserCache = null;

const globalHeaders = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "Authorization": `Bearer ${USER_TOKEN}`
};

// ==========================================
// POUVOIR DE SÉCURITÉ : VÉRIFICATION DU TOKEN
// ==========================================

if (!USER_TOKEN) {
    console.warn("[SÉCURITÉ] Aucun token trouvé. Redirection vers la page de connexion.");
    window.location.href = "/auth/signIn.html";
}

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Centralisation des requêtes Fetch vers l'API Kadea
 */
async function apiRequest(endpoint, method = "GET", body = null) {
    try {
        const configReq = { method, headers: globalHeaders };
        if (body) configReq.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, configReq);
        const data = await response.json();

        if (!data.hasOwnProperty('success')) {
            data.success = response.ok;
        }

        return data;
    } catch (error) {
        console.error(`[ERREUR API] Sur l'endpoint ${endpoint} :`, error);
        return { success: false, message: error.message };
    }
}

/**
 * Filtre dynamique de la liste des conversations en local
 */
function setupUserFilter() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const userCards = document.querySelectorAll('#userProfile-container > div');

        userCards.forEach(card => {
            const nameSpan = card.querySelector('.font-semibold.text-sm');
            if (nameSpan) {
                const userName = nameSpan.textContent.toLowerCase();
                card.style.display = userName.includes(searchTerm) ? 'flex' : 'none';
            }
        });
    });
}

/**
 * Extrait un maximum de deux initiales d'un nom complet
 */
function getInitials(fullName) {
    if (!fullName) return "?";
    const words = fullName.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Génère la structure HTML d'un avatar (Image ou bloc initiales)
 */
function createAvatarTemplate(avatarUrl, fullName, sizeClass = "w-11 h-11") {
    if (avatarUrl) {
        return `<img class="w-full h-full rounded-full object-cover" src="${avatarUrl}" alt="Avatar" />`;
    }
    return `
        <div class="bg-primary text-primary-content rounded-full ${sizeClass} flex items-center justify-center font-bold text-sm">
            ${getInitials(fullName)}
        </div>
    `;
}

// ==================== LOGIQUE NAVIGATION & RESPONSIVE ====================

/**
 * Gère le basculement d'affichage des panneaux et des vues (Responsive & Thème)
 */
function switchView(viewName) {
    console.log(`[NAVIGATION] Basculement vers l'affichage : ${viewName}`);
    
    const sidebarContainer = document.querySelector('section'); // Liste des conversations
    const chatView = document.getElementById('chat-view');
    const profileView = document.getElementById('profile-view');
    
    const settingsBtn = document.getElementById('settings-btn');
    const chatTabBtn = document.querySelector('aside button:nth-child(2)');

    // Nettoyage des états actifs des boutons de la barre latérale
    if (settingsBtn) settingsBtn.classList.remove('text-primary', 'bg-primary/10', 'rounded-xl');
    if (chatTabBtn) chatTabBtn.classList.remove('text-primary', 'bg-primary/10', 'rounded-xl');

    if (viewName === 'profile') {
        // Masquer le chat et la liste des contacts, afficher le profil
        if (chatView) chatView.classList.add('hidden');
        if (sidebarContainer) sidebarContainer.classList.add('hidden', 'md:flex');
        if (profileView) profileView.classList.remove('hidden');
        
        if (settingsBtn) settingsBtn.classList.add('text-primary', 'bg-primary/10', 'rounded-xl');
        populateProfileForm();
    } else if (viewName === 'chat') {
        // Mode discussion
        if (profileView) profileView.classList.add('hidden');
        
        // Sur mobile : si une conversation est active, on affiche le chat, sinon la liste
        if (currentConversationId) {
            if (sidebarContainer) sidebarContainer.classList.add('hidden');
            if (chatView) {
                chatView.classList.remove('hidden');
                chatView.classList.add('flex');
            }
        } else {
            if (sidebarContainer) sidebarContainer.classList.remove('hidden');
            if (chatView) {
                chatView.classList.add('hidden');
                chatView.classList.remove('flex');
            }
        }
        
        if (chatTabBtn) chatTabBtn.classList.add('text-primary', 'bg-primary/10', 'rounded-xl');
    } else if (viewName === 'list') {
        // Spécifique Mobile : Retourner à la liste des contacts
        if (profileView) profileView.classList.add('hidden');
        if (chatView) {
            chatView.classList.add('hidden');
            chatView.classList.remove('flex');
        }
        if (sidebarContainer) sidebarContainer.classList.remove('hidden');
        if (chatTabBtn) chatTabBtn.classList.add('text-primary', 'bg-primary/10', 'rounded-xl');
    }
}

/**
 * Configure les écouteurs pour la navigation mobile et le changement de thème
 */
function setupResponsiveAndThemeLogic() {
    // Bouton de retour sur le header du chat (Mobile)
    const backBtn = document.getElementById('back-to-list-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => switchView('list'));
    }

    // Gestion manuelle des thèmes (DaisyUI / Tailwind)
    const htmlEl = document.documentElement;
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');

    if (lightBtn) {
        lightBtn.addEventListener('click', () => {
            htmlEl.setAttribute('data-theme', 'light');
            console.log("[THÈME] Passage au mode Clair");
        });
    }

    if (darkBtn) {
        darkBtn.addEventListener('click', () => {
            htmlEl.setAttribute('data-theme', 'dark');
            console.log("[THÈME] Passage au mode Sombre");
        });
    }
}

// ==================== LOGIQUE APPLICATIVE CHAT ====================

/**
 * 1. Récupère et affiche le profil de l'utilisateur connecté
 */
async function fetchConnectedUser() {
    const result = await apiRequest("/auth/me");
    console.log("Données Utilisateur Connecté (/auth/me) :", result);

    if (result && result.success && result.data?.user) {
        const connectedUser = result.data.user;
        localConnectedUserCache = connectedUser;
        localStorage.setItem("chat_user_id", connectedUser.id);

        const connectedUserContainer = document.getElementById('connectedUser-container');
        if (connectedUserContainer) {
            connectedUserContainer.innerHTML = `
                <div class="flex items-center gap-3 cursor-pointer">
                    <div class="relative w-10 h-10 flex items-center justify-center">
                        ${createAvatarTemplate(connectedUser.avatarUrl, connectedUser.fullName, "w-10 h-10")}
                        <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"></span>
                    </div>
                    <div>
                        <h2 class="font-semibold text-sm leading-tight">${connectedUser.fullName}</h2>
                        <span class="text-xs text-base-content/50">My Status: Active</span>
                    </div>
                </div>
                <button class="btn btn-ghost btn-sm btn-square text-base-content/70">
                    <i data-lucide="square-pen" class="w-4 h-4"></i>
                </button> 
            `;

            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
        
        if (!document.getElementById('profile-view').classList.contains('hidden')) {
            populateProfileForm();
        }
    }
}

/**
 * 2. Récupère et affiche la liste des utilisateurs du workspace
 */
async function fetchUsers() {
    const result = await apiRequest("/users");
    console.log("Liste des Utilisateurs (/users) :", result);

    const userProfileContainer = document.getElementById('userProfile-container');
    if (!userProfileContainer) return;

    userProfileContainer.innerHTML = '';
    const users = result.data?.users || result.data || [];

    users.forEach(user => {
        // Ne pas s'afficher soi-même dans la liste des contacts
        if (user.id === localStorage.getItem("chat_user_id")) return;

        const userProfileCard = document.createElement('div');
        userProfileCard.className = "flex items-center gap-3 p-3 rounded-xl hover:bg-base-200/50 cursor-pointer transition-colors";

        userProfileCard.addEventListener('click', (e) => {
            handleUserClick(user.id, user.fullName, user.avatarUrl, userProfileCard);
        });

        const avatarClass = user.avatarUrl ? "w-11 rounded-full" : "avatar placeholder";
        const avatarContent = user.avatarUrl 
            ? `<div class="w-11 rounded-full"><img src="${user.avatarUrl}" alt="${user.fullName}" /></div>`
            : `<div class="bg-primary/10 text-primary rounded-full w-11 h-11 flex items-center justify-center font-semibold text-sm">${getInitials(user.fullName)}</div>`;

        userProfileCard.innerHTML = `
            <div class="${user.avatarUrl ? 'avatar' : ''}">
                ${avatarContent}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                    <span class="font-semibold text-sm text-base-content">${user.fullName}</span>
                    <span class="text-[10px] text-base-content/40">Statut</span>
                </div>
                <p class="text-xs text-base-content/50 truncate">Cliquez pour commencer à discuter</p>
            </div>
        `;
        userProfileContainer.appendChild(userProfileCard);
    });
}

/**
 * 3. Gère l'activation visuelle et la récupération de l'ID du salon de discussion
 */
async function handleUserClick(peerUserId, peerName, peerAvatarUrl, clickedCard) {
    // Gestion visuelle de la sélection active
    document.querySelectorAll('#userProfile-container > div').forEach(el => {
        el.classList.remove('bg-base-200/70', 'border', 'border-base-content/10');
    });
    if (clickedCard) {
        clickedCard.classList.add('bg-base-200/70', 'border', 'border-base-content/10');
    }

    // Création ou récupération de la conversation
    const result = await apiRequest("/conversations", "POST", {
        type: "private",
        name: `Chat avec ${peerName}`,
        participantIds: [peerUserId]
    });
    console.log("Création/Récupération Conversation (/conversations) :", result);

    const conversationId = result.data?.conversation?.id || result.data?.id || result.id;

    if (conversationId) {
        currentConversationId = conversationId;

        // Force l'affichage de l'écran de discussion (surtout pour le Mobile)
        switchView('chat');

        const chatHeader = document.getElementById('chat-header');
        const activeUserInfo = document.getElementById('active-user-info');
        const chatFooter = document.getElementById('chat-footer');
        const welcomeMessage = document.getElementById('welcome-message');

        const avatarHtml = peerAvatarUrl
            ? `<img class="w-full h-full rounded-full object-cover" src="${peerAvatarUrl}" alt="${peerName}" />`
            : `<div class="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center font-bold text-xs">${getInitials(peerName)}</div>`;

        if (activeUserInfo && chatHeader && chatFooter) {
            activeUserInfo.innerHTML = `
                <div class="relative w-10 h-10">
                    ${avatarHtml}
                    <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"></span>
                </div>
                <div>
                    <h3 class="font-semibold text-sm leading-tight">${peerName}</h3>
                    <span class="text-[11px] text-success font-medium flex items-center gap-1">Online</span>
                </div>
            `;
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
            chatHeader.classList.remove('invisible');
            chatFooter.classList.remove('hidden');
        }

        fetchMessages();
    } else {
        alert("Impossible d'ouvrir la discussion.");
    }
}

/**
 * Formatage de l'heure des messages
 */
function formatMessageTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * 4. Récupère le flux des messages depuis le serveur
 */
async function fetchMessages() {
    if (!currentConversationId) return;

    const result = await apiRequest(`/conversations/${currentConversationId}/messages`);
    
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    const messages = result.data?.messages || result.data || [];

    // On efface uniquement si de nouveaux messages sont arrivés pour éviter les sauts visuels
    messagesContainer.innerHTML = '';

    messages.forEach(msg => {
        const isMe = msg.senderId === localStorage.getItem("chat_user_id");
        const formattedTime = formatMessageTime(msg.createdAt || msg.updatedAt);

        const messageTemplate = isMe ? `
            <div class="flex flex-col items-end gap-2 max-w-[85%] ml-auto">
                <div class="chat chat-end w-full">
                    <div class="chat-bubble bg-primary text-primary-content text-sm rounded-2xl px-4 py-2.5 shadow-sm">
                        ${msg.content}
                    </div>
                    <div class="chat-footer opacity-40 text-[10px] mt-1 pr-1 w-full text-right">${formattedTime}</div>
                </div>
            </div>
        ` : `
            <div class="chat chat-start max-w-[85%]">
                <div class="chat-bubble bg-base-200/60 text-base-content text-sm rounded-2xl px-4 py-2.5 border border-base-200/40 shadow-none">
                    ${msg.content}
                </div>
                <div class="chat-footer opacity-40 text-[10px] mt-1 pl-1">${formattedTime}</div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', messageTemplate);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * 5. Gestion de la zone de saisie et de l'envoi
 */
function setupMessageSending() {
    const sendMessageBtn = document.getElementById('send-message-btn');
    const sendMessageInput = document.getElementById('send-message-input');

    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await executeSendMessage();
        });
    }

    if (sendMessageInput) {
        sendMessageInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await executeSendMessage();
            }
        });
    }
}

async function executeSendMessage() {
    const inputElement = document.getElementById('send-message-input');
    if (!inputElement) return;

    const text = inputElement.value.trim();
    if (!text) return;

    if (!currentConversationId) {
        alert("Action impossible : Sélectionnez d'abord une conversation.");
        return;
    }

    const result = await apiRequest(`/conversations/${currentConversationId}/messages`, "POST", {
        content: text
    });
    console.log("Statut Envoi Message :", result);

    if (result && result.success) {
        inputElement.value = '';
        fetchMessages();
    } else {
        alert("Erreur lors de l'envoi : " + (result.message || "Inconnu"));
    }
}

// ==================== GESTION DU PROFIL & CLOUDINARY ====================

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/obd42wdt/image/upload";
const CLOUDINARY_PRESET = "ih4yfg4m";

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `alert ${type === 'success' ? 'alert-success text-white' : 'alert-error text-white'} shadow-lg rounded-xl text-xs py-2 px-4 transition-all duration-300`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

/**
 * Remplit la page profil avec les bonnes cibles HTML réelles
 */
function populateProfileForm() {
    if (!localConnectedUserCache) return;

    const profileAvatar = document.getElementById('profile-avatar');
    const displayName = document.getElementById('profile-display-name');
    const displayEmail = document.getElementById('profile-display-email');
    const usernameInput = document.getElementById('username-input');

    if (profileAvatar) {
        profileAvatar.src = localConnectedUserCache.avatarUrl || "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp";
    }

    if (displayName) displayName.textContent = localConnectedUserCache.fullName || "Utilisateur";
    if (displayEmail) displayEmail.textContent = localConnectedUserCache.email || "non-communique@kadea.co";
    
    // Le seul champ modifiable identifié dans ton HTML est le username
    if (usernameInput) {
        usernameInput.value = localConnectedUserCache.username || "";
        usernameInput.removeAttribute('disabled');
        usernameInput.classList.remove('bg-base-200', 'cursor-not-allowed', 'text-base-content/40');
    }
}

async function uploadImageToCloudinary(file) {
    console.log("[CLOUDINARY] Début du téléversement du fichier :", file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        if (!response.ok) throw new Error("Échec Cloudinary");

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("[CLOUDINARY] Erreur :", error);
        showToast("Impossible d'envoyer l'image.", "error");
        return null;
    }
}

function setupProfileLogic() {
    const settingsBtn = document.getElementById('settings-btn');
    const connectedContainer = document.getElementById('connectedUser-container');
    const saveProfileBtn = document.getElementById('profile-save-btn');
    const avatarFileInput = document.getElementById('avatar-file-input');
    const chatTabBtn = document.querySelector('aside button:nth-child(2)');

    if (settingsBtn) settingsBtn.addEventListener('click', () => switchView('profile'));
    if (chatTabBtn) chatTabBtn.addEventListener('click', () => switchView('chat'));

    if (connectedContainer) {
        connectedContainer.addEventListener('click', () => switchView('profile'));
    }

    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const remoteUrl = await uploadImageToCloudinary(file);
            if (remoteUrl) {
                await saveProfileData({ avatarUrl: remoteUrl });
            }
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const username = document.getElementById('username-input').value.trim();
            if (!username) {
                showToast("Le nom d'utilisateur ne peut pas être vide.", "error");
                return;
            }
            await saveProfileData({ username });
        });
    }

    // Gestion propre et sécurisée de la Déconnexion sur événement clic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log("[AUTH] Tentative de déconnexion...");
            const response = await apiRequest("/auth/logout", "POST");
            console.log("[AUTH] Réponse déconnexion :", response);
            
            localStorage.clear();
            window.location.href = "/auth/signIn.html";
        });
    }
}

async function saveProfileData(fieldsToUpdate) {
    console.log("[API PATCH] Envoi des modifications :", fieldsToUpdate);
    const btnText = document.getElementById('save-btn-text');
    const btnSpinner = document.getElementById('save-btn-spinner');

    if (btnText && btnSpinner) {
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
    }

    const result = await apiRequest("/users/me", "PATCH", fieldsToUpdate);
    console.log("Statut Mise à jour Profil (/users/me) :", result);

    if (btnText && btnSpinner) {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }

    if (result && result.success) {
        showToast("Profil與mis à jour avec succès !");
        await fetchConnectedUser();
    } else {
        showToast("Erreur lors de la sauvegarde.", "error");
    }
}

// ==================== INITIALISATION AUTOMATIQUE ====================

document.addEventListener("DOMContentLoaded", () => {
    setupUserFilter();
    setupResponsiveAndThemeLogic();
    setupProfileLogic();
    setupMessageSending();

    // Lancement des chargements initiaux
    fetchConnectedUser();
    fetchUsers();

    // Polling de mise à jour synchronisée toutes les 4 secondes
    setInterval(() => {
        if (currentConversationId) fetchMessages();
    }, 4000);
});
