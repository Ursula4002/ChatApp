
const USER_TOKEN = localStorage.getItem("chat_jwt_token")

let currentConversationId = "METTEZ_UN_ID_DE_CONVERSATION_ICI"; 

const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');

const headers = {
    "Content-Type": "application/json",
    "x-api-key": WORKSPACE_KEY,
    "Authorization": `Bearer ${USER_TOKEN}`
}

async function name(params) {
    
}