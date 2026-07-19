// ==================== GESTION DU THÈME (DAISYUI) ====================

function initThemeSystem() {
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');
    const autoToggle = document.getElementById('theme-auto-toggle');

    const LIGHT_THEME = "light";
    const DARK_THEME = "dark";

    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);

        if (themeName === LIGHT_THEME) {
            lightBtn?.classList.add('btn-active', 'btn-primary');
            darkBtn?.classList.remove('btn-active', 'btn-primary');
        } else {
            darkBtn?.classList.add('btn-active', 'btn-primary');
            lightBtn?.classList.remove('btn-active', 'btn-primary');
        }
    }

    function getThemeByTime() {
        const hour = new Date().getHours();
        return (hour >= 18 || hour < 6) ? DARK_THEME : LIGHT_THEME;
    }

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

initThemeSystem();
