import { config } from './config.js';

// ==================== CONFIGURATION GLOBALE ====================
// localStorage.clear();

const API_BASE_URL = config.API_BASE_URL;
const API_KEY = config.API_KEY;
const USER_TOKEN = localStorage.getItem("chatToken");

let currentConversationId = null;
let activePeerUserId = null;
let localConnectedUserCache = null;

let lastMessagesCache = {};
let lastMessagesDatesCache = {};

const globalHeaders = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "Authorization": `Bearer ${USER_TOKEN}`
};

if (!USER_TOKEN) {
    console.warn("[SÉCURITÉ] Aucun token trouvé. Redirection vers la page de connexion.");
    window.location.href = "auth/signIn.html";
}

// ==================== FONCTIONS UTILITAIRES ====================

async function apiRequest(endpoint, method = "GET", body = null) {
    try {
        const configReq = { method, headers: globalHeaders };
        if (body) configReq.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, configReq);

        if (response.status === 401) {
            console.error("[SÉCURITÉ] Token invalide ou expiré (401). Nettoyage et redirection...");
            localStorage.clear();
            window.location.href = "auth/signIn.html";
            return { success: false, status: 401, message: "Session expirée." };
        }

        if (response.status === 429) {
            console.warn(`[RATE LIMIT] Trop de requêtes sur l'endpoint ${endpoint}.`);
            return { success: false, status: 429, message: "Trop de requêtes." };
        }

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
 * Affiche un loader dans le conteneur des messages pendant le chargement
 */
function showMessagesLoader() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center gap-3 m-auto">
            <span class="loading loading-spinner loading-md text-primary"></span>
            <span class="text-xs text-base-content/50 font-medium">Chargement des messages...</span>
        </div>
    `;
}

/**
 * Affiche un loader dans la liste des utilisateurs à gauche
 */
function showUsersLoader() {
    const userProfileContainer = document.getElementById('userProfile-container');
    if (!userProfileContainer) return;

    userProfileContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 gap-2">
            <span class="loading loading-spinner loading-sm text-primary"></span>
            <span class="text-[11px] text-base-content/40">Synchronisation des contacts...</span>
        </div>
    `;
}

function setupUserFilter() {
    const searchInput = document.getElementById('search-input');
    const container = document.getElementById('userProfile-container');
    const emptyMessage = document.getElementById('search-empty-message');

    if (!searchInput || !container) return;

    // On crée ou récupère un élément pour le message d'erreur
    // let emptyMessage = document.getElementById('search-empty-message');
    if (!emptyMessage) {
        emptyMessage = document.createElement('div');
        emptyMessage.id = 'search-empty-message';
        emptyMessage.className = 'text-center text-xs text-base-content/40 p-4 hidden';
        emptyMessage.textContent = 'Aucun utilisateur trouvé';
        container.parentNode.appendChild(emptyMessage); // Ajouté sous le conteneur
    }

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const userCards = document.querySelectorAll('#userProfile-container > div');
        let hasResults = false;

        userCards.forEach(card => {
            const nameSpan = card.querySelector('.font-semibold.text-sm');
            if (nameSpan) {
                const userName = nameSpan.textContent.toLowerCase();
                // card.style.display = userName.includes(searchTerm) ? 'flex' : 'none';
                const matches = userName.includes(searchTerm);
                card.style.display = matches ? 'flex' : 'none';
                if (matches) hasResults = true;
            }
        });

        // Affiche ou masque le message "user not found"
        if (!hasResults && searchTerm !== "") {
            emptyMessage.classList.remove('hidden');
        } else {
            emptyMessage.classList.add('hidden');
        }
    });
}

/**
 * OPTIMISÉE : Remplit le cache intelligemment sans saturer le réseau
 */
