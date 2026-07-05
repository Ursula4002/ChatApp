import * as yup from 'yup';

// Configuration de l'API
const API_BASE_URL = "https://kadea-chat-api.onrender.com";
const API_KEY = "wksp_c7f8367d338d051ae4fbfe357909497a";

const loginSchema = yup.object().shape({
    email: yup.string()
        .email("Format d'email invalide")
        .required("L'adresse email est obligatoire"),
    password: yup.string()
        .required("Le mot de passe est obligatoire")
});

document.getElementById("loginForm").addEventListener("submit", async function (event) {

    event.preventDefault();
    clearErrors();

    const formData = new FormData(event.target);
    const dataToValidate = Object.fromEntries(formData.entries());

    try {

        // Validation des champs avec Yup
        await loginSchema.validate(dataToValidate, { abortEarly: false });

        // Appel à l'API : /auth/login
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            },
            body: JSON.stringify(dataToValidate)
        });

        const result = await response.json();

        console.log(result);

        if (response.ok && result.success) {
            // ( STOCKAGE DU JWT : )
            // Je récupère les tokens reçus et je les stocke
            const token = result.data.token;

            // Je dois sauvegarde le token dans localStorage  ( "chat_jwt_token" is simply a name, c'est la variable qui contiendra les token. Could have given it any other name)
            localStorage.setItem("chat_jwt_token", token);
            // Test avec une alerte ( first )
            alert("Connexion réussie !");
            // Redirection vers le chat ( interface )
            window.location.href = "/index.html";
        } else {
            showGlobalError(result.message || "Identifiants incorrects.");
        }


    } catch (error) {
        if (error.name === "ValidationError") {
            error.inner.forEach(err => {
                const errorSpan = document.getElementById(`error-${err.path}`);
                if (errorSpan) errorSpan.innerText = err.message;
            });
        } else {
            showGlobalError("Erreur de connexion au serveur.");
            console.error(error);
        }
    }

})


// Handle les erreurs

function clearErrors() {
    document.querySelectorAll("[id^='error-']").forEach(span => span.innerText = "");
    const globalAlert = document.getElementById("globalAlert");
    globalAlert.classList.add("hidden");
    globalAlert.innerText = "";
}

function showGlobalError(message) {
    const globalAlert = document.getElementById("globalAlert");
    globalAlert.classList.remove("hidden");
    globalAlert.innerText = message;
}
