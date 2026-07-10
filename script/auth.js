import * as yup from 'yup';
import { config } from './config.js'; 

// ==========================================
// 1. SCHÉMAS DE VALIDATION (YUP)
// ==========================================

const registerSchema = yup.object().shape({
    fullName: yup.string()
        .min(5, "Le nom doit contenir au moins 5 caractères")
        .required("Le nom complet est obligatoire"),
    email: yup.string()
        .email("Format d'email invalide")
        .required("L'adresse email est obligatoire")
        // .test() est une méthode Yup pour créer une règle de validation sur-mesure
        .test('async-email-check', "Cette adresse email n'existe pas ou est invalide", async (value) => {
            // COMPRENDRE CE IF : "Si la variable 'value' est vide, fausse ou inexistante"
            // Si l'utilisateur n'a rien écrit, on s'arrête ici et on renvoie false (champ invalide)
            if (!value) return false;

            try {
                // Simulation d'une vérification de l'existence réelle de l'email via une API tierce
                const res = await fetch(`https://api.emailverification.com/v1?email=${value}&api_key=MOCK_KEY`);
                console.log("Vérification Existence Email - Statut HTTP :", res.status);

                const data = await res.json();
                console.log("Vérification Existence Email - Réponse JSON :", data);

                return data.is_deliverable;
            } catch (err) {
                // Si l'API externe plante, on renvoie true pour ne pas bloquer l'utilisateur à cause d'une panne réseau
                return true;
            }
        }),
    password: yup.string()
        .min(6, "Le mot de passe doit faire au moins 6 caractères")
        .required("Le mot de passe est obligatoire"),
    confirmPassword: yup.string()
        .oneOf([yup.ref('password'), null], "Les mots de passe ne correspondent pas")
        .required("La confirmation est obligatoire")
});

const loginSchema = yup.object().shape({
    email: yup.string()
        .email("Format d'email invalide")
        .required("L'adresse email est obligatoire"),
    password: yup.string()
        .required("Le mot de passe est obligatoire")
});

// ==========================================
// 2. FONCTIONS UTILITAIRES D'AFFICHAGE
// ==========================================

function clearErrors() {
    document.querySelectorAll("[id^='error-']").forEach(span => span.innerText = "");
    const globalAlert = document.getElementById("globalAlert");

    // On vérifie si l'élément HTML 'globalAlert' existe bien dans la page
    // Cela évite que le code JavaScript plante si la page HTML courante n'a pas cette balise. 
    // On nettoie le champ pour éviter que des erreurs appear even after fixing them
    if (globalAlert) {
        globalAlert.classList.add("hidden");
        globalAlert.innerText = "";
    }
}

function showGlobalMessage(message, isSuccess = false) {
    const globalAlert = document.getElementById("globalAlert");

    // COMPRENDRE CE IF : "Si l'élément HTML 'globalAlert' existe bien dans la page"
    if (globalAlert) {
        globalAlert.classList.remove("hidden");
        globalAlert.innerText = message;

        // COMPRENDRE CE IF : "Si la variable 'isSuccess' vaut true (vrai)"
        // Si c'est un message de succès, on applique du vert, sinon du rouge pour l'erreur.
        if (isSuccess) {
            globalAlert.classList.remove("text-red-500", "bg-red-100", "alert-error");
            globalAlert.classList.add("alert-success", "alert-soft");
        } else {
            globalAlert.classList.remove("text-green-500", "bg-green-100");
            globalAlert.classList.add("text-red-500", "bg-red-100");
        }
    }
}

function handleValidationError(error) {
    if (error.name === "ValidationError") {
        error.inner.forEach(err => {
            const errorSpan = document.getElementById(`error-${err.path}`);
            if (errorSpan) {
                errorSpan.innerText = err.message;
            }
        });
    } else {
        showGlobalMessage("Impossible de contacter le serveur. Veuillez réessayer.", false);
        console.error("Erreur critique:", error);
    }
}

// ==========================================
// 3. GESTION DES FORMULAIRES
// ==========================================

// Formulaire d'inscription (Register)
const registerForm = document.getElementById("registerForm");
// COMPRENDRE CE IF : "Si le formulaire 'registerForm' est présent sur cette page HTML"
if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearErrors();

        const formData = new FormData(event.target);
        // Récupère les données entrées dans le formulaire. 
        // Puis on récupère chaque donnée par son input name 
        // e.g: dataToValidate.fullName ( get les data de ce champ)
        const dataToValidate = Object.fromEntries(formData.entries());

        try {
            await registerSchema.validate(dataToValidate, { abortEarly: false });

            const backendData = {
                fullName: dataToValidate.fullName,
                email: dataToValidate.email,
                password: dataToValidate.password
            };

            const response = await fetch(`${config.API_BASE_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": config.API_KEY
                },
                body: JSON.stringify(backendData)
            });

            // Log de la réponse brute de la requête Inscription
            console.log("Inscription - Statut HTTP reçu :", response.status);

            const result = await response.json();
            // Log du contenu JSON reçu de la requête Inscription
            console.log("Inscription - JSON reçu :", result);

            if (response.ok && result.success) {
                showGlobalMessage("Compte créé avec succès !", true);
                // On attend 2 secondes avant de rediriger pour que l'utilisateur lise le message de succès
                setTimeout(() => {
                    window.location.href = "signIn.html";
                }, 2000);
            } else {
                showGlobalMessage(result.message || "Une erreur est survenue lors de l'inscription.", false);
            }

        } catch (error) {
            handleValidationError(error);
        }
    });
}

// Formulaire de connexion (Login)
const loginForm = document.getElementById("loginForm");
// si le formulaire 'loginForm' est présent sur cette page HTML"
if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearErrors();

        const formData = new FormData(event.target);
        const dataToValidate = Object.fromEntries(formData.entries());

        try {
            await loginSchema.validate(dataToValidate, { abortEarly: false });

            const response = await fetch(`${config.API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": config.API_KEY
                },
                body: JSON.stringify(dataToValidate)
            });

            // Log de la réponse brute de la requête Connexion
            console.log("Connexion - Statut HTTP reçu :", response.status);

            const result = await response.json();
            // Log du contenu JSON reçu de la requête Connexion
            console.log("Connexion - JSON reçu :", result);

            if (response.ok && result.success) {
                const token = result.data.token;
                localStorage.setItem("chat_jwt_token", token);

                showGlobalMessage("Connexion réussie !", true);
                setTimeout(() => {
                    window.location.href = "/index.html";
                }, 1500);
            } else {
                showGlobalMessage(result.message || "Identifiants incorrects.", false);
            }

        } catch (error) {
            handleValidationError(error);
        }
    });
}