async function fetchConversationsAndCacheMessages() {
    const result = await apiRequest("/conversations");
    const conversations = result.data?.conversations || result.data || [];
    const myId = localStorage.getItem("chat_user_id");

    lastMessagesCache = {};
    lastMessagesDatesCache = {};

    // On parcourt les conversations reçues de l'API
    conversations.forEach(conv => {
        // Option A: Si l'API fournit les participants directement
        let peer = conv.participants?.find(p => p.id !== myId);

        // Option B: Si pas de participants structurés, on extrait le nom depuis le titre du Chat (ex: "Chat avec testeur2")
        let peerName = null;
        if (!peer && conv.name && conv.name.includes("Chat avec ")) {
            peerName = conv.name.replace("Chat avec ", "").trim();
        }

        if (conv.lastMessage) {
            // Si l'API nous donne directement le dernier message dans la conversation
            const peerId = peer?.id || conv.lastMessage.senderId;
            if (peerId && peerId !== myId) {
                lastMessagesCache[peerId] = conv.lastMessage.content;
                lastMessagesDatesCache[peerId] = conv.lastMessage.createdAt || conv.lastMessage.updatedAt;
            }
        }
    });
}

function getInitials(fullName) {
    if (!fullName) return "?";
    const words = fullName.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

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

function formatLastMessageDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();

    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return "Hier";
    } else {
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
}

// ==================== FONCTIONALITES A VENIR ====================

// alert('Cette fonctionnalité est à venir !');
// toast("Cette fonctionnalité est à venir !", "info");

// function setupFutureFeatures() {
//     const futureFeatureButtons = document.querySelectorAll('.upcoming-feature');
//     futureFeatureButtons.forEach(btn => {
//         btn.addEventListener('click', (e) => {
//             e.preventDefault();

//             console.log("button clicked");
//             showToast("Cette fonctionnalité est à venir !", "info");

//         });
//     });
// }

// tippy('.upcoming-feature', {
//     content: '<span class="text-xs font-semibold px-2 py-1 bg-neutral text-neutral-content rounded-lg shadow-md">Bientôt disponible !</span>',
//     allowHTML: true,
//     trigger: 'click',
//     placement: 'top',
//     onShow(instance) {
//         setTimeout(() => instance.hide(), 2000);
//     }
// });

function setupFutureFeatures() {
    if (typeof tippy !== 'undefined') {
        const upcomingFeatureButtons = document.querySelectorAll('.upcoming-feature');

        if (upcomingFeatureButtons.length === 0) {
            console.warn("Aucun élément avec la classe .upcoming-feature trouvé.");
            return;
        }

        tippy(upcomingFeatureButtons, {
            content: '<span class="alert alert-info text-xs font-semibold py-1 px-3 shadow-md rounded-lg inline-block">Bientôt disponible !</span>',
            allowHTML: true,
            trigger: 'click',
            placement: 'top',
            animation: 'fade',
            duration: [200, 150],
            onShow(instance) {
                setTimeout(() => {
                    instance.hide();
                }, 2000);
            }
        });
    } else {
        console.warn("Tippy.js n'est pas disponible.");
    }
}

// ==================== LOGIQUE NAVIGATION & RESPONSIVE ====================

function switchView(viewName) {
    const asideBar = document.querySelector('aside');
    const sidebarContainer = document.querySelector('section');
    const chatView = document.getElementById('chat-view');
    const profileView = document.getElementById('profile-view');
    const chatFooter = document.getElementById('chat-footer');

    const settingsBtn = document.getElementById('settings-btn');
    const chatTabBtn = document.querySelector('aside button:nth-child(2)');

    if (settingsBtn) settingsBtn.classList.remove('text-primary', 'bg-primary/10', 'rounded-xl');
    if (chatTabBtn) chatTabBtn.classList.remove('text-primary', 'bg-primary/10', 'rounded-xl');

    const isMobile = window.innerWidth < 768;

    if (viewName === 'profile') {
        if (chatView) {
            chatView.classList.add('hidden');
            chatView.classList.remove('flex', 'md:flex');
        }
        if (profileView) profileView.classList.remove('hidden');

        if (isMobile) {
            if (sidebarContainer) sidebarContainer.classList.add('hidden');
            if (asideBar) asideBar.classList.remove('hidden');
        } else {
            if (sidebarContainer) sidebarContainer.classList.remove('hidden');
            if (asideBar) asideBar.classList.remove('hidden');
        }

        if (settingsBtn) settingsBtn.classList.add('text-primary', 'bg-primary/10', 'rounded-xl');
        populateProfileForm();
    }
    else if (viewName === 'chat') {
        if (profileView) profileView.classList.add('hidden');

        if (currentConversationId) {
            if (isMobile) {
                if (sidebarContainer) sidebarContainer.classList.add('hidden');
                if (asideBar) asideBar.classList.add('hidden');
            } else {
                if (sidebarContainer) sidebarContainer.classList.remove('hidden');
                if (asideBar) asideBar.classList.remove('hidden');
            }

            if (chatView) {
                chatView.classList.remove('hidden');
                chatView.classList.add('flex');
            }
            if (chatFooter) chatFooter.classList.remove('hidden');
        }
        if (chatTabBtn) chatTabBtn.classList.add('text-primary', 'bg-primary/10', 'rounded-xl');
    }
    else if (viewName === 'list') {
        if (profileView) profileView.classList.add('hidden');
        if (chatView) {
            chatView.classList.add('hidden');
            chatView.classList.remove('flex', 'md:flex');
        }
        if (sidebarContainer) sidebarContainer.classList.remove('hidden');
        if (asideBar) asideBar.classList.remove('hidden');
        if (chatTabBtn) chatTabBtn.classList.add('text-primary', 'bg-primary/10', 'rounded-xl');
    }
}

