import * as yup from 'yup';

// Configuration de l'API
const API_BASE_URL = "https://kadea-chat-api.onrender.com";
const API_KEY = "wksp_c7f8367d338d051ae4fbfe357909497a"; 

// Validation Yup 
const registerSchema = yup.object().shape({
    fullName: yup.string()
        .min(5, "Le nom doit contenir au moins 5 caractères")
        .required("Le nom complet est obligatoire"),
    email: yup.string()
        .email("Format d'email invalide")
        .required("L'adresse email est obligatoire"),
    password: yup.string()
        .min(6, "Le mot de passe doit faire au moins 6 caractères")
        .required("Le mot de passe est obligatoire"),
    confirmPassword: yup.string()
        .oneOf([yup.ref('password'), null], "Les mots de passe ne correspondent pas")
        .required("La confirmation est obligatoire")
});

document.getElementById("registerForm").addEventListener("submit", async function (event) {
    // 1. Bloquer le rechargement de la page
    event.preventDefault();

    // Réinitialiser les messages d'erreurs (pour éviter d'avoir les mêmes messages d'erreur même s'ils changent)
    clearErrors();

    // 2. Récupérer les données
    const formData = new FormData(event.target);
    const dataToValidate = Object.fromEntries(formData.entries());

    try {
        // 3. Validation Yup
        // 'abortEarly: false' force Yup à chercher TOUTES les erreurs avant de s'arrêter
        await registerSchema.validate(dataToValidate, { abortEarly: false });

        // Préparer les données pour le backend (l'API n'attend pas de 'confirmPassword')
        const backendData = {
            fullName: dataToValidate.fullName,
            email: dataToValidate.email,
            password: dataToValidate.password
        };

        // 4. Appel à l'API existante
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            },
            body: JSON.stringify(backendData)
        });

        const result = await response.json();

        console.log(response);
        
        // 5. Traitement de la réponse de l'API
        if (response.ok && result.success) {
            alert("Compte créé avec succès !");
            // Redirection vers la page de connexion
            window.location.href = "signIn.html"; 
        } else {
            // Erreur renvoyée par le serveur (ex: email déjà utilisé)
            showGlobalError(result.message || "Une erreur est survenue lors de l'inscription.");
        }

    } catch (error) {
        // Intercepter et afficher les erreurs de validation Yup
        if (error.name === "ValidationError") {
            error.inner.forEach(err => {
                const errorSpan = document.getElementById(`error-${err.path}`);
                if (errorSpan) {
                    errorSpan.innerText = err.message;
                }
            });
        } else {
            // Erreur réseau généralisée
            showGlobalError("Impossible de contacter le serveur. Veuillez réessayer.");
            console.error("Erreur critique:", error);
        }
    }
});

// Fonctions utilitaires d'affichage
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


// ---------------------------------------- LOGIN ---------------------------------------------------


