
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