function setupResponsiveLogic() {
    const backBtn = document.getElementById('back-to-list-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => switchView('list'));
    }
}

// ==================== LOGIQUE APPLICATIVE CHAT ====================

async function fetchConnectedUser() {
    if (localConnectedUserCache) {
        displayConnectedUser(localConnectedUserCache);
        return;
    }

    const result = await apiRequest("/auth/me");
    if (result && result.success && result.data?.user) {
        const connectedUser = result.data.user;
        localConnectedUserCache = connectedUser;
        localStorage.setItem("chat_user_id", connectedUser.id);
        displayConnectedUser(connectedUser);
    }
    console.log(localConnectedUserCache);

}

async function displayConnectedUser(connectedUser) {
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

async function fetchUsers() {
    const result = await apiRequest("/users");
    const userProfileContainer = document.getElementById('userProfile-container');
    if (!userProfileContainer) return;

    const users = result.data?.users || result.data || [];

    console.log(users)

    // Si c'est le premier chargement (vide), on enlève le loader
    userProfileContainer.innerHTML = '';

    users.forEach(user => {
        if (user.id === localStorage.getItem("chat_user_id")) return;

        const userProfileCard = document.createElement('div');
        userProfileCard.className = "flex items-center gap-3 p-3 rounded-xl hover:bg-base-200/50 cursor-pointer transition-colors";

        if (user.id === activePeerUserId) {
            userProfileCard.classList.add('bg-base-200/70', 'border', 'border-base-content/10');
        }

        userProfileCard.addEventListener('click', (e) => {
            handleUserClick(user.id, user.fullName, user.avatarUrl, userProfileCard);
        });

        const avatarContent = user.avatarUrl
            ? `<div class="w-11 rounded-full"><img src="${user.avatarUrl}" alt="${user.fullName}" /></div>`
            : `<div class="bg-primary/10 text-primary rounded-full w-11 h-11 flex items-center justify-center font-semibold text-sm">${getInitials(user.fullName)}</div>`;

        const lastMessage = lastMessagesCache[user.id] || "Cliquez pour commencer à discuter";
        const messageDate = lastMessagesDatesCache[user.id] ? formatLastMessageDate(lastMessagesDatesCache[user.id]) : "";

        userProfileCard.innerHTML = `
            <div class="${user.avatarUrl ? 'avatar' : ''}">
                ${avatarContent}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                    <span class="font-semibold text-sm text-base-content">${user.fullName}</span>
                    <span class="text-[10px] text-base-content/40 font-medium">${messageDate}</span>
                </div>
                <p class="text-xs text-base-content/50 truncate">${lastMessage}</p>
            </div>
        `;
        userProfileContainer.appendChild(userProfileCard);
    });
}

async function handleUserClick(peerUserId, peerName, peerAvatarUrl, clickedCard) {
    document.querySelectorAll('#userProfile-container > div').forEach(el => {
        el.classList.remove('bg-base-200/70', 'border', 'border-base-content/10');
    });
    if (clickedCard) {
        clickedCard.classList.add('bg-base-200/70', 'border', 'border-base-content/10');
    }

    activePeerUserId = peerUserId;

    // On affiche immédiatement le loader dans la zone de chat pendant l'appel API
    showMessagesLoader();
    switchView('chat');

    const result = await apiRequest("/conversations", "POST", {
        type: "private",
        name: `Chat avec ${peerName}`,
        participantIds: [peerUserId]
    });

    const conversationId = result.data?.conversation?.id;

    if (conversationId) {
        currentConversationId = conversationId;

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

        // Récupération des messages réels
        await fetchMessages();
    } else {
        alert("Impossible d'ouvrir la discussion.");
    }
}

function formatMessageTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function fetchMessages() {
    if (!currentConversationId) return;

    const result = await apiRequest(`/conversations/${currentConversationId}/messages`);
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    const messages = result.data?.messages || result.data || [];
    console.log(messages);


    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8 m-auto text-base-content/40 text-sm italic">
                Envoyez un message pour commencer à discuter
            </div>
        `;
        if (activePeerUserId) {
            delete lastMessagesCache[activePeerUserId];
            delete lastMessagesDatesCache[activePeerUserId];
            fetchUsers();
        }
        return;
    }

    messagesContainer.innerHTML = '';


    messages.forEach(msg => {
        const msgId = msg.id || msg._id;
        console.log(msgId);

        const isMe = msg.senderId === localStorage.getItem("chat_user_id");
        const formattedTime = formatMessageTime(msg.createdAt || msg.updatedAt);

        // Messages avec un menu d'action rapide DaisyUI (Dropdown)
        // <div id="bubble-${msg.id}" class="chat-bubble bg-primary text-primary-content text-sm rounded-2xl px-4 py-2.5 shadow-sm relative">
        const messageTemplate = isMe ? `
            <div class="flex flex-col items-end gap-2 max-w-[85%] ml-auto group relative">
                <div class="chat chat-end w-full">
                    <div id="bubble-${msgId}" class="chat-bubble bg-primary text-primary-content text-sm rounded-2xl px-4 py-2.5 shadow-sm relative">
                        ${msg.content}
                        
                        <!-- Options du message (DaisyUI Dropdown) -->
                        <div class="dropdown dropdown-left dropdown-end absolute top-1/2 -translate-y-1/2 -left-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <label tabindex="0" class="btn btn-ghost btn-xs btn-circle text-base-content/50">
                                <span class="text-lg">⋮</span>
                            </label>
                            <ul tabindex="0" class="dropdown-content menu p-1 shadow-lg bg-base-100 rounded-box w-28 text-xs text-base-content z-50">
                                <li><a class="edit-msg-btn text-info" data-id="${msgId}" data-content="${msg.content}">Modifier</a></li>
                                <li><a class="delete-msg-btn text-error" data-id="${msgId}">Supprimer</a></li>
                            </ul>
                        </div>

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

    // Écouteurs d'événements dynamiques pour Modifier/Supprimer après injection du HTML
    document.querySelectorAll('.edit-msg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const content = e.target.getAttribute('data-content');
            executeEditMessage(id, content);
        });
    });

    document.querySelectorAll('.delete-msg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            executeDeleteMessage(id);
        });
    });

    if (activePeerUserId && messages.length > 0) {
        const lastMsgObj = messages[messages.length - 1];
        lastMessagesCache[activePeerUserId] = lastMsgObj.content;
        lastMessagesDatesCache[activePeerUserId] = lastMsgObj.createdAt || lastMsgObj.updatedAt;
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

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

    if (result && result.success) {
        inputElement.value = '';

        if (activePeerUserId) {
            lastMessagesCache[activePeerUserId] = text;
            lastMessagesDatesCache[activePeerUserId] = new Date().toISOString();
            fetchUsers();
        }

        fetchMessages();
    } else {
        alert("Erreur lors de l'envoi : " + (result.message || "Inconnu"));
    }
}


