// === SPA NAVIGATION ===
function showPage(pageId) {
    // 1. Ocultar todas las páginas
    const pages = document.querySelectorAll('.page-view');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // 2. Desactivar todos los enlaces del menú
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.classList.remove('active');
    });

    // 3. Mostrar la página seleccionada
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // 4. Activar el enlace correspondiente
    const activeLink = document.getElementById('link-' + pageId);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Scroll automático al fondo del chat si se abre esa pestaña
    if(pageId === 'ai-architect') {
        setTimeout(() => {
            const chatHistory = document.getElementById('chat-history');
            if(chatHistory) chatHistory.scrollTop = chatHistory.scrollHeight;
        }, 100);
    }

    // Manejo del Footer (Ocultar en chat, mostrar en otros)
    const footer = document.getElementById('main-footer');
    if(footer) {
        if (pageId === 'ai-architect') {
            footer.style.display = 'none';
        } else {
            footer.style.display = 'block';
        }
    }

    // 5. Scroll al top suavemente (excepto en chat)
    if(pageId !== 'ai-architect') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 6. Cerrar menú móvil si está abierto
    const navMenu = document.getElementById('nav-menu');
    if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
    }
}

// Función para abrir/cerrar menú móvil
function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    if(navMenu) navMenu.classList.toggle('active');
}

// === GEMINI AI INTEGRATION (CHAT MODE) ===
const apiKey = ""; // <--- ¡COLOCA TU API KEY DE GEMINI AQUÍ!

// CONFIGURACIÓN DE LÍMITES
const DAILY_LIMIT = 3; // Máximo de consultas por día
const STORAGE_KEY = 'gioyis_ai_usage';

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function checkUsageLimit() {
    const usageData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"count": 0, "date": ""}');
    const today = new Date().toDateString();

    // Si es un nuevo día, reseteamos el contador
    if (usageData.date !== today) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today }));
        return true;
    }

    // Si ya alcanzó el límite
    if (usageData.count >= DAILY_LIMIT) {
        return false;
    }

    return true;
}

function incrementUsage() {
    const usageData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"count": 0, "date": ""}');
    const today = new Date().toDateString();
    
    let newCount = 1;
    if (usageData.date === today) {
        newCount = usageData.count + 1;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, date: today }));
}

async function sendMessage() {
    const inputField = document.getElementById('chat-input');
    
    const userText = inputField.value.trim();
    
    if(!userText || userText.length < 3) return;

    // 1. Agregar mensaje del usuario
    appendMessage('user', userText);
    inputField.value = ''; // Limpiar input

    // 2. VERIFICAR LÍMITE ANTES DE LLAMAR A LA API
    if (!checkUsageLimit()) {
        setTimeout(() => {
            appendMessage('bot', `
                <h3>🛑 Límite Diario Alcanzado</h3>
                <p>Has utilizado tus <b>${DAILY_LIMIT} consultas gratuitas</b> de hoy.</p>
                <p>Mi capacidad de análisis estratégico es profunda, pero limitada en esta demo pública.</p>
                <p>¿Te interesa llevar esta idea a la realidad? <b>Hablemos en serio.</b></p>
                <br>
                <button onclick="showPage('contact')" class="btn btn-primary" style="font-size:0.9rem; padding:0.5rem 1rem;">Agendar Reunión</button>
            `);
        }, 600);
        return;
    }

    // 3. Mostrar indicador de "Escribiendo..."
    const loadingId = showLoading();

    // 4. Preparar Prompt Estratégico
    const prompt = `Actúa como un consultor de negocios y tecnología senior de "Gioyis Studio". El usuario tiene esta idea: "${userText}".
    
    TU OBJETIVO:
    No des una solución técnica completa (no regales la arquitectura). En su lugar, analiza la idea y genera curiosidad.
    
    IMPORTANTE: RESPONDE USANDO ÚNICAMENTE HTML VÁLIDO PARA DAR FORMATO.
    NO uses Markdown (no uses **, ###, -).
    
    Usa estas etiquetas para estructurar tu respuesta:
    - <h3>Para los títulos de cada sección</h3>
    - <ul> y <li> para listas de puntos o características.
    - <b> para resaltar palabras clave importantes.
    - <p> para los párrafos de texto.

    ESTRUCTURA DE TU RESPUESTA:
    1. <h3>💡 Validación</h3> Un comentario positivo pero realista sobre la idea.
    2. <h3>⚠️ El Reto Oculto</h3> Menciona 1 o 2 desafíos técnicos difíciles que el usuario no ha considerado.
    3. <h3>🚀 La Solución Gioyis</h3> Menciona vagamente que tienes una metodología propia o un módulo pre-hecho para resolver eso rápido.
    4. <h3>📅 Próximo Paso</h3> Invita al usuario a agendar una reunión para revelarle la estrategia completa.

    Tono: Profesional, intrigante, experto. Sé conciso.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        const data = await response.json();
        let botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, tuve un problema analizando tu idea. ¿Podemos intentarlo de nuevo?";
        
        // Fallback simple por si la IA usa Markdown a pesar de las instrucciones
        botText = parseMarkdownSimple(botText);

        // 5. Quitar loading, mostrar respuesta e INCREMENTAR EL CONTADOR
        removeLoading(loadingId);
        appendMessage('bot', botText);
        incrementUsage();

    } catch (error) {
        console.error(error);
        removeLoading(loadingId);
        appendMessage('bot', "Error de conexión. Verifica tu conexión o intenta más tarde.");
    }
}

// Función auxiliar para limpiar Markdown básico si la IA falla en enviar HTML
function parseMarkdownSimple(text) {
    // Si ya parece HTML, lo devolvemos tal cual
    if (text.includes('<h3>') || text.includes('<b>')) return text;

    return text
        .replace(/### (.*)/g, '<h3>$1</h3>') // Headers
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
        .replace(/- (.*)/g, '<li>$1</li>') // List items simple
        .replace(/\n/g, '<br>'); // Newlines
}

function appendMessage(sender, text) {
    const chatWrapper = document.getElementById('chat-content-wrapper');
    const chatHistory = document.getElementById('chat-history');
    
    if(!chatWrapper) return;

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerHTML = text; // Permitimos HTML simple del bot
    
    chatWrapper.appendChild(msgDiv);
    
    // Scroll al fondo
    if(chatHistory) {
        setTimeout(() => {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }, 50);
    }
}

function showLoading() {
    const chatWrapper = document.getElementById('chat-content-wrapper');
    const chatHistory = document.getElementById('chat-history');
    
    if(!chatWrapper) return;

    const id = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('typing-indicator');
    loadingDiv.id = id;
    loadingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatWrapper.appendChild(loadingDiv);
    
    if(chatHistory) {
        setTimeout(() => {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }, 50);
    }
    
    return id;
}

function removeLoading(id) {
    const element = document.getElementById(id);
    if(element) element.remove();
}