# Capstone-1-Kadea-Chat-Clone-Whatsapp-Web-

# Kadea Chat App 💬

## 📖 Présentation du projet
Kadea Chat App est une plateforme de messagerie et de partage de texte interactive, développée dans le cadre de mon projet de fin de deuxième module en développement web à la Kadea Academy. 

L'application permet aux utilisateurs de créer un profil sécurisé, de se connecter et d'interagir via une interface fluide et moderne. Une attention particulière a été portée sur l'expérience utilisateur (UX) et la sécurité des données côté client, avec des validations de formulaires strictes et une vérification asynchrone des adresses emails.

## 🛠️ Technologies utilisées
* **Frontend :** HTML5, JavaScript (ES6+ Modules)
* **Styling & Icons :** Tailwind CSS, daisyUI, Lucide Icons
* **Validation des données :** Yup
* **Vérification d'email :** AbstractAPI (Email Reputation)
* **Backend / API :** Kadea Chat API (REST)

## ⚙️ Instructions d'installation

Pour exécuter ce projet localement sur votre machine, suivez ces étapes :

1. **Cloner le dépôt**
   ```bash
   git clone [https://github.com/kadea-academy-learners/capstone-1-kadea-chat-clone-whatsapp-web-Ursula4002.git](https://github.com/kadea-academy-learners/capstone-1-kadea-chat-clone-whatsapp-web-Ursula4002.git)
   cd https://github.com/kadea-academy-learners/capstone-1-kadea-chat-clone-whatsapp-web-Ursula4002

2. **Configuration des clés d'API**
À la racine du dossier script, créez un fichier nommé config.js (ce fichier est ignoré par Git pour des raisons de sécurité). Ajoutez-y le code suivant avec vos propres clés :

export const config = {
    API_BASE_URL: "[https://kadea-chat-api.onrender.com](https://kadea-chat-api.onrender.com)",
    API_KEY: "votre_cle_kadea_ici",
    ABSTRACT_EMAIL_KEY: "votre_cle_abstract_api_ici"
};

3. **Lancer le projet**
Comme le projet utilise des modules JavaScript (type="module"), vous ne pouvez pas simplement ouvrir le fichier HTML dans le navigateur. Utilisez une extension comme Live Server sur VS Code pour lancer le projet en local.

Lien de démonstration : https://ursula4002.github.io/ChatApp/