// ==================== FONCTIONNALITÉ : MODIFIER UN MESSAGE ====================
async function executeEditMessage(messageId, currentContent) {
    // 1. On cherche la bulle du message dans le DOM pour la transformer en formulaire
    const msgBubble = document.getElementById(`bubble-${messageId}`);
    console.error(`[ERREUR EDIT] Aucun élément trouvé dans le DOM avec l'ID "bubble-${messageId}"`);
    if (!msgBubble) return;

    // Sauvegarde du HTML d'origine au cas où l'utilisateur annule
    const originalHTML = msgBubble.innerHTML;

    // On injecte un input et des petits boutons DaisyUI à la place du texte
    msgBubble.innerHTML = `
        <div class="flex flex-col gap-2 min-w-[200px]">
            <input type="text" id="edit-input-${messageId}" class="input input-bordered input-sm text-base-content w-full" value="${currentContent.replace(/"/g, '&quot;')}">
            <div class="flex justify-end gap-1">
                <button class="btn btn-ghost btn-xs text-white cancel-edit-btn">Annuler</button>
                <button class="btn btn-success btn-xs text-white save-edit-btn">Enregistrer</button>
            </div>
        </div>
    `;

    // Gestion de l'annulation
    msgBubble.querySelector('.cancel-edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        msgBubble.innerHTML = originalHTML;
        // On relie les écouteurs du dropdown qui ont sauté lors du reset HTML
        fetchMessages();
    });

    // Gestion de la sauvegarde
    msgBubble.querySelector('.save-edit-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const inputVal = document.getElementById(`edit-input-${messageId}`).value.trim();

        if (!inputVal) {
            showToast("Le message ne peut pas être vide.", "error");
            return;
        }

        console.log(`[ACTION] Modification du message ${messageId} -> ${inputVal}`);
        const result = await apiRequest(`/messages/${messageId}`, "PATCH", { content: inputVal });
        console.log("[API RESPONSE] Modification message :", result);

        if (result && result.success) {
            showToast("Message modifié avec succès !");
            await fetchMessages();
            await fetchConversationsAndCacheMessages();
            fetchUsers();
        } else {
            showToast(result.message || "Impossible de modifier.", "error");
        }
    });
}

