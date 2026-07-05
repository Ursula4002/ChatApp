// ==================== CONFIGURATION GLOBALE ====================
const API_BASE_URL = "https://kadea-chat-api.onrender.com";
const API_KEY = "wksp_c7f8367d338d051ae4fbfe357909497a";
const USER_TOKEN = localStorage.getItem("chat_jwt_token");

// L'intention de conception : explicitement vide au démarrage
let currentConversationId = null; 

const globalHeaders = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "Authorization": `Bearer ${USER_TOKEN}`
};

// ==================== FONCTIONS UTILITAIRES (FACTORISATION) ====================

/**
 * Centralisation des appels Fetch pour éviter les répétitions (Point 2)
 */
async function apiRequest(endpoint, method = "GET", body = null) {
    try {
        const config = { method, headers: globalHeaders };
        if (body) config.body = JSON.stringify(body); // JS -> Texte pour le réseau

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        return await response.json(); // Texte -> JS pour notre code
    } catch (error) {
        console.error(`Erreur API sur ${endpoint} :`, error);
        return { success: false, message: error.message };
    }
}

/**
 * Génère un bloc contenant 1 ou 2 initiales en majuscules (Point 1)
 */
function getInitials(fullName) {
    if (!fullName) return "?";
    const words = fullName.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Génère le composant visuel de l'avatar (Image ou Initiales) (Point 1)
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

// ==================== LOGIQUE DE L'APPLICATION ====================

/**
 * 1. Récupère et affiche le profil de l'utilisateur connecté
 */
async function fetchConnectedUser() {
    const result = await apiRequest("/auth/me");
    const connectedUser = result.data?.user;

    if (connectedUser) {
        // Optionnel : sauvegarde de mon propre ID pour le tri des messages (Point 9)
        localStorage.setItem("chat_user_id", connectedUser.id);

        const connectedUserContainer = document.getElementById('connectedUser-container');
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

/**
 * 2. Récupère et lister les utilisateurs disponibles dans la barre latérale
 */
async function fetchUsers() {
    const result = await apiRequest("/users");
    const users = result.data?.users || []; 

    const userProfileContainer = document.getElementById('userProfile-container');
    userProfileContainer.innerHTML = ''; 

    users.forEach(user => {
        // CORRECTION MAJEURE : On crée l'élément proprement en JavaScript
        const userProfileCard = document.createElement('div');
        
        // Ajout du style d'origine exact
        userProfileCard.className = "flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 cursor-pointer border border-blue-100/50 hover:bg-blue-100/50 transition-colors";
        
        // CORRECTION SÉCURITÉ CLIC : On attache l'événement en JS directement, pas en attribut HTML
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
 * 3. Déclenchée au clic sur un utilisateur : crée ou ouvre le salon de chat (Point 6 & 7)
 */
async function handleUserClick(peerUserId, peerName, selectedCardElement) {
    console.log(`[LOG] Déclenchement de la discussion avec : ${peerName}`);
    
    // Retirer le style "actif" de l'ancien utilisateur sélectionné
    document.querySelectorAll('#userProfile-container > div').forEach(el => {
        el.classList.remove('ring-2', 'ring-primary', 'bg-blue-100');
    });
    
    // Ajouter un indicateur visuel sur l'utilisateur actif
    selectedCardElement.classList.add('ring-2', 'ring-primary', 'bg-blue-100');

    // Requête POST pour ouvrir ou générer le canal
    const result = await apiRequest("/conversations", "POST", {
        type: "private",
        name: `Chat avec ${peerName}`,
        participantIds: [peerUserId]
    });

    if (result.success && result.data?.id) {
        currentConversationId = result.data.id; 
        console.log("[SUCCÈS] Salon Kadea connecté avec l'ID :", currentConversationId);
        
        // Charger les messages immédiatement
        fetchMessages(); 
    } else {
        console.error("Impossible de lier la conversation via l'API", result);
    }
}

/**
 * 5. Gestion de l'envoi lié au DOM réel
 */
function setupMessageSending() {
    const sendMessageInput = document.getElementById('send-message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');

    // Gestion du clic bouton
    sendMessageBtn.addEventListener('click', async (e) => {
        e.preventDefault(); 
        await executeSendMessage(sendMessageInput);
    });

    // Optionnel et ultra-confortable : envoi aussi en pressant "Entrée" dans le champ
    sendMessageInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await executeSendMessage(sendMessageInput);
        }
    });
}

/**
 * 4. Charge l'historique de la discussion sélectionnée
 */
async function fetchMessages() {
    if (!currentConversationId) return;

    const result = await apiRequest(`/conversations/${currentConversationId}/messages`);
    const messages = result.data || [];

    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = ''; // Nettoyer l'ancienne discussion

    messages.forEach(msg => {
        // Calcul logique indispensable : détermine le côté (Point 9)
        const isMe = msg.senderId === localStorage.getItem("chat_user_id");

        // Renommage explicite pour une meilleure lisibilité (Point 8)
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
    
    // Force la scrollbar à descendre au dernier message reçu (Point 10)
    messagesContainer.scrollTop = messagesContainer.scrollHeight; 
}

/**
 * 5. Initialise l'écouteur sur le bouton d'envoi de message
 */
async function executeSendMessage(inputElement) {
    const text = inputElement.value.trim();
    
    if (!text) return;
    if (!currentConversationId) {
        alert("Action impossible : Sélectionnez d'abord un utilisateur dans la liste de gauche !");
        return;
    }

    const result = await apiRequest(`/conversations/${currentConversationId}/messages`, "POST", {
        content: text
    });

    if (result.success) {
        inputElement.value = ''; // On vide le champ
        fetchMessages(); // Rechargement forcé de la zone centrale
    } else {
        alert("L'API a refusé le message : " + result.message);
    }
}

// ==================== INITIALISATION AUTOMATIQUE ====================
fetchConnectedUser();
fetchUsers();
executeSendMessage();

// Surveillance en arrière-plan : charge les nouveaux messages toutes les 4 secondes
setInterval(() => {
    if (currentConversationId) fetchMessages();
}, 4000);
