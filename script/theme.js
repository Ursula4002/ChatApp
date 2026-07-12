// ==================== GESTION DU THÈME (DAISYUI) ====================

function initThemeSystem() {
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');
    const autoToggle = document.getElementById('theme-auto-toggle');

    // Thèmes choisis dans Tailwind/DaisyUI (ex: "light" et "dark", ou "cupcake" et "night")
    const LIGHT_THEME = "light"; 
    const DARK_THEME = "dark";

    // Applique le thème sur la balise <html> requise par DaisyUI
    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        
        // Ajustement visuel des boutons pour montrer lequel est actif
        if (themeName === LIGHT_THEME) {
            lightBtn?.classList.add('btn-active', 'btn-primary');
            darkBtn?.classList.remove('btn-active', 'btn-primary');
        } else {
            darkBtn?.classList.add('btn-active', 'btn-primary');
            lightBtn?.classList.remove('btn-active', 'btn-primary');
        }
    }

    // Vérifie l'heure actuelle pour choisir le thème adéquat (Sombre entre 18h et 6h)
    function getThemeByTime() {
        const hour = new Date().getHours();
        return (hour >= 18 || hour < 6) ? DARK_THEME : LIGHT_THEME;
    }

    // Actualise le thème selon les réglages
    function refreshTheme() {
        const isAuto = autoToggle ? autoToggle.checked : true;
        
        if (isAuto) {
            const timeTheme = getThemeByTime();
            applyTheme(timeTheme);
            localStorage.setItem('chat_theme_mode', 'auto');
        } else {
            const savedTheme = localStorage.getItem('chat_user_theme') || LIGHT_THEME;
            applyTheme(savedTheme);
        }
    }

    // Écouteurs d'événements
    autoToggle?.addEventListener('change', () => {
        if (autoToggle.checked) {
            localStorage.setItem('chat_theme_mode', 'auto');
        } else {
            localStorage.setItem('chat_theme_mode', 'manual');
            // Si on décoche, on garde par défaut le thème actuel comme choix manuel
            const current = document.documentElement.getAttribute('data-theme');
            localStorage.setItem('chat_user_theme', current);
        }
        refreshTheme();
    });

    lightBtn?.addEventListener('click', () => {
        if (autoToggle) autoToggle.checked = false;
        localStorage.setItem('chat_theme_mode', 'manual');
        localStorage.setItem('chat_user_theme', LIGHT_THEME);
        applyTheme(LIGHT_THEME);
    });

    darkBtn?.addEventListener('click', () => {
        if (autoToggle) autoToggle.checked = false;
        localStorage.setItem('chat_theme_mode', 'manual');
        localStorage.setItem('chat_user_theme', DARK_THEME);
        applyTheme(DARK_THEME);
    });

    // Chargement initial au démarrage
    const savedMode = localStorage.getItem('chat_theme_mode');
    if (savedMode === 'manual') {
        if (autoToggle) autoToggle.checked = false;
        const savedTheme = localStorage.getItem('chat_user_theme') || LIGHT_THEME;
        applyTheme(savedTheme);
    } else {
        if (autoToggle) autoToggle.checked = true;
        refreshTheme();
    }
}

// À appeler dans ton DOMContentLoaded :
initThemeSystem();