// ==================== FONCTIONNALITÉ : SUPPRIMER UN MESSAGE ====================
// async function executeDeleteMessage(messageId) {
//     if (!confirm("Voulez-vous vraiment supprimer ce message ?")) return;

//     console.log(`[ACTION] Tentative de suppression du message ID: ${messageId}`);

//     const result = await apiRequest(`/messages/${messageId}`, "DELETE");

//     console.log("[API RESPONSE] Suppression message :", result);

//     if (result && result.success) {
//         showToast("Message supprimé.");
//         await fetchMessages(); // Rafraîchit l'affichage
//         await fetchConversationsAndCacheMessages(); // Met à jour le cache
//         fetchUsers(); // Actualise la liste de gauche
//     } else {
//         alert("Impossible de supprimer le message : " + (result.message || "Erreur inconnue"));
//     }
// }

async function executeDeleteMessage(messageId) {
    console.log(`[ACTION] Suppression du message ID: ${messageId}`);

    const result = await apiRequest(`/messages/${messageId}`, "DELETE");
    console.log("[API RESPONSE] Suppression message :", result);

    if (result && result.success) {
        showToast("Message supprimé avec succès.");
        await fetchMessages();
        await fetchConversationsAndCacheMessages();
        fetchUsers();
    } else {
        showToast(result.message || "Erreur de suppression.", "error");
    }
}

// ==================== GESTION DU PROFIL & CLOUDINARY ====================

const CLOUDINARY_URL = config.CLOUDINARY_URL;
const CLOUDINARY_PRESET = config.CLOUDINARY_PRESET;

// function showToast(message, type = "success") {
//     const container = document.getElementById('toast-container');
//     if (!container) return;

//     const toast = document.createElement('div');
//     toast.className = `alert ${type === 'success' ? 'alert-success text-white' : 'alert-error text-white'} shadow-lg rounded-xl text-xs py-2 px-4 transition-all duration-300`;
//     toast.innerHTML = `<span>${message}</span>`;

