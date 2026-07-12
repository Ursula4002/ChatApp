// ==================== CONFIGURATION GLOBALE ====================

// Utiliser config.js à la place 

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

// ==========================================
// POUVOIR DE SÉCURITÉ : VÉRIFICATION DU TOKEN
// ==========================================

const token = localStorage.getItem("chat_jwt_token");

// Si le token n'existe pas du tout dans le localStorage
if (!token) {
    // On redirige immédiatement vers la page de connexion
    window.location.href = "/auth/signIn.html";
}

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

// Filtrer les conversations

function setupUserFilter() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const userCards = document.querySelectorAll('#userProfile-container > div');

        userCards.forEach(card => {
            // On cherche le nom à l'intérieur de la carte
            const nameSpan = card.querySelector('.font-semibold.text-sm');
            if (nameSpan) {
                const userName = nameSpan.textContent.toLowerCase();
                if (userName.includes(searchTerm)) {
                    card.style.display = 'flex'; // Affiche
                } else {
                    card.style.display = 'none'; // Cache
                }
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
                <div class="flex items-center gap-3 cursor-pointer">
                    <div class="relative w-10 h-10 flex items-center justify-center">
                        ${createAvatarTemplate(connectedUser.avatarUrl, connectedUser.fullName)}
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

            // CRUCIAL : Relance Lucide uniquement sur ce conteneur pour dessiner l'icône !
            if (window.lucide) {
                window.lucide.createIcons({
                    attrs: { class: ['w-4', 'h-4'] },
                    nameAttr: 'data-lucide'
                });
            }
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
    userProfileCard.className = "flex items-center gap-3 p-3 rounded-xl bg-base-200/70 cursor-pointer border border-base-content/10 hover:bg-base-200 transition-colors";

    userProfileCard.addEventListener('click', () => {
        handleUserClick(user.id, user.fullName, userProfileCard);
    });

    const avatarContent = user?.avatarUrl
        ? `<img src="${user.avatarUrl}" alt="${user.fullName}" />`
        : getInitials(user.fullName);

    const avatarClass = user?.avatarUrl ? "w-11 rounded-full" : "bg-primary/10 text-primary rounded-full w-11 h-11 flex items-center justify-center font-semibold text-sm";

    userProfileCard.innerHTML = `
        <div class="avatar ${!user?.avatarUrl ? 'placeholder' : ''}">
            <div class="${avatarClass}">
                ${avatarContent}
            </div>
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
                <span class="font-semibold text-sm text-base-content">${user.fullName}</span>
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

async function handleUserClick(peerUserId, peerName, peerAvatarUrl) {
    // 1. Gestion visuelle de la sélection (On retire l'état actif partout, et on l'ajoute sur l'élément cliqué)
    document.querySelectorAll('#userProfile-container > div').forEach(el => {
        el.classList.remove('ring-2', 'ring-primary', 'bg-blue-100');
    });

    // Trouve la carte cliquée grâce au ciblage de l'événement actuel
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('ring-2', 'ring-primary', 'bg-blue-100');
    }

    // 2. Appel API
    const result = await apiRequest("/conversations", "POST", {
        type: "private",
        name: `Chat avec ${peerName}`,
        participantIds: [peerUserId]
    });

    const conversationId = result.data?.conversation?.id || result.data?.id || result.id;

    if (conversationId) {
        currentConversationId = conversationId;

        const chatHeader = document.getElementById('chat-header');
        const activeUserInfo = document.getElementById('active-user-info');
        const chatFooter = document.getElementById('chat-footer');

        // Construction de l'avatar de manière propre en JS sans fouiller le HTML
        const avatarHtml = peerAvatarUrl
            ? `<img class="w-full h-full rounded-full object-cover" src="${peerAvatarUrl}" alt="${peerName}" />`
            : `<div class="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center font-bold text-xs">${getInitials(peerName)}</div>`;

        if (activeUserInfo && chatHeader && chatFooter) {
            // Remplissage direct de ton HTML cible
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
            chatHeader.classList.remove('invisible');
            chatFooter.classList.remove('hidden');
        }

        fetchMessages();
    } else {
        alert("Impossible d'ouvrir la discussion.");
    }
}

// Pour l'heure
function formatMessageTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

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

setupUserFilter()
fetchConnectedUser();
fetchUsers();
setupMessageSending();

// Polling de mise à jour synchronisée toutes les 4 secondes
setInterval(() => {
    if (currentConversationId) fetchMessages();
}, 4000);


// ==================== GESTION DU PROFIL & CLOUDINARY ====================

// Renseigne tes identifiants Cloudinary ici après avoir créé ton compte gratuit :
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/obd42wdt/image/upload";
const CLOUDINARY_PRESET = "ih4yfg4m";

let localConnectedUserCache = null;

/**
 * Affiche un message de notification moderne (Toast UX) au lieu d'une alerte bloquante
 */
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
 * Alterne l'affichage entre l'interface de Chat et l'interface de Profil
 */
function switchView(viewName) {
    console.log(`[NAVIGATION] Basculement vers l'affichage : ${viewName}`);
    const chatView = document.getElementById('chat-view');
    const profileView = document.getElementById('profile-view');
    const settingsBtn = document.getElementById('settings-btn');
    const chatTabBtn = document.querySelector('aside button:nth-child(2)'); // Sélectionne ton bouton de Chat dans la barre latérale

    if (viewName === 'profile') {
        chatView.classList.add('hidden');
        profileView.classList.remove('hidden');

        if (settingsBtn) settingsBtn.classList.add('text-primary', 'bg-primary/10', 'rounded-xl');
        if (chatTabBtn) chatTabBtn.classList.remove('text-primary', 'bg-primary/10');

        populateProfileForm();
    } else {
        profileView.classList.add('hidden');
        chatView.classList.remove('hidden');

        if (settingsBtn) settingsBtn.classList.remove('text-primary', 'bg-primary/10');
        if (chatTabBtn) chatTabBtn.classList.add('text-primary', 'bg-primary/10');
    }
}

/**
 * Remplit fidèlement la page profil avec les données de l'utilisateur connecté
 */
function populateProfileForm() {
    if (!localConnectedUserCache) return;
    console.log("[PROFIL] Remplissage des champs avec les données :", localConnectedUserCache);

    const avatarInside = document.getElementById('profile-avatar-inside');
    const displayName = document.getElementById('profile-display-name');
    const displayEmail = document.getElementById('profile-display-email');
    const fullNameInput = document.getElementById('profile-fullname-input');

    // Remplissage de l'avatar principal du profil
    if (avatarInside) {
        avatarInside.innerHTML = localConnectedUserCache.avatarUrl
            ? `<img class="w-full h-full object-cover rounded-full" src="${localConnectedUserCache.avatarUrl}" alt="Profile" />`
            : `<div class="text-xl font-bold text-primary">${getInitials(localConnectedUserCache.fullName)}</div>`;
    }

    if (displayName) displayName.textContent = localConnectedUserCache.fullName || "Utilisateur";
    if (displayEmail) displayEmail.textContent = localConnectedUserCache.email || "non-communique@kadea.co";
    if (fullNameInput) fullNameInput.value = localConnectedUserCache.fullName || "";

    if (window.lucide) window.lucide.createIcons();
}

/**
 * Envoie le fichier sélectionné vers le serveur Cloudinary
 */
async function uploadImageToCloudinary(file) {
    console.log("[CLOUDINARY] Début du téléversement du fichier :", file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        if (!response.ok) throw new Error("Réponse serveur Cloudinary incorrecte");

        const data = await response.json();
        console.log("[CLOUDINARY] Téléversement réussi ! URL obtenue :", data.secure_url);
        return data.secure_url;
    } catch (error) {
        console.error("[CLOUDINARY] Erreur :", error);
        showToast("Impossible d'envoyer l'image.", "error");
        return null;
    }
}

/**
 * Écouteurs d'événements pour le profil et retour au chat
 */
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

            document.getElementById('profile-avatar-inside').innerHTML = `<span class="loading loading-spinner loading-md text-primary"></span>`;

            const remoteUrl = await uploadImageToCloudinary(file);
            if (remoteUrl) {
                await saveProfileData({ avatarUrl: remoteUrl });
            } else {
                populateProfileForm();
            }
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const fullName = document.getElementById('profile-fullname-input').value.trim();
            if (!fullName) {
                showToast("Le nom complet ne peut pas être vide.", "error");
                return;
            }
            await saveProfileData({ fullName });
        });
    }
}

