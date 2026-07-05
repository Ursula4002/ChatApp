// ==================== CONFIGURATION GLOBALE ====================
const API_BASE_URL = "https://kadea-chat-api.onrender.com";
const API_KEY = "wksp_c7f8367d338d051ae4fbfe357909497a";
const USER_TOKEN = localStorage.getItem("chat_jwt_token");

// Identifiant de session pour la discussion active
let currentConversationId = null; 

const globalHeaders = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "Authorization": `Bearer ${USER_TOKEN}`
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Centralisation des requêtes Fetch vers l'API Kadea
 */

async function apiRequest(endpoint, method = "GET", body = null) {
    try {
        const config = { method, headers: globalHeaders };
        if (body) config.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        // CORRECTION ICI : Si le serveur renvoie un format plat, on injecte 'success' 
        // basé sur le statut HTTP de la réponse (200, 201, etc.)
        if (!data.hasOwnProperty('success')) {
            data.success = response.ok;
        }
        
        return data;
    } catch (error) {
        console.error(`Erreur API sur ${endpoint} :`, error);
        return { success: false, message: error.message };
    }
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
function createAvatarTemplate(avatarUrl, fullName) {
    if (avatarUrl) {
        return `<img class="w-full h-full rounded-full object-cover" src="${avatarUrl}" alt="Avatar" />`;
    }
    return `
        <div class="bg-primary text-primary-content rounded-full w-11 h-11 flex items-center justify-center font-bold text-xs">
            ${getInitials(fullName)}
        </div>
    `;
}

// ==================== LOGIQUE APPLICATIVE ====================

/**
 * 1. Récupère et affiche le profil de l'utilisateur connecté
 */
async function fetchConnectedUser() {
    const result = await apiRequest("/auth/me");
    const connectedUser = result.data?.user;

    if (connectedUser) {
        localStorage.setItem("chat_user_id", connectedUser.id);

        const connectedUserContainer = document.getElementById('connectedUser-container');
        if (connectedUserContainer) {
            connectedUserContainer.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="relative w-10 h-10 flex items-center justify-center">
                        ${createAvatarTemplate(connectedUser.avatarUrl, connectedUser.fullName)}
                        <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"></span>
                    </div>
                    <div>
                        <h2 class="font-semibold text-sm leading-tight">${connectedUser.fullName}</h2>
                        <span class="text-xs text-base-content/50">My Status: Active</span>
                    </div>
                </div>
            `;
        }
    }
}

/**
 * 2. Récupère et affiche la liste des utilisateurs du workspace
 */
async function fetchUsers() {
    const result = await apiRequest("/users");
    const users = result.data?.users || []; 

    const userProfileContainer = document.getElementById('userProfile-container');
    if (!userProfileContainer) return;
    
    userProfileContainer.innerHTML = ''; 

    users.forEach(user => {
        const userProfileCard = document.createElement('div');
        userProfileCard.className = "flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 cursor-pointer border border-blue-100/50 hover:bg-blue-100/50 transition-colors";
        
        userProfileCard.addEventListener('click', () => {
            handleUserClick(user.id, user.fullName, userProfileCard);
        });

        const avatarContent = user?.avatarUrl 
            ? `<img src="${user.avatarUrl}" alt="${user.fullName}" />`
            : getInitials(user.fullName);

        const avatarClass = user?.avatarUrl ? "w-11 rounded-full" : "bg-blue-100 text-blue-600 rounded-full w-11 h-11 flex items-center justify-center font-semibold text-sm";

        userProfileCard.innerHTML = `
            <div class="avatar ${!user?.avatarUrl ? 'placeholder' : ''}">
                <div class="${avatarClass}">
                    ${avatarContent}
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                    <span class="font-semibold text-sm">${user.fullName}</span>
                    <span class="text-[10px] text-primary font-medium">14:20</span>
                </div>
                <p class="text-xs text-base-content/70 truncate">Yeah, that sounds like a great plan!</p>
            </div>
            <div class="badge badge-primary badge-sm text-[10px] h-5 w-5 font-bold rounded-full p-0 flex items-center justify-center">
                2
            </div>
        `;
        userProfileContainer.appendChild(userProfileCard);
    });
}

/**
 * 3. Gère l'activation visuelle et la récupération de l'ID du salon de discussion
 */

async function handleUserClick(peerUserId, peerName, selectedCardElement) {
    document.querySelectorAll('#userProfile-container > div').forEach(el => {
        el.classList.remove('ring-2', 'ring-primary', 'bg-blue-100');
    });
    selectedCardElement.classList.add('ring-2', 'ring-primary', 'bg-blue-100');

    const result = await apiRequest("/conversations", "POST", {
        type: "private",
        name: `Chat avec ${peerName}`,
        participantIds: [peerUserId]
    });

    const conversationId = result.data?.conversation?.id || result.data?.id || result.id;

    if (conversationId) {
        currentConversationId = conversationId; 
        
        // --- MISE À JOUR DE L'EN-TÊTE DYNAMIQUE ---
        const chatHeader = document.getElementById('chat-header');
        const activeUserInfo = document.getElementById('active-user-info');
        const chatFooter = document.getElementById('chat-footer');
        
        // On récupère l'image depuis la carte sur laquelle on a cliqué
        const imgEl = selectedCardElement.querySelector('img');
        const avatarHtml = imgEl 
            ? `<img class="w-full h-full rounded-full object-cover" src="${imgEl.src}" alt="${peerName}" />`
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
            chatHeader.classList.remove('invisible'); // Rendre l'en-tête visible
            chatFooter.classList.remove('hidden');    // Afficher la zone d'envoi
        }
        
        fetchMessages(); 
    } else {
        alert("Impossible d'ouvrir la discussion.");
    }
}

/**
 * 4. Charge et formate l'historique complet des messages du salon actif
 */
// async function fetchMessages() {
//     if (!currentConversationId) return;

//     const result = await apiRequest(`/conversations/${currentConversationId}/messages`);
//     const messages = result.data || [];

//     const messagesContainer = document.getElementById('messages-container');
//     if (!messagesContainer) return;
    
//     messagesContainer.innerHTML = ''; 

//     messages.forEach(msg => {
//         const isMe = msg.senderId === localStorage.getItem("chat_user_id");

//         const messageTemplate = isMe ? `
//             <div class="chat chat-end">
//                 <div class="chat-bubble chat-bubble-primary text-white text-sm rounded-2xl max-w-md">${msg.content}</div>
//             </div>
//         ` : `
//             <div class="chat chat-start">
//                 <div class="chat-bubble bg-base-200 text-base-content text-sm rounded-2xl max-w-md">${msg.content}</div>
//             </div>
//         `;
//         messagesContainer.insertAdjacentHTML('beforeend', messageTemplate);
//     });
    
//     messagesContainer.scrollTop = messagesContainer.scrollHeight; 
// }

async function fetchMessages() {
    if (!currentConversationId) return;

    const result = await apiRequest(`/conversations/${currentConversationId}/messages`);
    // CORRECTION ICI : s'adapte si l'API renvoie directement le tableau ou un objet contenant le tableau
const messages = result.data?.messages || result.data || [];

    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = ''; 

    messages.forEach(msg => {
        const isMe = msg.senderId === localStorage.getItem("chat_user_id");

        const messageTemplate = isMe ? `
            <div class="chat chat-end">
                <div class="chat-bubble chat-bubble-primary text-white text-sm rounded-2xl max-w-md">${msg.content}</div>
            </div>
        ` : `
            <div class="chat chat-start">
                <div class="chat-bubble bg-base-200 text-base-content text-sm rounded-2xl max-w-md">${msg.content}</div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', messageTemplate);
    });
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight; 
}

/**
 * 5. Initialise les écouteurs sur les éléments d'envoi du DOM
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

/**
 * Extrait la valeur textuelle, valide le contexte et pousse le message vers l'API
 */

async function executeSendMessage() {
    const inputElement = document.getElementById('send-message-input'); 

    if (!inputElement) {
        console.error("Erreur critique : L'élément HTML 'send-message-input' est introuvable.");
        return;
    }

    const text = inputElement.value.trim();
    
    if (!text) return; 
    
    if (!currentConversationId) {
        alert("Action impossible : Sélectionnez d'abord un utilisateur dans la liste de gauche !");
        return;
    }

    const result = await apiRequest(`/conversations/${currentConversationId}/messages`, "POST", {
        content: text
    });

    if (result && result.success) {
        inputElement.value = ''; 
        fetchMessages(); 
    } else {
        alert("L'API a refusé le message : " + (result.message || "Erreur inconnue"));
    }
}

// ==================== INITIALISATION AUTOMATIQUE ====================
fetchConnectedUser();
fetchUsers();
setupMessageSending();

// Polling de mise à jour synchronisée toutes les 4 secondes
setInterval(() => {
    if (currentConversationId) fetchMessages();
}, 4000);