//     container.appendChild(toast);
//     setTimeout(() => { toast.remove(); }, 3000);
// }

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Association des types avec les classes DaisyUI
    const alertClasses = {
        success: 'alert-success text-white',
        error: 'alert-error text-white',
        info: 'alert-info text-white',
        warning: 'alert-warning text-white'
    };

    const toast = document.createElement('div');
    const badgeClass = alertClasses[type] || alertClasses.success;

    toast.className = `alert ${badgeClass} shadow-lg rounded-xl text-xs py-2 px-4 transition-all duration-300`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function populateProfileForm() {
    if (!localConnectedUserCache) return;

    const profileAvatar = document.getElementById('profile-avatar');
    const displayName = document.getElementById('profile-display-name');
    const displayEmail = document.getElementById('profile-display-email');
    const usernameInput = document.getElementById('username-input');
    const profileDisplayDate = document.getElementById('profile-display-date');

    if (profileAvatar) {
        profileAvatar.src = localConnectedUserCache.avatarUrl || "https://www.image2url.com/r2/default/images/1783930708557-65ccc78d-7a35-48f7-a316-405f58041f34.jpg";
    }

    // Affichage propre du nom et du champ input
    if (displayName) displayName.textContent = localConnectedUserCache.fullName || "Utilisateur";
    if (usernameInput) usernameInput.value = localConnectedUserCache.fullName || "";

    if (displayEmail) displayEmail.textContent = localConnectedUserCache.email || "non-communique@kadea.co";

    const createdAtDate = localConnectedUserCache.createdAt ? new Date(localConnectedUserCache.createdAt) : null;
    const options = { year: 'numeric', month: 'long' };
    const formattedDate = createdAtDate ? createdAtDate.toLocaleDateString('fr-FR', options) : "";

    if (profileDisplayDate) {
        profileDisplayDate.innerHTML = `<i data-lucide="shield-check" class="w-3 h-3 mr-1"></i> Membre depuis ${formattedDate || "Octobre 2023"}`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        if (!response.ok) throw new Error("Échec Cloudinary");

        const data = await response.json();
        console.log("-------------------Cloudinary-----------------");

        console.log(data, "URL de l'image :", data.secure_url);

        return data.secure_url;
    } catch (error) {
        console.error("[CLOUDINARY] Erreur :", error);
        showToast("Impossible d'envoyer l'image.", "error");
        return null;
    }
}

async function saveProfileData(fieldsToUpdate) {
    const btnText = document.getElementById('save-btn-text');
    const btnSpinner = document.getElementById('save-btn-spinner');

    if (btnText && btnSpinner) {
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
    }

    const result = await apiRequest("/users/me", "PATCH", fieldsToUpdate);

    if (btnText && btnSpinner) {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }

    if (result && (result.success || result.id || result._id || result.email)) {
        showToast("Profil mis à jour avec succès !");
        localConnectedUserCache = null;
        await fetchConnectedUser();
    } else {
        showToast(result?.message || "Erreur lors de la sauvegarde.", "error");
    }
}