/**
 * Lance la requête PATCH vers ton API
 */
async function saveProfileData(fieldsToUpdate) {
    console.log("[API PATCH] Envoi des modifications :", fieldsToUpdate);
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

    if (result && result.success) {
        showToast("Profil enregistré avec succès !");
        await fetchConnectedUser(); // Force la synchronisation globale
    } else {
        showToast("Erreur lors de la sauvegarde.", "error");
    }
}

// Interception pour alimenter notre variable cache locale
const originalFetchConnectedUser = fetchConnectedUser;

fetchConnectedUser = async function () {
    const result = await apiRequest("/auth/me");
    if (result && result.data?.user) {
        localConnectedUserCache = result.data.user;
    }
    await originalFetchConnectedUser();
    if (!document.getElementById('profile-view').classList.contains('hidden')) {
        populateProfileForm();
    }
};

// Interception du clic utilisateur pour forcer le retour au chat
const originalHandleUserClick = handleUserClick;

handleUserClick = async function (peerUserId, peerName, peerAvatarUrl) {
    switchView('chat'); // Point 2 : On force le retour sur l'écran chat au clic d'un contact
    await originalHandleUserClick(peerUserId, peerName, peerAvatarUrl);
};

// Initialisation au chargement
setupProfileLogic();

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------



// --------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

async function logOut() {
    const logOutBtn = document.getElementById('logout-btn')
    const response = await apiRequest("/auth/logout", "POST");
    console.log("--------- LogOut Data : ---------", logOutBtn);
    console.log(response);

    logOutBtn.addEventListener('click', () => {
        window.location.href = "/auth/signUp.html";
    })

}

logOut()

async function deleteMessage() {
    const result = await apiRequest(`/messages/:${id}`);
    // CORRECTION ICI : s'adapte si l'API renvoie directement le tableau ou un objet contenant le tableau
    const messages = result.data?.messages || result.data || [];
    console.log("-----------DELETE MESSAGE----------------- :", messages );
    
}

deleteMessage()