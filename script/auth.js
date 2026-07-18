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
            // Si la variable 'value' est vide, fausse ou inexistante"
            // Si l'utilisateur n'a rien écrit, on s'arrête ici et on renvoie false (champ invalide)
            if (!value) return false;

            try {
                // Vérification de l'existence réelle de l'email via l'API de abstract
                const res = await fetch(`https://emailreputation.abstractapi.com/v1/?api_key=${config.ABSTRACT_EMAIL_KEY}&email=${value}`);
                console.log("Vérification Existence Email - Statut HTTP :", res.status);

                const data = await res.json();
                console.log("Vérification Existence Email - Réponse JSON :", data);

                // data -> email_deliverability -> status 
                // Mon bug était du au fait que je te tentais d'accéder à l'élément status directement 
                // alors que ce dernier figure dans l'objet : email_deliverability
                return data.email_deliverability.status === "deliverable" && data.email_deliverability.is_smtp_valid === true;
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

async function globalFetch(endpoint, method = "POST", bodyData = null) {
    const headers = {
        "Content-Type": "application/json",
        "x-api-key": config.API_KEY
    };

    const options = {
        method: method,
        headers: headers
    };

    // Si on a des données à envoyer, on les transforme en texte JSON
    if (bodyData) {
        options.body = JSON.stringify(bodyData);
    }

    // Appel réseau vers l'API de base combinée avec l'endpoint fourni
    const response = await fetch(`${config.API_BASE_URL}${endpoint}`, options);

    console.log(`API [${method}] ${endpoint} - Statut HTTP reçu :`, response.status);

    const result = await response.json();
    console.log(`API [${method}] ${endpoint} - JSON reçu :`, result);

    // On retourne un objet contenant la réponse brute ET le JSON décodé
    return { response, result };
}

function clearErrors() {
    document.querySelectorAll("[id^='error-']").forEach(span => span.innerText = "");
    const globalAlert = document.getElementById("globalAlert");

    // On vérifie si l'élément HTML 'globalAlert' existe bien dans la page, 
    // puisque ce scropt gère les deux pages, si l'une des pages n'a pas/plus cet élément
    // cela évite que le code JavaScript plante. Il va juste sauter cette ligne de code. 
    // On nettoie le champ pour éviter que des erreurs appear even after fixing them.
    if (globalAlert) {
        globalAlert.classList.add("hidden");
        globalAlert.innerText = "";
    }
}

function showGlobalMessage(message, isSuccess = false) {
    const globalAlert = document.getElementById("globalAlert");

    // Si l'élément HTML 'globalAlert' existe bien dans la page. 
    // Même procédé
    if (globalAlert) {
        globalAlert.classList.remove("hidden");
        globalAlert.innerText = message;

        // "Si la variable 'isSuccess' vaut true (vrai)"
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
    // ValidationError, est le message d'erreur par défaut de Yup, si l'erreur conrrespond à cela 
    // on sait que c'est une erreur de validation
    if (error.name === "ValidationError") {
        // Si l'utilisateur a fait plusieurs erreurs (par exemple : un nom trop court et un email 
        // invalide), Yup va lever une grosse erreur globale. À l'intérieur de cette erreur, 
        // il crée un tableau (une liste) qui contient le détail de chaque champ qui a échoué. 
        // Ce tableau s'appelle .inner 
        // error.inner : C'est la liste de toutes les erreurs individuelles trouvées par Yup.
        error.inner.forEach(err => {
            // err.path : C'est le nom du champ qui a planté (ex: "fullName", "email", "password").
            // "error-" avec le nom du champ (err.path). Si le champ email a une erreur, 
            // il va chercher l'élément avec l'id error-email.
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
// "Si le formulaire 'registerForm' est présent sur cette page HTML"
if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearErrors();

        const formData = new FormData(event.target);
        // Récupère les données entrées dans le formulaire. 
        // Puis on récupère chaque donnée par son input name 
        // On le transforme en objet classique.
        // e.g: dataToValidate.fullName ( get les data de ce champ)
        const dataToValidate = Object.fromEntries(formData.entries());

        try {
            // abortEarly: false dit à Yup : "Ne t'arrête pas à la première erreur rencontrée, 
            // vérifie tout le formulaire d'un coup".
            await registerSchema.validate(dataToValidate, { abortEarly: false });

            const backendData = {
                fullName: dataToValidate.fullName,
                email: dataToValidate.email,
                password: dataToValidate.password
            };

            const { response, result } = await globalFetch("/auth/register", "POST", backendData);

            if (response.ok && result.success) {
                showGlobalMessage("Compte créé avec succès !", true);
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
            // const response = await fetch(`${config.API_BASE_URL}/auth/login`, {
            await loginSchema.validate(dataToValidate, { abortEarly: false });

            //     method: "POST",
            //     headers: {
            //         "Content-Type": "application/json",
            //         "x-api-key": config.API_KEY
            //     },
            //     body: JSON.stringify(dataToValidate)
            // });

            // Log de la réponse brute de la requête Connexion
            const { response, result } = await globalFetch("/auth/login", "POST", dataToValidate);

            if (response.ok && result.success) {
                const token = result.data.token;
                localStorage.setItem("chatToken", token);

                showGlobalMessage("Connexion réussie !", true);
                setTimeout(() => {
                    window.location.href = "../index.html";
                }, 1500)
            } else {
                showGlobalMessage(result.message || "Identifiants incorrects.", false);
            }

        } catch (error) {
            handleValidationError(error);
        }
    });
}