function togglePasswordForm() {
    const container = document.getElementById('password-form-container');
    if (!container) return;

    if (!container.classList.contains('hidden')) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    if (!localConnectedUserCache || !localConnectedUserCache.email) {
        showToast("Impossible de récupérer l'email de l'utilisateur connecté.", "error");
        return;
    }

    container.innerHTML = `
        <form id="pwd-form" class="p-4 border border-base-content/10 bg-base-200/30 rounded-2xl flex flex-col gap-3 mt-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-base-content/60">Sécuriser le compte</h4>
            
            <div class="form-control w-full">
                <label class="label py-1"><span class="label-text text-xs">Mot de passe actuel</span></label>
                <input type="password" id="old-password-input" class="input input-bordered input-sm w-full" placeholder="••••••••" required>
            </div>

            <div class="form-control w-full">
                <label class="label py-1"><span class="label-text text-xs">Nouveau mot de passe</span></label>
                <input type="password" id="new-password-input" class="input input-bordered input-sm w-full" placeholder="••••••••" required>
            </div>

            <div class="form-control w-full">
                <label class="label py-1"><span class="label-text text-xs">Confirmer le nouveau mot de passe</span></label>
                <input type="password" id="confirm-password-input" class="input input-bordered input-sm w-full" placeholder="••••••••" required>
            </div>

            <button type="submit" id="submit-new-pwd-btn" class="btn btn-primary btn-sm text-white mt-2 w-full">
                <span id="pwd-spinner" class="loading loading-spinner loading-xs hidden"></span>
                Confirmer le changement
            </button>
        </form>
    `;
    container.classList.remove('hidden');

    const form = document.getElementById('pwd-form');

    // Clonage pour réinitialiser les listeners et éviter les soumissions multiples
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById('old-password-input').value.trim();
        const newPassword = document.getElementById('new-password-input').value.trim();
        const confirmPassword = document.getElementById('confirm-password-input').value.trim();
        const spinner = document.getElementById('pwd-spinner');
        const submitBtn = document.getElementById('submit-new-pwd-btn');

        if (!oldPassword || !newPassword || !confirmPassword) {
            showToast("Veuillez remplir tous les champs.", "error");
            return;
        }

        if (newPassword.length < 6) {
            showToast("Le nouveau mot de passe doit contenir au moins 6 caractères.", "error");
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast("La confirmation ne correspond pas au nouveau mot de passe.", "error");
            return;
        }

        if (oldPassword === newPassword) {
            showToast("Le nouveau mot de passe doit être différent de l'actuel.", "error");
            return;
        }

        if (spinner) spinner.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const userEmail = localConnectedUserCache.email;

            const authCheck = await apiRequest("/auth/login", "POST", {
                email: userEmail,
                password: oldPassword
            });

            if (!authCheck || authCheck.success === false || authCheck.status >= 400) {
                showToast("L'ancien mot de passe est incorrect.", "error");
                return;
            }

            const updateResult = await apiRequest("/users/me", "PATCH", { password: newPassword });

            if (updateResult && (updateResult.success || updateResult.id)) {
                showToast("Mot de passe mis à jour ! Redirection...", "success");

                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = "auth/signIn.html";
                }, 2000);
            } else {
                showToast(updateResult.message || "Erreur lors de la mise à jour.", "error");
            }

        } catch (err) {
            console.error(err);
            showToast("Une erreur est survenue.", "error");
        } finally {
            if (spinner) spinner.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

function setupProfileLogic() {
    const settingsBtn = document.getElementById('settings-btn');
    const connectedContainer = document.getElementById('connectedUser-container');
    const saveProfileBtn = document.getElementById('profile-save-btn');
    const avatarFileInput = document.getElementById('avatar-file-input');
    const chatTabBtn = document.querySelector('aside button:nth-child(2)');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (settingsBtn) settingsBtn.addEventListener('click', () => switchView('profile'));
    if (chatTabBtn) chatTabBtn.addEventListener('click', () => switchView('chat'));

    if (connectedContainer) {
        connectedContainer.addEventListener('click', () => switchView('profile'));
    }

    // if (avatarFileInput) {
    //     avatarFileInput.addEventListener('change', async (e) => {
    //         const file = e.target.files[0];
    //         if (!file) return;

    //         const remoteUrl = await uploadImageToCloudinary(file);
    //         if (remoteUrl) {
    //             await saveProfileData({
    //                 avatarUrl: remoteUrl,
    //                 fullName: localConnectedUserCache?.fullName || undefined
    //             });
    //         }
    //     });
    // }

    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 1. Notification du début de chargement
            showToast("Chargement de la photo en cours...", "info");

            // 2. Upload vers Cloudinary
            const remoteUrl = await uploadImageToCloudinary(file);

            if (remoteUrl) {
                // 3. Mise à jour immédiate de la balise <img> dans l'interface
                const profileAvatar = document.getElementById('profile-avatar');
                if (profileAvatar) {
                    profileAvatar.src = remoteUrl;
                }

                // 4. Sauvegarde en BDD
                await saveProfileData({
                    avatarUrl: remoteUrl,
                    fullName: localConnectedUserCache?.fullName || undefined
                });
            }
        });
    }

    // if (saveProfileBtn) {
    //     saveProfileBtn.addEventListener('click', async () => {
    //         const username = document.getElementById('username-input').value.trim();
    //         if (!username) {
    //             showToast("Le nom d'utilisateur ne peut pas être vide.", "error");
    //             return;
    //         }
    //         await saveProfileData({ fullName: username });
    //     });
    // }

    // if (saveProfileBtn) {
    //     saveProfileBtn.addEventListener('click', async () => {
    //         const username = document.getElementById('username-input').value.trim();

    //         if (!username) {
    //             showToast("Le nom d'utilisateur ne peut pas être vide.", "error");
    //             return;
    //         }

    //         // On nettoie au cas où l'utilisateur aurait écrit _chat plusieurs fois à la main
    //         const cleanUsername = username.replace(/(_chat)+$/g, '');
    //         const finalUsername = `${cleanUsername}_chat`;

    //         await saveProfileData({ fullName: finalUsername });
    //     });
    // }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const username = document.getElementById('username-input').value.trim();

            if (!username) {
                showToast("Le nom d'utilisateur ne peut pas être vide.", "error");
                return;
            }

            await saveProfileData({ fullName: username });
        });
    }

    // Gestion Lightbox Avatar
    const avatarContainer = document.querySelector('.group.cursor-pointer');
    const imageLightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.getElementById('close-lightbox-btn');
    const profileAvatar = document.getElementById('profile-avatar');

    if (avatarContainer && imageLightbox && lightboxImg && profileAvatar) {
        avatarContainer.addEventListener('click', () => {
            lightboxImg.src = profileAvatar.src;
            imageLightbox.classList.remove('hidden');
            setTimeout(() => {
                imageLightbox.classList.remove('opacity-0');
                lightboxImg.classList.remove('scale-95');
            }, 10);
        });
    }

    const closeLightbox = () => {
        if (!imageLightbox || !lightboxImg) return;
        imageLightbox.classList.add('opacity-0');
        lightboxImg.classList.add('scale-95');
        setTimeout(() => imageLightbox.classList.add('hidden'), 300);
    };

    if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
    if (imageLightbox) {
        imageLightbox.addEventListener('click', (e) => {
            if (e.target === imageLightbox) closeLightbox();
        });
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', togglePasswordForm);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = "auth/signIn.html";
        });
    }
}

// async function saveProfileData(fieldsToUpdate) {
//     const btnText = document.getElementById('save-btn-text');
//     const btnSpinner = document.getElementById('save-btn-spinner');

//     if (btnText && btnSpinner) {
//         btnText.classList.add('hidden');
//         btnSpinner.classList.remove('hidden');
//     }

//     console.log("[PATCH /users/me] Payload envoyé :", fieldsToUpdate);
//     const result = await apiRequest("/users/me", "PATCH", fieldsToUpdate);
//     console.log("[PATCH /users/me] Réponse serveur :", result);

//     if (btnText && btnSpinner) {
//         btnText.classList.remove('hidden');
//         btnSpinner.classList.add('hidden');
//     }

//     // Accepte success: true OU le retour direct de l'objet user
//     if (result && (result.success || result.id || result._id || result.email)) {
//         showToast("Profil mis à jour avec succès !");
//         localConnectedUserCache = null;
//         await fetchConnectedUser();
//     } else {
//         showToast(result?.message || "Erreur lors de la sauvegarde.", "error");
//     }
// }


// async function saveProfileData(fieldsToUpdate) {
//     const btnText = document.getElementById('save-btn-text');
//     const btnSpinner = document.getElementById('save-btn-spinner');

//     if (btnText && btnSpinner) {
//         btnText.classList.add('hidden');
//         btnSpinner.classList.remove('hidden');
//     }

//     const result = await apiRequest("/users/me", "PATCH", fieldsToUpdate);

//     if (btnText && btnSpinner) {
//         btnText.classList.remove('hidden');
//         btnSpinner.classList.add('hidden');
//     }

//     if (result && result.success) {
//         showToast("Profil mis à jour avec succès !");
//         localConnectedUserCache = null;
//         await fetchConnectedUser();
//     } else {
//         showToast("Erreur lors de la sauvegarde.", "error");
//     }
// }



// ==================== INITIALISATION AUTOMATIQUE ====================


document.addEventListener("DOMContentLoaded", async () => {
    setupUserFilter();
    setupResponsiveLogic();
    setupProfileLogic();
    setupMessageSending();

    setupFutureFeatures()

    // 1. Affichage immédiat d'un loader dans la liste de gauche pour l'UX
    showUsersLoader();

    // 2. On récupère l'utilisateur connecté
    await fetchConnectedUser();

    // 3. On affiche d'abord TOUS les utilisateurs (sans latence)
    await fetchUsers();

    // 4. On charge le cache des messages en arrière-plan sans bloquer l'affichage
    fetchConversationsAndCacheMessages().then(() => {
        // Dès que le cache est prêt, on rafraîchit la liste avec les derniers messages
        fetchUsers();
    });

    // Polling toutes les 4 secondes pour rafraîchir la discussion active
    // setInterval(() => {
    //     if (currentConversationId) fetchMessages();
    // }, 4000);
});