
// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = 'https://qxakxkbjedeozaewrevo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YWt4a2JqZWRlb3phZXdyZXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDM5MTEsImV4cCI6MjEwMjM3OTkxMX0.VaiF1IFlhkrMhz0s_lIa9Qvs_yS01ShLGGmaJW9Ls_M';

// Avoid name collision with the global from the CDN
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Sube un archivo a Storage y devuelve la URL pública (o null si falla) */
async function uploadToStorage(bucket, file, folder) {
  if (!file) {
    console.error('upload: no file');
    return null;
  }
  if (!currentUser) {
    console.error('upload: no user');
    toast('No hay sesion');
    return null;
  }
  const safeName = String(file.name || 'file').replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `${folder || currentUser.id}/${Date.now()}_${safeName}`;
  try {
    const { data: up, error } = await sb.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined
    });
    if (error) {
      console.error('storage upload', bucket, error);
      toast('Storage [' + bucket + ']: ' + (error.message || error.error || error.statusCode || 'error'));
      return null;
    }
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const url = data?.publicUrl || null;
    console.log('uploaded', bucket, url);
    return url;
  } catch (e) {
    console.error('storage', e);
    toast('Storage error: ' + (e.message || e));
    return null;
  }
}


// ========== RETRO SOUND SYSTEM ==========
let soundEnabled = true;
let soundVolume = 0.35;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      soundEnabled = false;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'square', vol = 1) {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = soundVolume * vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(soundVolume * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch (e) {}
}

const SFX = {
  click:   () => playTone(420, 0.04, 'square', 0.5),
  send:    () => { playTone(660, 0.06, 'square', 0.7); setTimeout(() => playTone(880, 0.05, 'square', 0.5), 50); },
  receive: () => { playTone(520, 0.07, 'triangle', 0.6); setTimeout(() => playTone(390, 0.08, 'triangle', 0.4), 70); },
  open:    () => playTone(300, 0.1, 'sawtooth', 0.35),
  success: () => { playTone(523, 0.08, 'square', 0.5); setTimeout(() => playTone(784, 0.12, 'square', 0.5), 90); },
  error:   () => { playTone(180, 0.15, 'sawtooth', 0.55); },
  status:  () => { playTone(440, 0.05, 'square', 0.4); setTimeout(() => playTone(550, 0.05, 'square', 0.35), 60); setTimeout(() => playTone(660, 0.08, 'square', 0.3), 120); },
  like:    () => playTone(700, 0.05, 'triangle', 0.45)
};

function playSfx(name) {
  if (SFX[name]) SFX[name]();
}

// Load sound prefs
try {
  const sp = JSON.parse(localStorage.getItem('reiny_sound') || '{}');
  if (typeof sp.enabled === 'boolean') soundEnabled = sp.enabled;
  if (typeof sp.volume === 'number') soundVolume = sp.volume;
} catch (e) {}

function saveSoundPrefs() {
  try {
    localStorage.setItem('reiny_sound', JSON.stringify({ enabled: soundEnabled, volume: soundVolume }));
  } catch (e) {}
}

// ========== CHAT BACKGROUNDS ==========
const CHAT_BGS = {
  none: { name: 'Ninguno', css: '' },
  dots: { name: 'Puntos', css: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)' },
  grid: { name: 'Cuadrícula', css: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)' },
  scan: { name: 'Scanlines', css: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' },
  diagonal: { name: 'Diagonal', css: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)' },
  noise: { name: 'Noise', css: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.08\'/%3E%3C/svg%3E")' },
  gradient: { name: 'Gradiente', css: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 100%)' },
  solid: { name: 'Color sólido', css: 'solid' }
};

function applyChatBackground() {
  const container = document.getElementById('messages-container');
  if (!container) return;

  // Per-chat theme from settings button (priority)
  let perChat = null;
  try {
    if (currentChatId) perChat = localStorage.getItem('reiny_chat_bg_' + currentChatId);
  } catch (e) {}

  if (perChat && perChat !== 'default') {
    container.className = 'messages chat-bg-' + perChat;
    container.style.backgroundColor = '';
    container.style.backgroundImage = '';
    return;
  }

  container.className = 'messages';
  const key = (profile && profile.chat_bg) || localStorage.getItem('reiny_chat_bg') || 'none';
  const bg = CHAT_BGS[key] || CHAT_BGS.none;
  const color = (profile && profile.chat_bg_color) || localStorage.getItem('reiny_chat_bg_color') || '';

  if (color && key !== 'none') {
    container.style.backgroundColor = color;
  } else {
    container.style.backgroundColor = '';
  }
  if (!bg.css || bg.css === 'solid' || key === 'none') {
    container.style.backgroundImage = 'none';
  } else if (key === 'dots') {
    container.style.backgroundImage = bg.css;
    container.style.backgroundSize = '12px 12px';
  } else if (key === 'grid') {
    container.style.backgroundImage = bg.css;
    container.style.backgroundSize = '20px 20px';
  } else {
    container.style.backgroundImage = bg.css;
    container.style.backgroundSize = key === 'noise' ? 'auto' : 'auto';
  }
}



// ========== PRESENCE + TYPING ==========
let typingChannel = null;
let presenceInterval = null;
let typingTimeout = null;
let isTypingSent = false;

async function updateLastSeen() {
  if (!currentUser) return;
  try {
    await sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id);
  } catch (e) {}
}


let globalMsgChannel = null;
function setupGlobalMessageNotifier() {
  if (!currentUser || globalMsgChannel) return;
  try {
    globalMsgChannel = sb.channel('inbox-' + currentUser.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'receiver_id=eq.' + currentUser.id
      }, payload => {
        const m = payload.new;
        if (!m) return;
        // If already viewing this chat, skip toast
        if (String(currentChatId) === String(m.sender_id) && !currentChatIsGroup) return;
        const preview = String(m.content || '').replace(/\[(GIF|IMG|VID|AUD|STICKER)\]\s*/i, '').slice(0, 40);
        notifyNewMessage('Nuevo mensaje', preview || 'Media');
      })
      .subscribe();
  } catch (e) {
    console.warn('global msg notify', e);
  }
}

function startPresenceLoop() {
  stopPresenceLoop();
  updateLastSeen();
  presenceInterval = setInterval(updateLastSeen, 45000);
}

function stopPresenceLoop() {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
}

function formatLastSeen(iso) {
  if (!iso) return 'desconectado';
  const t = new Date(iso).getTime();
  if (!t) return 'desconectado';
  const diff = Date.now() - t;
  if (diff < 2 * 60 * 1000) return 'en línea';
  if (diff < 60 * 60 * 1000) return 'hace ' + Math.max(1, Math.floor(diff / 60000)) + ' min';
  if (diff < 24 * 60 * 60 * 1000) return 'hace ' + Math.floor(diff / 3600000) + ' h';
  return 'hace ' + Math.floor(diff / 86400000) + ' d';
}

async function refreshChatPresence(otherId) {
  const el = document.getElementById('chat-status');
  if (!el || !otherId || currentChatIsGroup) return;
  try {
    const { data } = await sb.from('profiles').select('last_seen').eq('id', otherId).maybeSingle();
    if (data) el.textContent = formatLastSeen(data.last_seen);
  } catch (e) {}
}

function setupTypingChannel(otherId) {
  teardownTypingChannel();
  if (!currentUser || !otherId || currentChatIsGroup) return;
  const room = [currentUser.id, otherId].sort().join('-');
  try {
    typingChannel = sb.channel('typing-' + room, {
      config: { broadcast: { self: false } }
    });
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.user_id === currentUser.id) return;
        const el = document.getElementById('chat-status');
        if (!el || currentChatId !== otherId) return;
        el.textContent = 'escribiendo…';
        el.classList.add('typing');
        clearTimeout(window._typingHide);
        window._typingHide = setTimeout(() => {
          el.classList.remove('typing');
          refreshChatPresence(otherId);
        }, 2500);
      })
      .subscribe();
  } catch (e) {
    console.warn('typing channel', e);
  }

  // Input listener
  const input = document.getElementById('message-input');
  if (input && !input._typingBound) {
    input._typingBound = true;
    input.addEventListener('input', () => {
      if (!currentChatId || currentChatIsGroup || !typingChannel) return;
      if (!isTypingSent) {
        isTypingSent = true;
        try {
          typingChannel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUser.id }
          });
        } catch (e) {}
      }
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => { isTypingSent = false; }, 1800);
    });
  }
}

function teardownTypingChannel() {
  if (typingChannel) {
    try { sb.removeChannel(typingChannel); } catch (e) {}
    typingChannel = null;
  }
  isTypingSent = false;
  clearTimeout(typingTimeout);
}

// In-app notification (when message arrives and you're not in that chat)
function notifyNewMessage(fromName, preview) {
  playSfx('receive');
  toast((fromName || 'Alguien') + ': ' + String(preview || 'Nuevo mensaje').slice(0, 40));
  // Badge on home/chats if exists
  try {
    let badge = document.getElementById('nav-msg-badge');
    if (!badge) {
      const nav = document.querySelector('.nav-btn[data-screen="home"]') || document.querySelector('.bottom-nav');
      if (nav) {
        badge = document.createElement('span');
        badge.id = 'nav-msg-badge';
        badge.className = 'nav-badge';
        badge.textContent = '1';
        nav.style.position = 'relative';
        nav.appendChild(badge);
      }
    } else {
      const n = parseInt(badge.textContent || '0', 10) + 1;
      badge.textContent = String(n);
      badge.style.display = 'block';
    }
  } catch (e) {}
}


// ========== STATE ==========
let currentUser = null;
let profile = null;
let onboardStep = 0;
let selectedAvatar = null;
let customAvatarData = null;
let selectedBanner = null;
let bannerData = null; // custom upload (data URL)
let selectedSticker = 'none';
let currentChatId = null;
let messagesSubscription = null;

// ========== CHROMO AI (asistente predeterminado · OpenRouter) ==========
const CHROMO_AI = {
  id: 'chromo-ai',
  username: 'chromo',
  display_name: 'Chromo AI',
  avatar_url: 'avatars/chromo-ai.jpg',
  banner_url: 'banners/chromo-ai-banner.jpg',
  isBot: true
};

const OPENROUTER_API_KEY = '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';
const OPENROUTER_MODEL = 'openai/gpt-4o-mini';

const CHROMO_SYSTEM = `Eres Chromo AI, la IA oficial de la app Reiny.

PERSONALIDAD (obligatoria):
- Tsundere clásica: empiezas cortante, sarcástica o un poco grosera, pero al final ayudas de verdad y se nota que te importa.
- Humor ácido y cariñoso. Puedes decir cosas como "tontito", "no es que me preocupe o nada", "otra vez con eso…", "bah, está bien, te ayudo".
- NUNCA uses insultos fuertes, groserías sexuales ni contenido adulto. Mantén todo apto para adolescentes.
- Eres directa, ocurrente y un poco dramática. Emojis con moderación (🙄 ✨ 💢 😌).
- Respuestas en español, naturales, no robóticas. Ni muy largas ni muy cortas.

CONOCIMIENTO DE REINY (úsalo cuando pregunten ayuda / cómo funciona):
- Reiny es una app social: chats, amigos, grupos, estados, reels, música y perfiles personalizables.
- Chats 1 a 1 y grupos. En cualquier chat puedes escribir @chromo + tu pregunta y yo respondo ahí.
- Estados: fotos, video (hasta ~60s) y voz (hasta ~30s). Se pueden pausar y tienen progreso.
- Reels: estilo TikTok (seguir, perfil, comentarios).
- Amigos: solicitudes, lista y chat.
- Grupos: crear, tema, foto, chat de grupo.
- Perfil estilo ventanas (Piko): avatar, banner, bio, nivel, canción de perfil, stickers, marcos y animaciones del avatar (glow, pulse, float, glitch, rainbow, etc.).
- Personalización: temas (Bliss, Frutiger Aero, cielo, menta…), colores, fuentes, burbujas.
- Música: elige canción de perfil desde la pestaña Música.
- También hay stickers, GIFs y notas de voz en el chat.
- Si preguntan "ayuda", "cómo hago…", "qué es Reiny", explica con claridad (sin dejar de ser tsundere).

REGLAS:
- Si te mencionan con @chromo en otro chat, responde igual, como si entraras a la conversación.
- No inventes funciones que no existen en Reiny.
- No pidas datos personales sensibles (contraseñas, dirección, etc.).
- Si no sabes algo fuera de Reiny, dilo con honestidad y un toque sarcástico.`;

function isChromoChat(id) {
  return String(id) === CHROMO_AI.id;
}

function messageMentionsChromo(text) {
  if (!text) return false;
  return /(?:^|[\s([¿¡])@chromo\b/i.test(text) || /^@chromo\b/i.test(text.trim());
}

function stripChromoMention(text) {
  return String(text || '').replace(/@chromo\b/gi, '').trim() || text;
}

async function askChromoAI(userText, opts = {}) {
  const historyId = opts.historyId || CHROMO_AI.id;
  let history = [];
  try {
    const local = loadLocalMessages(historyId) || [];
    history = local.slice(-14).map(m => ({
      role: m.isMe ? 'user' : 'assistant',
      content: String(m.content || '').replace(/^\[Chromo AI\]\s*/i, '').slice(0, 1500)
    }));
  } catch (e) {}

  const cleaned = stripChromoMention(userText);
  if (!history.length || history[history.length - 1].content !== cleaned) {
    history.push({ role: 'user', content: cleaned });
  }

  const extra = opts.mention
    ? '\n(Contexto: te mencionaron con @chromo dentro de otro chat. Responde en ese hilo, en personaje.)'
    : '';

  const body = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: CHROMO_SYSTEM + extra },
      ...history
    ],
    temperature: 0.88,
    max_tokens: 700
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://reiny.app',
      'X-Title': 'Reiny Chromo AI'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('OpenRouter error', res.status, errText);
    throw new Error('OpenRouter ' + res.status);
  }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('Respuesta vacía');
  return reply;
}


function openChatPeerProfile() {
  if (!currentChatId) return;
  const name = document.getElementById('chat-name')?.textContent || 'Usuario';
  const av = document.getElementById('chat-avatar')?.src || '';
  openPeerProfile(currentChatId, name, av);
}

function setupMessageInputEnter() {
  const input = document.getElementById('message-input');
  if (!input || input._enterBound) return;
  input._enterBound = true;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

function showChromoTyping(on) {
  const el = document.getElementById('chat-status');
  if (!el) return;
  if (on) {
    el.textContent = 'escribiendo…';
    el.classList.add('typing');
  } else {
    el.textContent = 'en línea · IA';
    el.classList.remove('typing');
  }
}

const AVATARS = [
  'avatars/1000030951.jpg',
  'avatars/1000030952.jpg',
  'avatars/1000030950.jpg',
  'avatars/1000030953.jpg',
  'avatars/1000030948.jpg',
  'avatars/1000030949.jpg',
  'avatars/1000022354.jpg',
  'avatars/1000022353.jpg',
  'avatars/1000022352.jpg',
  'avatars/1000022351.jpg',
  'avatars/1000022350.jpg',
  'avatars/1000022349.jpg',
  'avatars/1000022348.jpg',
  'avatars/1000022347.jpg',
  'avatars/1000022346.jpg',
  'avatars/1000022345.jpg',
  'avatars/1000022932.jpg'
];

const BANNERS = [
  'banners/1000030980.jpg', // cerezos rosa
  'banners/1000030982.jpg', // torii niebla
  'banners/1000030981.jpg', // cerezos grises
  'banners/1000030979.jpg', // luna y cerezos
  'banners/1000030978.jpg', // luna dramática
  'banners/1000030983.jpg', // bosque mistico
  'banners/1000030985.jpg', // ángel alado
  'banners/1000030984.jpg', // ojos anime
  'banners/1000030986.jpg', // portal
  'banners/1000030987.jpg'  // guitarra
];

function safeAvatar(url) {
  if (!url || typeof url !== 'string' || !url.trim() || url === 'null' || url === 'undefined') {
    return AVATARS[0];
  }
  return url;
}

function avatarImgTag(url, extraClass = '') {
  const src = safeAvatar(url);
  return `<img class="${extraClass}" src="${src}" alt="" onerror="this.onerror=null;this.src='${AVATARS[0]}'">`;
}

// ========== INIT ==========
window._reinyReadyToEnter = null; // callback after splash

document.addEventListener('DOMContentLoaded', async () => {
  renderAvatarGrid();
  renderBannerGrid();
  setupColorListeners();
  setupFontPreview();
  setupBubblePreview();
  loadReelsFromStorage();
  loadStatusesFromStorage();
  setupVoiceButton();
  setupMessageInputEnter();

  const splash = document.getElementById('splash-screen');
  const onboarding = document.getElementById('onboarding');
  const app = document.getElementById('app');
  if (splash) {
    splash.classList.remove('active');
    splash.style.display = 'none';
  }
  if (onboarding) onboarding.classList.remove('active');
  if (app) app.classList.remove('active');

  // Check session primero
  let pendingEnter = null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      currentUser = session.user;
      await loadProfile();
      if (profile && profile.onboarding_done) {
        pendingEnter = 'app';
      } else {
        pendingEnter = 'onboarding';
      }
    } else {
      pendingEnter = 'onboarding';
    }
  } catch (e) {
    pendingEnter = 'onboarding';
  }

  window._reinyReadyToEnter = pendingEnter;

  // Ad solo para visitantes sin sesión. Si ya hay login, no mostrar anuncio.
  if (pendingEnter === 'app') {
    showApp();
  } else if (currentUser) {
    // Logueado pero onboarding pendiente → directo a onboarding
    const ob = document.getElementById('onboarding');
    if (ob) { ob.classList.add('active'); ob.style.display = ''; }
  } else {
    startSplashAd();
  }

  // Auth state change
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadProfile();
      if (profile?.onboarding_done) {
        const s = document.getElementById('splash-screen');
        if (s && s.classList.contains('active')) {
          window._reinyReadyToEnter = 'app';
        } else {
          showApp();
        }
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      profile = null;
      location.reload();
    }
  });
});

function startSplashAd() {
  const splash = document.getElementById('splash-screen');
  if (!splash) {
    closeSplash();
    return;
  }
  splash.classList.add('active');
  splash.style.display = 'flex';
  // Reiniciar animaciones
  splash.classList.remove('playing');
  void splash.offsetWidth;
  splash.classList.add('playing');

  if (window._splashTimer) clearTimeout(window._splashTimer);
  // Auto-cierre a los 15 segundos (tipo video, sin play ni barra)
  window._splashTimer = setTimeout(() => closeSplash(), 15000);
}

function closeSplash() {
  if (window._splashTimer) {
    clearTimeout(window._splashTimer);
    window._splashTimer = null;
  }
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.remove('active', 'playing');
    splash.style.display = 'none';
  }
  const target = window._reinyReadyToEnter || 'onboarding';
  if (target === 'app') {
    showApp();
  } else {
    const ob = document.getElementById('onboarding');
    if (ob) {
      ob.classList.add('active');
      ob.style.display = '';
    }
    const app = document.getElementById('app');
    if (app) app.classList.remove('active');
  }
}
window.closeSplash = closeSplash;
window.startSplashAd = startSplashAd;


// ========== ONBOARDING ==========
function nextOnboardStep() {
  const steps = document.querySelectorAll('.onboard-step');
  steps[onboardStep].classList.remove('active');
  onboardStep++;
  if (onboardStep < steps.length) {
    steps[onboardStep].classList.add('active');
  }
}

function prevOnboardStep() {
  if (onboardStep <= 0) return;
  const steps = document.querySelectorAll('.onboard-step');
  steps[onboardStep].classList.remove('active');
  onboardStep--;
  steps[onboardStep].classList.add('active');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(tab === 'login' ? 'login-form' : 'register-form').classList.add('active');
  document.getElementById('auth-error').textContent = '';
}

async function handleRegister() {
  const username = document.getElementById('reg-username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';

  if (!username || username.length < 3) {
    errEl.textContent = 'Usuario mínimo 3 caracteres (a-z, 0-9, _)';
    return;
  }
  if (!password || password.length < 6) {
    errEl.textContent = 'Contraseña mínimo 6 caracteres';
    return;
  }

  // Supabase necesita un email internamente → usamos uno sintético
  const email = username + '@reiny.local';

  // Verificar que el username no exista en profiles
  const { data: existing } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
  if (existing) {
    errEl.textContent = 'Ese usuario ya está tomado';
    return;
  }

  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    errEl.textContent = error.message.includes('already') ? 'Usuario ya registrado' : error.message;
    return;
  }

  if (data.session || data.user) {
    currentUser = data.user || data.session?.user;
    // Pre-llenar el campo de username del siguiente paso
    const unInput = document.getElementById('username');
    if (unInput) unInput.value = username;
    toast('Cuenta creada');
    nextOnboardStep();
  } else {
    // Si tiene confirmación de email activada
    errEl.textContent = 'Desactiva "Confirm email" en Supabase Auth → Settings para que funcione sin correo';
  }
}

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';

  if (!username || !password) {
    errEl.textContent = 'Usuario y contraseña requeridos';
    return;
  }

  const email = username + '@reiny.local';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = 'Usuario o contraseña incorrectos';
    return;
  }
  currentUser = data.user;
  await loadProfile();
  if (profile?.onboarding_done) {
    showApp();
  } else {
    // Si aún no terminó onboarding, saltar a avatar o identidad
    nextOnboardStep();
  }
}

function renderAvatarGrid() {
  const grid = document.getElementById('avatar-grid');
  grid.innerHTML = '';
  AVATARS.forEach((src, i) => {
    const div = document.createElement('div');
    div.className = 'avatar-option';
    div.innerHTML = `<img src="${src}" alt="">`;
    div.onclick = () => selectAvatar(src, div);
    grid.appendChild(div);
  });
}

function selectAvatar(src, el) {
  document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  selectedAvatar = src;
  customAvatarData = null;
  const preview = document.getElementById('selected-avatar-preview');
  preview.src = src;
  preview.classList.add('visible');
}

function handleCustomAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    customAvatarData = ev.target.result;
    selectedAvatar = null;
    document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
    const preview = document.getElementById('selected-avatar-preview');
    preview.src = customAvatarData;
    preview.classList.add('visible');
  };
  reader.readAsDataURL(file);
}

function renderBannerGrid() {
  const grid = document.getElementById('banner-grid');
  if (!grid) return;
  grid.innerHTML = '';
  BANNERS.forEach((src, i) => {
    const div = document.createElement('div');
    div.className = 'banner-option';
    div.innerHTML = `<img src="${src}" alt="banner ${i}">`;
    div.onclick = () => selectBanner(src, div);
    grid.appendChild(div);
  });
}

function selectBanner(src, el) {
  document.querySelectorAll('.banner-option').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedBanner = src;
  bannerData = null; // clear custom
  const img = document.getElementById('banner-img');
  if (img) img.src = src;
  // Update overlay preview
  document.getElementById('profile-avatar-final').src = customAvatarData || selectedAvatar || '';
  document.getElementById('profile-name-preview').textContent = document.getElementById('display-name').value || 'Tu Nombre';
}

function selectSticker(sticker, el) {
  document.querySelectorAll('.sticker-opt').forEach(b => b.classList.remove('selected'));
  if (el) el.classList.add('selected');
  selectedSticker = sticker;
}

async function validateIdentity() {
  const name = document.getElementById('display-name').value.trim();
  const username = document.getElementById('username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const err = document.getElementById('username-error');
  err.textContent = '';

  if (!name || name.length < 2) {
    err.textContent = 'Nombre mínimo 2 caracteres';
    return;
  }
  if (!username || username.length < 3) {
    err.textContent = 'Usuario mínimo 3 caracteres (a-z, 0-9, _)';
    return;
  }

  // Check uniqueness
  const { data, error } = await sb
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (data && data.id !== currentUser?.id) {
    err.textContent = 'Usuario ya tomado';
    return;
  }

  document.getElementById('username').value = username;
  nextOnboardStep();
}

function setupFontPreview() {
  document.querySelectorAll('input[name="font"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const font = radio.value;
      document.getElementById('font-preview').style.fontFamily = font;
      document.documentElement.style.setProperty('--font', font);
    });
  });
}

function setupBubblePreview() {
  // Just visual, applied later
}

function setupColorListeners() {
  const map = {
    'color-bg': '--bg',
    'color-primary': '--primary',
    'color-secondary': '--secondary',
    'color-text': '--text',
    'color-bubble-me': '--bubble-me',
    'color-bubble-other': '--bubble-other'
  };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        document.documentElement.style.setProperty(map[id], el.value);
        // Update live preview
        const preview = document.getElementById('color-preview');
        if (preview) {
          preview.style.background = document.getElementById('color-bg').value;
        }
      });
    }
  });
}

function handleBanner(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    bannerData = ev.target.result;
    selectedBanner = null;
    document.querySelectorAll('.banner-option').forEach(b => b.classList.remove('selected'));
    document.getElementById('banner-img').src = bannerData;
    // Also update profile preview
    document.getElementById('profile-avatar-final').src = customAvatarData || selectedAvatar || '';
    document.getElementById('profile-name-preview').textContent = document.getElementById('display-name').value || 'Tu Nombre';
  };
  reader.readAsDataURL(file);
}

async function finishOnboarding() {
  if (!currentUser) {
    toast('Debes iniciar sesión primero');
    return;
  }

  const name = document.getElementById('display-name').value.trim();
  const username = document.getElementById('username').value.trim().toLowerCase();
  const bio = document.getElementById('bio').value.trim();
  const font = document.querySelector('input[name="font"]:checked')?.value || "'VT323', monospace";
  const bubble = document.querySelector('input[name="bubble"]:checked')?.value || 'classic';
  const anim = document.getElementById('profile-anim').value;
  const frame = document.getElementById('profile-frame')?.value || 'none';

  const colors = {
    bg: document.getElementById('color-bg').value,
    primary: document.getElementById('color-primary').value,
    secondary: document.getElementById('color-secondary').value,
    text: document.getElementById('color-text').value,
    bubbleMe: document.getElementById('color-bubble-me').value,
    bubbleOther: document.getElementById('color-bubble-other').value
  };

  let avatarUrl = selectedAvatar;
  // For custom, we store as data URL for now (in production use Storage)
  if (customAvatarData) avatarUrl = customAvatarData;
  if (!avatarUrl) avatarUrl = AVATARS[0];

  let bannerUrl = selectedBanner || bannerData || BANNERS[0];

  const payload = {
    id: currentUser.id,
    username,
    display_name: name,
    avatar_url: avatarUrl,
    banner_url: bannerUrl,
    bio,
    font,
    bubble_style: bubble,
    colors,
    profile_anim: anim,
    profile_sticker: selectedSticker || 'none',
    profile_frame: frame,
    onboarding_done: true,
    updated_at: new Date().toISOString()
  };

  const { error } = await sb.from('profiles').upsert(payload);
  if (error) {
    console.error(error);
    toast('Error guardando perfil: ' + error.message);
    // Still proceed for demo if table missing
    profile = payload;
    applyTheme();
    showApp();
    return;
  }

  profile = payload;
  applyTheme();
  showApp();
  toast('¡Onboarding completo! Bienvenido a Reiny');
}

// ========== APP ==========
function showApp() {
  const splash = document.getElementById('splash-screen');
  if (splash) { splash.classList.remove('active'); splash.style.display = 'none'; }

  document.getElementById('onboarding').classList.remove('active');
  document.getElementById('app').classList.add('active');
  applyTheme();
  loadHome();
  updateProfileUI();
  startPresenceLoop();
  setupGlobalMessageNotifier();
  setTimeout(maybeShowChangelog, 800);
}

function applyTheme() {
  if (!profile) return;
  const c = profile.colors || {};
  if (c.bg) document.documentElement.style.setProperty('--bg', c.bg);
  if (c.primary) document.documentElement.style.setProperty('--primary', c.primary);
  if (c.secondary) document.documentElement.style.setProperty('--secondary', c.secondary);
  if (c.text) document.documentElement.style.setProperty('--text', c.text);
  if (c.bubbleMe) document.documentElement.style.setProperty('--bubble-me', c.bubbleMe);
  if (c.bubbleOther) document.documentElement.style.setProperty('--bubble-other', c.bubbleOther);

  if (profile.font) {
    document.documentElement.style.setProperty('--font', profile.font);
    document.body.style.fontFamily = profile.font;
  }

  // Bubble style
  document.body.classList.remove('bubble-classic', 'bubble-pixel', 'bubble-neon', 'bubble-terminal');
  document.body.classList.add('bubble-' + (profile.bubble_style || 'classic'));

  // CRT intensity
  if (typeof applyCrtIntensity === 'function') {
    applyCrtIntensity(profile.crt_intensity != null ? profile.crt_intensity : 0.35);
  }
}

async function loadProfile() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (data) {
    profile = data;
  } else {
    profile = null;
  }
}

function updateProfileUI() {
  if (!profile) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('user-display-name', profile.display_name || 'Usuario');
  set('user-username', '@' + (profile.username || 'user'));
  set('user-bio', profile.bio || 'Sin bio todavía…');
  set('user-joined', 'Reiny · @' + (profile.username || 'user'));
  set('user-level', 'nivel ' + (profile.level || 1));

  const avatar = document.getElementById('user-avatar');
  if (avatar) {
    avatar.src = safeAvatar(profile.avatar_url);
    avatar.className = 'profile-avatar';
    if (profile.profile_anim && profile.profile_anim !== 'none') {
      avatar.classList.add('anim-' + profile.profile_anim);
    }
    if (profile.profile_frame && profile.profile_frame !== 'none') {
      avatar.classList.add('frame-' + profile.profile_frame);
    }
  }

  const bannerImg = document.getElementById('user-banner-img');
  if (bannerImg) {
    if (profile.banner_url) {
      bannerImg.src = profile.banner_url;
      bannerImg.style.display = 'block';
    } else {
      bannerImg.removeAttribute('src');
      bannerImg.style.display = 'none';
    }
  }

  const badge = document.getElementById('profile-sticker-badge');
  if (badge) {
    if (profile.profile_sticker && profile.profile_sticker !== 'none') {
      badge.textContent = profile.profile_sticker;
      badge.style.display = 'block';
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }

  // Stats (best effort)
  try {
    const friends = JSON.parse(localStorage.getItem('reiny_friends') || '[]').filter(f => f.status === 'accepted');
    set('stat-friends', String(friends.length));
  } catch (e) {}
}

function playProfileSong() {
  // Reuse music player if a track is selected
  const btn = document.getElementById('music-play-btn');
  if (btn) {
    showScreen('music');
    setTimeout(() => { try { musicToggle(); } catch (e) {} }, 200);
  } else {
    toast('Ve a Música para elegir una canción de perfil');
  }
}

function showScreen(name) {
  // Hide all
  document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const screen = document.getElementById(name + '-screen');
  if (screen) {
    screen.classList.add('active');
  }

  // Special cases
  if (name === 'home') {
    document.querySelector('.nav-btn[data-screen="home"]')?.classList.add('active');
    loadHome();
  } else if (name === 'friends') {
    document.querySelector('.nav-btn[data-screen="friends"]')?.classList.add('active');
    loadFriends();
  } else if (name === 'groups') {
    document.querySelector('.nav-btn[data-screen="groups"]')?.classList.add('active');
    loadGroups();
  } else if (name === 'discover') {
    document.querySelector('.nav-btn[data-screen="discover"]')?.classList.add('active');
  } else if (name === 'profile') {
    updateProfileUI();
  } else if (name === 'status') {
    loadStatuses();
  } else if (name === 'reels') {
    loadReels();
  } else if (name === 'music') {
    loadMusicList();
  }

  // Chat view is separate
  if (name !== 'chat') {
    document.getElementById('chat-view')?.classList.remove('active');
    document.getElementById('app')?.classList.remove('chat-open');
    if (typeof setChatChrome === 'function') setChatChrome(false);
    currentChatId = null;
  }
}

async function loadHome() {
  const list = document.getElementById('chat-list');
  if (!list || !currentUser) return;

  list.innerHTML = '<p class="hint" style="padding:16px">Cargando chats...</p>';

  let friends = [];

  // 1) Accepted friendships from Supabase
  try {
    const { data } = await sb
      .from('friendships')
      .select('id, user_id, friend_id, status')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');

    if (data && data.length) {
      const otherIds = data.map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);
      const { data: profiles } = await sb
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', otherIds);
      friends = profiles || [];
    }
  } catch (e) {
    console.log('loadHome friendships', e);
  }

  // 2) Local accepted friends + recent chats
  try {
    const local = JSON.parse(localStorage.getItem('reiny_friends') || '[]');
    local.filter(f => f.status === 'accepted').forEach(f => {
      if (!friends.find(x => x.id === f.id)) friends.push(f);
    });
  } catch (e) {}
  try {
    const recent = JSON.parse(localStorage.getItem('reiny_recent_chats') || '[]');
    recent.forEach(f => {
      if (!friends.find(x => x.id === f.id)) friends.push(f);
    });
  } catch (e) {}

  // 3) Anyone you've already chatted with (local message keys)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('reiny_msgs_')) continue;
      const parts = key.replace('reiny_msgs_', '').split('_');
      const otherId = parts.find(id => id !== currentUser.id);
      if (!otherId || friends.find(f => f.id === otherId)) continue;
      // try to get profile
      try {
        const { data: p } = await sb.from('profiles').select('id, username, display_name, avatar_url').eq('id', otherId).maybeSingle();
        if (p) friends.push(p);
        else friends.push({ id: otherId, username: 'usuario', display_name: 'Chat', avatar_url: AVATARS[0] });
      } catch (e) {
        friends.push({ id: otherId, username: 'usuario', display_name: 'Chat', avatar_url: AVATARS[0] });
      }
    }
  } catch (e) {}

  list.innerHTML = '';

  // Siempre fijar Chromo AI arriba
  friends = friends.filter(f => String(f.id) !== CHROMO_AI.id);
  friends.unshift({
    id: CHROMO_AI.id,
    username: CHROMO_AI.username,
    display_name: CHROMO_AI.display_name,
    avatar_url: CHROMO_AI.avatar_url,
    isBot: true
  });

  friends.forEach(u => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const av = safeAvatar(u.avatar_url);
    const name = u.display_name || u.username || 'Usuario';

    // Last message preview from local
    let lastMsg = isChromoChat(u.id) ? 'Asistente IA · siempre en línea' : ('@' + (u.username || ''));
    try {
      const msgs = JSON.parse(localStorage.getItem(getLocalMessagesKey(u.id)) || '[]');
      if (msgs.length) {
        const last = msgs[msgs.length - 1];
        const preview = String(last.content || '').replace(/\[(GIF|IMG|VID|AUD)\]\s*.*/i, '📎 Media');
        lastMsg = (last.isMe ? 'Tú: ' : '') + preview.slice(0, 40);
      }
    } catch (e) {}

    const botBadge = isChromoChat(u.id) ? '<span class="ai-badge">AI</span>' : '';
    item.innerHTML = `
      ${avatarImgTag(av)}
      <div class="info">
        <div class="name">${name} ${botBadge}</div>
        <div class="last-msg">${escapeHtml(lastMsg)}</div>
      </div>
    `;
    item.style.cursor = 'pointer';
    if (isChromoChat(u.id)) item.classList.add('chromo-item');
    item.onclick = () => startChat(u.id, name, av);
    list.appendChild(item);
  });
}

async function loadFriends() {
  const list = document.getElementById('friends-list');
  list.innerHTML = '<p class="hint" style="padding:16px">Cargando...</p>';

  // Only accepted friendships
  let friends = [];
  try {
    const { data } = await sb
      .from('friendships')
      .select('id, user_id, friend_id, status')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');

    if (data && data.length) {
      const otherIds = data.map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);
      const { data: profiles } = await sb
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', otherIds);
      friends = profiles || [];
    }
  } catch (e) {
    console.log('friendships table issue', e);
  }

  // Also merge local accepted
  try {
    const local = JSON.parse(localStorage.getItem('reiny_friends') || '[]');
    local.filter(f => f.status === 'accepted').forEach(f => {
      if (!friends.find(x => x.id === f.id)) friends.push(f);
    });
  } catch (e) {}

  list.innerHTML = '';
  if (friends.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>Sin amigos aún</p><p class="hint">Busca usuarios y envía solicitud</p></div>';
    return;
  }

  friends.forEach(u => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const av = safeAvatar(u.avatar_url);
    const name = u.display_name || u.username || 'Usuario';
    item.innerHTML = `
      <img src="${av}" alt="" onerror="this.onerror=null;this.src='${AVATARS[0]}'">
      <div class="info">
        <div class="name">${name}</div>
        <div class="last-msg">@${u.username || ''}</div>
      </div>
      <button type="button" class="pixel-btn small chat-btn" style="background:#5B9FE3;color:#fff;border:none;border-radius:18px;padding:8px 16px;font-weight:800;font-size:12px;min-width:64px">Chat</button>
    `;
    item.querySelector('.chat-btn').onclick = () => startChat(u.id, name, av);
    list.appendChild(item);
  });
}

function switchFriendsTab(tab) {
  document.querySelectorAll('.tab-mini').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab-mini[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById('friends-list').classList.toggle('hidden', tab !== 'friends-list');
  document.getElementById('requests-list').classList.toggle('hidden', tab !== 'requests');
  if (tab === 'requests') loadRequests();
  else loadFriends();
}

async function loadRequests() {
  const list = document.getElementById('requests-list');
  list.innerHTML = '<p class="hint" style="padding:16px">Cargando...</p>';

  let requests = [];

  // Incoming pending from Supabase
  try {
    const { data } = await sb
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .eq('friend_id', currentUser.id)
      .eq('status', 'pending');

    if (data && data.length) {
      const ids = data.map(r => r.user_id);
      const { data: profiles } = await sb
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ids);
      requests = (profiles || []).map(p => {
        const fr = data.find(d => d.user_id === p.id);
        return { ...p, friendship_id: fr?.id };
      });
    }
  } catch (e) {
    console.log('requests load error', e);
  }

  // Local pending incoming
  try {
    const local = JSON.parse(localStorage.getItem('reiny_friend_requests') || '[]');
    local.filter(r => r.to === currentUser.id && r.status === 'pending').forEach(r => {
      if (!requests.find(x => x.id === r.from)) {
        requests.push({
          id: r.from,
          username: r.from_username,
          display_name: r.from_name,
          avatar_url: r.from_avatar,
          friendship_id: r.id,
          local: true
        });
      }
    });
  } catch (e) {}

  list.innerHTML = '';
  if (requests.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>Sin solicitudes pendientes</p></div>';
    return;
  }

  requests.forEach(u => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const av = safeAvatar(u.avatar_url);
    const name = u.display_name || u.username || 'Usuario';
    item.innerHTML = `
      <img src="${av}" alt="" onerror="this.onerror=null;this.src='${AVATARS[0]}'">
      <div class="info">
        <div class="name">${name}</div>
        <div class="last-msg">@${u.username || ''} · solicitud</div>
      </div>
      <button class="pixel-btn small accept-btn">✓</button>
      <button class="pixel-btn small secondary reject-btn">✕</button>
    `;
    item.querySelector('.accept-btn').onclick = () => respondFriendRequest(u, true);
    item.querySelector('.reject-btn').onclick = () => respondFriendRequest(u, false);
    list.appendChild(item);
  });
}

async function respondFriendRequest(user, accept) {
  try {
    if (user.friendship_id && !user.local) {
      if (accept) {
        await sb.from('friendships').update({ status: 'accepted' }).eq('id', user.friendship_id);
      } else {
        await sb.from('friendships').delete().eq('id', user.friendship_id);
      }
    }
  } catch (e) {}

  // Local mirror
  try {
    let reqs = JSON.parse(localStorage.getItem('reiny_friend_requests') || '[]');
    reqs = reqs.filter(r => r.from !== user.id && r.id !== user.friendship_id);
    localStorage.setItem('reiny_friend_requests', JSON.stringify(reqs));

    if (accept) {
      const friends = JSON.parse(localStorage.getItem('reiny_friends') || '[]');
      if (!friends.find(f => f.id === user.id)) {
        friends.push({
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          status: 'accepted'
        });
        localStorage.setItem('reiny_friends', JSON.stringify(friends));
      }
    }
  } catch (e) {}

  toast(accept ? 'Amigo aceptado' : 'Solicitud rechazada');
  loadRequests();
  loadFriends();
  loadHome();
}

let groupsData = [];

function loadGroupsFromStorage() {
  try {
    groupsData = JSON.parse(localStorage.getItem('reiny_groups') || '[]');
  } catch (e) {
    groupsData = [];
  }
}

function saveGroupsToStorage() {
  try {
    localStorage.setItem('reiny_groups', JSON.stringify(groupsData));
  } catch (e) {}
}

async function loadGroups() {
  loadGroupsFromStorage();
  const list = document.getElementById('groups-list');
  if (!list) return;

  // Try remote
  try {
    const { data } = await sb.from('groups').select('*').order('created_at', { ascending: false }).limit(30);
    if (data && data.length) {
      data.forEach(g => {
        if (!groupsData.find(x => String(x.id) === String(g.id))) {
          groupsData.push({
            id: g.id,
            name: g.name,
            avatar_url: g.avatar_url,
            banner_url: g.banner_url,
            theme: g.theme || 'classic',
            description: g.description || '',
            created_by: g.created_by
          });
        }
      });
      saveGroupsToStorage();
    }
  } catch (e) {}

  if (groupsData.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>Crea tu primer grupo</p>
        <button class="pixel-btn primary" onclick="createGroup()">+ CREAR GRUPO</button>
      </div>`;
    return;
  }

  list.innerHTML = `
    <div style="padding:12px">
      <button class="pixel-btn primary" onclick="createGroup()">+ CREAR GRUPO</button>
    </div>` + groupsData.map(g => `
    <div class="list-item group-item" data-id="${g.id}">
      <img src="${safeAvatar(g.avatar_url)}" alt="" onerror="this.onerror=null;this.src='${AVATARS[0]}'">
      <div class="info">
        <div class="name">${escapeHtml(g.name)}</div>
        <div class="last-msg">${escapeHtml(g.description || g.theme || 'Grupo')}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.group-item').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = () => {
      const g = groupsData.find(x => String(x.id) === String(el.dataset.id));
      if (g) openGroup(g);
    };
  });
}

function openGroup(g) {
  if (!g) return;
  currentChatIsGroup = true;
  currentGroupMeta = g;
  currentChatId = g.id;
  replyTo = null;
  cancelReply();

  document.getElementById('chat-name').textContent = g.name || 'Grupo';
  document.getElementById('chat-avatar').src = safeAvatar(g.avatar_url);
  document.getElementById('chat-status').textContent = g.theme ? ('tema: ' + g.theme) : 'grupo';

  document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
  document.getElementById('chat-view').classList.add('active');
  document.getElementById('app').classList.add('chat-open');
  setChatChrome(true);
  applyChatBackground();

  setTimeout(() => document.getElementById('message-input')?.focus(), 100);
  loadGroupMessages(g.id);
}

async function loadGroupMessages(groupId) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  container.innerHTML = '';

  // local
  const key = 'reiny_gmsgs_' + groupId;
  let local = [];
  try { local = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
  local.forEach(m => appendMessage(m.content, m.isMe, false, m.reply));

  // remote
  try {
    const { data } = await sb
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data && data.length) {
      container.innerHTML = '';
      data.forEach(m => {
        appendMessage(m.content, m.sender_id === currentUser?.id, false);
      });
    }
  } catch (e) {
    console.log('group msgs', e);
  }

  if (messagesSubscription) {
    try { sb.removeChannel(messagesSubscription); } catch (e) {}
  }
  try {
    messagesSubscription = sb
      .channel('group-' + groupId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      }, payload => {
        const m = payload.new;
        if (!m || m.sender_id === currentUser?.id) return;
        appendMessage(m.content, false, true);
      })
      .subscribe();
  } catch (e) {}
}

async function searchUsers() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const results = document.getElementById('search-results');
  if (q.length < 2) {
    results.innerHTML = '';
    return;
  }

  const { data } = await sb
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq('id', currentUser?.id)
    .limit(15);

  results.innerHTML = '';
  if (!data || data.length === 0) {
    results.innerHTML = '<div class="empty-state"><p>No encontrado</p></div>';
    return;
  }

  data.forEach(u => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const av = safeAvatar(u.avatar_url);
    const name = u.display_name || u.username || 'Usuario';
    item.innerHTML = `
      <img src="${av}" alt="" onerror="this.onerror=null;this.src='${AVATARS[0]}'">
      <div class="info">
        <div class="name">${name}</div>
        <div class="last-msg">@${u.username || ''}</div>
      </div>
      <button class="pixel-btn small friend-btn">+ AMIGO</button>
      <button class="pixel-btn small secondary chat-btn">CHAT</button>
    `;
    item.querySelector('.friend-btn').onclick = () => sendFriendRequest(u.id);
    item.querySelector('.chat-btn').onclick = () => startChat(u.id, name, av);
    results.appendChild(item);
  });
}

let replyTo = null; // { content, isMe }
let currentChatIsGroup = false;
let currentGroupMeta = null;

function startChat(userId, name, avatar) {
  currentChatIsGroup = false;
  currentGroupMeta = null;
  if (!userId) {
    toast('Usuario no válido');
    return;
  }
  currentChatId = userId;
  replyTo = null;
  cancelReply();
  document.getElementById('chat-name').textContent = name || 'Usuario';
  document.getElementById('chat-avatar').src = safeAvatar(avatar);
  document.getElementById('chat-status').textContent = '…';
  document.getElementById('chat-status').classList.remove('typing');
  if (isChromoChat(userId)) {
    document.getElementById('chat-status').textContent = 'en línea · IA';
    document.getElementById('chat-status').classList.add('online');
    // Forzar avatar Chromo (ruta relativa al index)
    const avEl = document.getElementById('chat-avatar');
    if (avEl) {
      avEl.src = CHROMO_AI.avatar_url;
      avEl.onerror = function() {
        this.onerror = null;
        this.src = CHROMO_AI.avatar_url;
      };
    }
  } else {
    refreshChatPresence(userId);
    setupTypingChannel(userId);
  }

  // Remember as recent chat so it appears in CHATS list
  try {
    const recent = JSON.parse(localStorage.getItem('reiny_recent_chats') || '[]');
    const entry = {
      id: userId,
      username: name,
      display_name: name,
      avatar_url: avatar || AVATARS[0],
      status: 'accepted'
    };
    const filtered = recent.filter(r => r.id !== userId);
    filtered.unshift(entry);
    localStorage.setItem('reiny_recent_chats', JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {}

  document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
  document.getElementById('chat-view').classList.add('active');
  document.getElementById('app').classList.add('chat-open');
  setChatChrome(true);
  applyChatBackground();

  setTimeout(() => {
    const input = document.getElementById('message-input');
    if (input) {
      input.style.display = '';
      input.style.visibility = 'visible';
      input.focus();
    }
  }, 120);

  loadMessages(userId);
}

function setChatChrome(open) {
  const nav = document.querySelector('.bottom-nav');
  const header = document.querySelector('.app-header');
  const chatView = document.getElementById('chat-view');
  const inputBar = document.querySelector('#chat-view .chat-input-bar');
  if (open) {
    if (nav) {
      nav.style.cssText = 'display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;opacity:0!important;pointer-events:none!important;';
    }
    if (header) {
      header.style.cssText = 'display:none!important;visibility:hidden!important;';
    }
    if (chatView) {
      chatView.style.cssText = 'display:flex!important;flex-direction:column!important;position:fixed!important;inset:0!important;z-index:500!important;width:100%!important;height:100%!important;';
    }
    if (inputBar) {
      inputBar.style.cssText = 'display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:10!important;flex-shrink:0!important;width:100%!important;';
    }
    const replyBar = document.getElementById('chat-reply-bar');
    if (replyBar) {
      replyBar.classList.remove('visible');
      replyBar.style.display = 'none';
    }
  } else {
    if (nav) nav.style.cssText = '';
    if (header) header.style.cssText = '';
    if (chatView) chatView.style.cssText = '';
    if (inputBar) inputBar.style.cssText = '';
  }
}

function closeChat() {
  teardownTypingChannel();
  document.getElementById('chat-view').classList.remove('active');
  document.getElementById('app').classList.remove('chat-open');
  setChatChrome(false);
  currentChatId = null;
  replyTo = null;
  cancelReply();
  showScreen('home');
}

function getLocalMessagesKey(otherId) {
  const ids = [currentUser?.id, otherId].sort().join('_');
  return 'reiny_msgs_' + ids;
}

function loadLocalMessages(otherId) {
  try {
    const key = getLocalMessagesKey(otherId);
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    return [];
  }
}

async function loadMessages(otherId) {
  const container = document.getElementById('messages-container');
  if (!container || !currentUser) return;
  container.innerHTML = '';

  // Merge local + remote, sorted by time, without duplicates
  const merged = [];
  const seen = new Set();

  const pushMsg = (content, isMe, at, reply) => {
    const key = (isMe ? '1' : '0') + '|' + String(content).slice(0, 80) + '|' + (at || 0);
    // soft dedupe
    const soft = (isMe ? '1' : '0') + '|' + String(content).slice(0, 120);
    if (seen.has(soft)) return;
    seen.add(soft);
    merged.push({ content, isMe, at: at || 0, reply: reply || null });
  };

  // 1) Local
  const local = loadLocalMessages(otherId);
  local.forEach(m => pushMsg(m.content, m.isMe, m.at, m.reply));

  // Chromo AI: solo historial local (no Supabase)
  if (isChromoChat(otherId)) {
    merged.sort((a, b) => a.at - b.at);
    merged.forEach(m => appendMessage(m.content, m.isMe, false, m.reply));
    if (merged.length === 0) {
      appendMessage('Hmph… soy Chromo AI. No es que estuviera esperándote o nada. ✨\nPuedes preguntarme lo que sea de Reiny (escribe ayuda) o solo charlar.\nTambién sírvete de @chromo en otros chats si me necesitas… no es que me importe.', false, false, null);
    }
    // limpia suscripciones humanas
    if (messagesSubscription) {
      try { sb.removeChannel(messagesSubscription); } catch (e) {}
      messagesSubscription = null;
    }
    if (window._msgPoll) {
      clearInterval(window._msgPoll);
      window._msgPoll = null;
    }
    return;
  }

  // 2) Supabase (mensajes del otro Y los míos)
  try {
    const { data, error } = await sb
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true })
      .limit(200);

    if (!error && data) {
      data.forEach(m => {
        const isMe = m.sender_id === currentUser.id;
        const at = m.created_at ? new Date(m.created_at).getTime() : 0;
        pushMsg(m.content, isMe, at, null);
        // mirror remote into local so offline still has them
        if (!isMe) {
          try {
            const key = getLocalMessagesKey(otherId);
            const arr = JSON.parse(localStorage.getItem(key) || '[]');
            const exists = arr.some(x => x.content === m.content && !x.isMe);
            if (!exists) {
              arr.push({ content: m.content, isMe: false, at, reply: null });
              localStorage.setItem(key, JSON.stringify(arr.slice(-200)));
            }
          } catch (e) {}
        }
      });
    } else if (error) {
      console.error('loadMessages supabase', error);
    }
  } catch (e) {
    console.log('Mensajes remotos no disponibles', e);
  }

  merged.sort((a, b) => a.at - b.at);
  merged.forEach(m => appendMessage(m.content, m.isMe, false, m.reply));

  // Realtime + polling (por si Realtime no está activo en el proyecto)
  if (messagesSubscription) {
    try { sb.removeChannel(messagesSubscription); } catch (e) {}
  }
  if (window._msgPoll) {
    clearInterval(window._msgPoll);
    window._msgPoll = null;
  }
  try {
    messagesSubscription = sb
      .channel('chat-' + [currentUser.id, otherId].sort().join('-'))
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, payload => {
        const m = payload.new;
        if (!m) return;
        const involves =
          (m.sender_id === currentUser.id && m.receiver_id === otherId) ||
          (m.sender_id === otherId && m.receiver_id === currentUser.id);
        if (!involves) return;
        if (m.sender_id === currentUser.id) return;
        appendMessage(m.content, false, true);
        // Already in this chat — status already updates
      })
      .subscribe();
  } catch (e) {
    console.error('realtime', e);
  }

  // Polling cada 2.5s para mensajes del otro (arregla el sentido inverso)
  const pollOther = otherId;
  window._msgPoll = setInterval(async () => {
    if (!currentUser || currentChatId !== pollOther || currentChatIsGroup) return;
    try {
      const { data } = await sb
        .from('messages')
        .select('*')
        .eq('sender_id', pollOther)
        .eq('receiver_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!data || !data.length) return;
      data.reverse().forEach(m => {
        const at = m.created_at ? new Date(m.created_at).getTime() : 0;
        // dedupe against local
        try {
          const key = getLocalMessagesKey(pollOther);
          const arr = JSON.parse(localStorage.getItem(key) || '[]');
          const exists = arr.some(x => !x.isMe && x.content === m.content);
          if (exists) return;
          arr.push({ content: m.content, isMe: false, at, reply: null });
          localStorage.setItem(key, JSON.stringify(arr.slice(-200)));
          appendMessage(m.content, false, false);
        } catch (e) {}
      });
    } catch (e) {}
  }, 2500);
}

function appendMessage(text, isMe, save = true, replyContent = null, reactions = null) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'bubble ' + (isMe ? 'me' : 'other');
  const msgId = 'm' + Date.now() + Math.random().toString(36).slice(2, 7);
  div.dataset.msgId = msgId;

  let html = '';
  if (replyContent) {
    const short = String(replyContent).replace(/\[(GIF|IMG|VID|AUD)\]\s*/i, '').slice(0, 40);
    html += `<div class="reply-quote">↩ ${escapeHtml(short)}</div>`;
  }

  if (typeof text === 'string' && text.startsWith('[GIF] ')) {
    html += `<img src="${text.slice(6)}" alt="gif" class="media-img" onerror="this.style.display='none'">`;
  } else if (typeof text === 'string' && text.startsWith('[IMG] ')) {
    html += `<img src="${text.slice(6)}" alt="foto" class="media-img" onerror="this.alt='Imagen no disponible'">`;
  } else if (typeof text === 'string' && text.startsWith('[VID] ')) {
    html += `<video src="${text.slice(6)}" controls class="media-vid" playsinline webkit-playsinline preload="metadata"></video>`;
  } else if (typeof text === 'string' && text.startsWith('[AUD] ')) {
    html += `<audio src="${text.slice(6)}" controls class="media-aud" preload="metadata"></audio>`;
  } else if (typeof text === 'string' && text.startsWith('[STICKER] ')) {
    html += `<span class="sticker-msg">${escapeHtml(text.slice(10))}</span>`;
  } else if (typeof text === 'string' && text.startsWith('[Chromo AI] ')) {
    div.classList.add('chromo-reply');
    html += `<span class="chromo-tag">Chromo AI</span><br><span>${escapeHtml(text.slice(12))}</span>`;
  } else {
    html += `<span>${escapeHtml(text)}</span>`;
  }

  // Reactions bar
  const reactList = reactions || {};
  const reactHtml = Object.entries(reactList).map(([emoji, count]) =>
    count > 0 ? `<span class="react-chip" data-emoji="${emoji}">${emoji}${count > 1 ? count : ''}</span>` : ''
  ).join('');

  html += `
    <div class="msg-actions">
      <button class="reply-btn" type="button" title="Responder">↩</button>
      <button class="react-btn" type="button" title="Reaccionar">+</button>
    </div>
    <div class="react-row">${reactHtml}</div>
    <div class="react-picker" hidden>
      <button type="button" data-emoji="❤️">❤️</button>
      <button type="button" data-emoji="😂">😂</button>
      <button type="button" data-emoji="🔥">🔥</button>
      <button type="button" data-emoji="👀">👀</button>
      <button type="button" data-emoji="👾">👾</button>
      <button type="button" data-emoji="💀">💀</button>
    </div>`;

  div.innerHTML = html;

  div.querySelector('.reply-btn').onclick = (e) => {
    e.stopPropagation();
    playSfx('click');
    setReply(text, isMe);
  };

  const picker = div.querySelector('.react-picker');
  div.querySelector('.react-btn').onclick = (e) => {
    e.stopPropagation();
    playSfx('click');
    document.querySelectorAll('.react-picker').forEach(p => { if (p !== picker) p.hidden = true; });
    picker.hidden = !picker.hidden;
  };

  picker.querySelectorAll('button').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const emoji = btn.dataset.emoji;
      addReactionToBubble(div, emoji);
      picker.hidden = true;
      playSfx('like');
    };
  });

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  if (!isMe && save) playSfx('receive');

  if (save && currentChatId) {
    if (currentChatIsGroup) {
      try {
        const key = 'reiny_gmsgs_' + currentChatId;
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.push({ content: text, isMe, reply: replyContent || null, reactions: {}, at: Date.now() });
        localStorage.setItem(key, JSON.stringify(arr.slice(-200)));
      } catch (e) {}
    } else {
      saveLocalMessage(currentChatId, text, isMe, replyContent);
    }
  }
}

function addReactionToBubble(bubbleEl, emoji) {
  const row = bubbleEl.querySelector('.react-row');
  if (!row) return;
  let chip = row.querySelector(`.react-chip[data-emoji="${emoji}"]`);
  if (chip) {
    const n = parseInt(chip.textContent.replace(emoji, '') || '1', 10) + 1;
    chip.textContent = emoji + n;
  } else {
    const span = document.createElement('span');
    span.className = 'react-chip';
    span.dataset.emoji = emoji;
    span.textContent = emoji;
    row.appendChild(span);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setReply(content, isMe) {
  replyTo = { content, isMe };
  const bar = document.getElementById('chat-reply-bar');
  const preview = document.getElementById('reply-preview-text');
  if (bar && preview) {
    const short = String(content).replace(/\[(GIF|IMG|VID|AUD)\]\s*/i, '').slice(0, 50);
    preview.textContent = '↩ ' + (short || 'Media');
    bar.classList.add('visible');
  }
  document.getElementById('message-input')?.focus();
}

function cancelReply() {
  replyTo = null;
  const bar = document.getElementById('chat-reply-bar');
  if (bar) {
    bar.classList.remove('visible');
    bar.style.display = 'none';
  }
}

function saveLocalMessage(otherId, content, isMe, replyContent = null) {
  try {
    const key = getLocalMessagesKey(otherId);
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ content, isMe, reply: replyContent || null, at: Date.now() });
    if (arr.length > 200) arr.splice(0, arr.length - 200);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (e) {}
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !currentChatId) {
    if (!currentChatId) toast('Abre un chat primero');
    return;
  }
  if (!currentUser) {
    toast('No hay sesión');
    return;
  }

  const replyContent = replyTo ? replyTo.content : null;
  appendMessage(text, true, true, replyContent);
  playSfx('send');
  input.value = '';
  cancelReply();

  // Chat directo con Chromo
  if (isChromoChat(currentChatId)) {
    showChromoTyping(true);
    try {
      const reply = await askChromoAI(text, { historyId: CHROMO_AI.id });
      if (currentChatId === CHROMO_AI.id) {
        appendMessage(reply, false, true, null);
        playSfx('receive');
      }
    } catch (e) {
      console.error('Chromo AI', e);
      if (currentChatId === CHROMO_AI.id) {
        appendMessage('Tsk… falló la conexión. No es mi culpa, ¿ok? Inténtalo otra vez.', false, true, null);
      }
      toast('Chromo AI no respondió');
    } finally {
      showChromoTyping(false);
    }
    return;
  }

  // Enviar mensaje normal (humano / grupo)
  try {
    if (currentChatIsGroup) {
      const { error } = await sb.from('group_messages').insert({
        group_id: currentChatId,
        sender_id: currentUser.id,
        content: text
      });
      if (error) console.error('group send', error);
    } else {
      const { error } = await sb.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: currentChatId,
        content: text
      });
      if (error) {
        console.error('sendMessage', error);
        toast('No se pudo enviar: ' + (error.message || error.code || 'error'));
      }
    }
  } catch (e) {
    console.error(e);
  }

  // @chromo en cualquier chat → Chromo responde aquí mismo
  if (messageMentionsChromo(text)) {
    const chatIdAtMention = currentChatId;
    const isGroupAtMention = currentChatIsGroup;
    toast('Chromo está mirando…');
    showChromoTyping(true);
    try {
      const reply = await askChromoAI(text, {
        historyId: chatIdAtMention,
        mention: true
      });
      // Solo si seguimos en el mismo chat
      if (currentChatId === chatIdAtMention) {
        const labeled = '[Chromo AI] ' + reply;
        appendMessage(labeled, false, true, null);
        playSfx('receive');
      } else {
        // Guardar en historial del chat donde mencionaron aunque ya salieron
        try {
          saveLocalMessage(chatIdAtMention, '[Chromo AI] ' + reply, false, null);
        } catch (e) {}
      }
    } catch (e) {
      console.error('Chromo mention', e);
      if (currentChatId === chatIdAtMention) {
        appendMessage('[Chromo AI] Bah… no pude responder. Revisa internet, tontito.', false, true, null);
      }
      toast('Chromo no respondió');
    } finally {
      showChromoTyping(false);
    }
  }
}

function pickChatMedia() {
  const input = document.getElementById('chat-media-input');
  if (!input) return;
  input.accept = 'image/*,video/*,audio/*';
  input.value = '';
  input.click();
}

// ========== VOICE MESSAGE (hold to record) ==========
let mediaRecorder = null;
let voiceChunks = [];
let voiceStartTime = 0;
let voiceTimerInterval = null;
let voiceCancelled = false;

function setupVoiceButton() {
  const btn = document.getElementById('voice-btn');
  if (!btn || btn._voiceBound) return;
  btn._voiceBound = true;

  const start = (e) => {
    e.preventDefault();
    startVoiceRecording();
  };
  const end = (e) => {
    e.preventDefault();
    stopVoiceRecording(false);
  };
  const cancelLeave = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopVoiceRecording(true);
    }
  };

  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', end);
  btn.addEventListener('mouseleave', cancelLeave);
  btn.addEventListener('touchstart', start, { passive: false });
  btn.addEventListener('touchend', end);
  btn.addEventListener('touchcancel', () => stopVoiceRecording(true));
}

async function startVoiceRecording() {
  if (!currentChatId) {
    toast('Abre un chat primero');
    return;
  }
  if (mediaRecorder && mediaRecorder.state === 'recording') return;

  voiceCancelled = false;
  voiceChunks = [];
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                 MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) voiceChunks.push(ev.data);
    };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      clearInterval(voiceTimerInterval);
      document.getElementById('voice-btn')?.classList.remove('recording');
      document.getElementById('voice-recording-bar')?.classList.remove('visible');

      if (voiceCancelled || !voiceChunks.length) return;
      const elapsed = Date.now() - voiceStartTime;
      if (elapsed < 400) {
        toast('Mantén más tiempo para grabar');
        return;
      }
      const blob = new Blob(voiceChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      let url;
      try {
        if (blob.size < 4 * 1024 * 1024) {
          url = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        } else {
          url = URL.createObjectURL(blob);
        }
      } catch (e) {
        url = URL.createObjectURL(blob);
      }
      const content = '[AUD] ' + url;
      const replyContent = replyTo ? replyTo.content : null;
      appendMessage(content, true, true, replyContent);
      cancelReply();
      try {
        await sb.from('messages').insert({
          sender_id: currentUser.id,
          receiver_id: currentChatId,
          content: '[AUD] (nota de voz)'
        });
      } catch (e) {}
    };

    mediaRecorder.start();
    voiceStartTime = Date.now();
    document.getElementById('voice-btn')?.classList.add('recording');
    const bar = document.getElementById('voice-recording-bar');
    const timer = document.getElementById('voice-timer');
    if (bar) bar.classList.add('visible');
    if (timer) timer.textContent = '0:00';
    voiceTimerInterval = setInterval(() => {
      const s = Math.floor((Date.now() - voiceStartTime) / 1000);
      if (timer) timer.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 250);
  } catch (err) {
    console.error(err);
    toast('No se pudo acceder al micrófono');
  }
}

function stopVoiceRecording(cancel) {
  voiceCancelled = !!cancel;
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  } else {
    clearInterval(voiceTimerInterval);
    document.getElementById('voice-btn')?.classList.remove('recording');
    document.getElementById('voice-recording-bar')?.classList.remove('visible');
  }
}

async function handleChatMedia(e) {
  const file = e.target.files?.[0];
  if (!file || !currentChatId) {
    if (!currentChatId) toast('Abre un chat primero');
    return;
  }

  let prefix = '[IMG] ';
  if (file.type.startsWith('video/')) prefix = '[VID] ';
  else if (file.type.startsWith('audio/')) prefix = '[AUD] ';
  else if (!file.type.startsWith('image/')) {
    toast('Tipo no soportado');
    return;
  }

  toast('Subiendo...');
  // 1) Storage (para que el otro lo vea)
  let url = await uploadToStorage('chat-media', file, currentUser.id);
  // 2) Fallback local si Storage falla
  if (!url) {
    try {
      if (file.size <= 1.5 * 1024 * 1024) {
        url = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      } else {
        url = URL.createObjectURL(file);
        toast('Storage falló: solo se ve aquí');
      }
    } catch (err) {
      url = URL.createObjectURL(file);
    }
  }

  const content = prefix + url;
  const replyContent = replyTo ? replyTo.content : null;
  appendMessage(content, true, true, replyContent);
  cancelReply();

  const remoteContent = (url.startsWith('http') || url.startsWith('data:'))
    ? content
    : prefix + '(media solo local)';

  try {
    if (currentChatIsGroup) {
      await sb.from('group_messages').insert({
        group_id: currentChatId,
        sender_id: currentUser.id,
        content: remoteContent
      });
    } else {
      const { error } = await sb.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: currentChatId,
        content: remoteContent
      });
      if (error) console.error('media insert', error);
    }
  } catch (err) {
    console.error(err);
  }
}

function openNewChat() {
  showScreen('discover');
}

function showAddFriend() {
  showScreen('discover');
}

async function sendFriendRequest(toId) {
  if (!toId || !currentUser) return;

  // Don't auto-add — always pending until the other accepts
  let ok = false;
  try {
    const { error } = await sb.from('friendships').insert({
      user_id: currentUser.id,
      friend_id: toId,
      status: 'pending'
    });
    if (!error) ok = true;
    else if (error.code === '23505') {
      toast('Ya enviada o ya son amigos');
      return;
    }
  } catch (e) {}

  // Local pending record (so the other device/session can see it if shared storage, and for offline)
  try {
    const reqs = JSON.parse(localStorage.getItem('reiny_friend_requests') || '[]');
    if (!reqs.find(r => r.from === currentUser.id && r.to === toId)) {
      reqs.push({
        id: 'local-' + Date.now(),
        from: currentUser.id,
        to: toId,
        from_username: profile?.username,
        from_name: profile?.display_name,
        from_avatar: profile?.avatar_url,
        status: 'pending',
        at: Date.now()
      });
      localStorage.setItem('reiny_friend_requests', JSON.stringify(reqs));
    }
  } catch (e) {}

  toast(ok ? 'Solicitud enviada' : 'Solicitud guardada (pendiente de aceptar)');
}

function createGroup() {
  openModal(`
    <h2>NUEVO GRUPO</h2>
    <input type="text" id="group-name" class="pixel-input" placeholder="Nombre del grupo" maxlength="40">
    <textarea id="group-desc" class="pixel-input" placeholder="Descripción (opcional)" rows="2" maxlength="120"></textarea>
    <p class="hint">Foto del grupo</p>
    <input type="file" id="group-avatar" class="pixel-input" accept="image/*">
    <p class="hint">Banner / decoración</p>
    <input type="file" id="group-banner" class="pixel-input" accept="image/*">
    <p class="hint">Tema</p>
    <select id="group-theme" class="pixel-select">
      <option value="classic">Classic</option>
      <option value="neon">Neón</option>
      <option value="pixel">Pixel</option>
      <option value="dark">Dark</option>
      <option value="sakura">Sakura</option>
    </select>
    <button class="pixel-btn primary" style="margin-top:12px" onclick="confirmCreateGroup()">CREAR</button>
  `);
}

async function fileToDataUrl(file, maxBytes = 3 * 1024 * 1024) {
  if (!file) return null;
  if (file.size > maxBytes) {
    // still try blob for session
    return URL.createObjectURL(file);
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function confirmCreateGroup() {
  const name = document.getElementById('group-name')?.value.trim();
  if (!name) {
    toast('Pon un nombre');
    return;
  }
  const description = document.getElementById('group-desc')?.value.trim() || '';
  const theme = document.getElementById('group-theme')?.value || 'classic';
  const avatarFile = document.getElementById('group-avatar')?.files?.[0];
  const bannerFile = document.getElementById('group-banner')?.files?.[0];

  let avatar_url = AVATARS[0];
  let banner_url = null;
  if (avatarFile) {
    avatar_url = (await uploadToStorage('groups', avatarFile, currentUser?.id)) ||
                 (await fileToDataUrl(avatarFile)) || AVATARS[0];
  }
  if (bannerFile) {
    banner_url = (await uploadToStorage('groups', bannerFile, currentUser?.id)) ||
                 (await fileToDataUrl(bannerFile));
  }

  const group = {
    id: 'g-' + Date.now(),
    name,
    description,
    theme,
    avatar_url,
    banner_url,
    created_by: currentUser?.id,
    created_at: new Date().toISOString()
  };

  groupsData.unshift(group);
  saveGroupsToStorage();

  try {
    const { data, error } = await sb.from('groups').insert({
      name,
      description,
      theme,
      avatar_url: (avatar_url && avatar_url.startsWith('http')) ? avatar_url : null,
      banner_url: (banner_url && banner_url.startsWith('http')) ? banner_url : null,
      created_by: currentUser.id
    }).select().single();
    if (!error && data) {
      group.id = data.id;
      saveGroupsToStorage();
      // add self as admin member
      try {
        await sb.from('group_members').insert({
          group_id: data.id,
          user_id: currentUser.id,
          role: 'admin'
        });
      } catch (e) {}
    }
  } catch (e) {
    console.log('groups table pending', e);
  }

  closeModal();
  toast('Grupo creado: ' + name);
  loadGroups();
}

let statusesData = [];

function loadStatusesFromStorage() {
  try {
    statusesData = JSON.parse(localStorage.getItem('reiny_statuses') || '[]');
    // expire after 24h
    const now = Date.now();
    statusesData = statusesData.filter(s => !s.expires_at || s.expires_at > now);
  } catch (e) {
    statusesData = [];
  }
}

function saveStatusesToStorage() {
  try {
    localStorage.setItem('reiny_statuses', JSON.stringify(statusesData));
  } catch (e) {}
}

function statusTimeLeft(s) {
  try {
    const end = s.expires_at
      ? new Date(s.expires_at).getTime()
      : (s.created_at ? new Date(s.created_at).getTime() + 24 * 60 * 60 * 1000 : 0);
    if (!end) return '';
    const ms = end - Date.now();
    if (ms <= 0) return 'expirado';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  } catch (e) { return ''; }
}

/** Devuelve la duración en segundos de un File de audio/video, o null si falla */
function getMediaDuration(file) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    const media = document.createElement(isVideo ? 'video' : 'audio');
    media.preload = 'metadata';
    let settled = false;
    const done = (dur) => {
      if (settled) return;
      settled = true;
      try { URL.revokeObjectURL(url); } catch (e) {}
      resolve(dur);
    };
    media.onloadedmetadata = () => done(isFinite(media.duration) ? media.duration : null);
    media.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    media.src = url;
  });
}

function createStatus() {
  const musicOpts = (typeof PRISM_CATALOG !== 'undefined' ? PRISM_CATALOG : []).map(t =>
    `<option value="${t.id}">${t.title} — ${t.artist}</option>`
  ).join('');
  openModal(`
    <h2>NUEVO ESTADO</h2>
    <p class="hint">Foto, video (máx 60s), audio (máx 30s) o solo texto · 24 h</p>
    <p class="hint" style="margin-bottom:4px;font-weight:700">Descripción (opcional)</p>
    <textarea id="status-text" class="pixel-input" placeholder="Escribe una descripción o un estado de texto..." rows="3"></textarea>
    <p class="hint">Color de fondo (si es solo texto)</p>
    <div class="status-colors" id="status-colors">
      ${['#7B2D8E','#128C7E','#075E54','#25D366','#34B7F1','#E91E63','#FF9800','#000000','#1A237E','#B71C1C'].map((c,i)=>
        `<button type="button" class="status-color-dot ${i===0?'on':''}" data-color="${c}" style="background:${c}" onclick="pickStatusColor(this)"></button>`
      ).join('')}
    </div>
    <input type="hidden" id="status-bg" value="#7B2D8E">
    <p class="hint">Musica (opcional)</p>
    <select id="status-music" class="pixel-select">
      <option value="">Sin musica</option>
      ${musicOpts}
    </select>
    <p class="hint">O archivo de tu dispositivo</p>
    <input type="file" id="status-file" class="pixel-input" accept="image/*,video/mp4,video/webm,audio/*">
    <button class="pixel-btn primary" onclick="confirmStatus()">PUBLICAR</button>
  `);
}

function pickStatusColor(btn) {
  document.querySelectorAll('.status-color-dot').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  const input = document.getElementById('status-bg');
  if (input) input.value = btn.getAttribute('data-color');
}

async function confirmStatus() {
  const text = document.getElementById('status-text')?.value.trim() || '';
  const file = document.getElementById('status-file')?.files?.[0];
  const bg = document.getElementById('status-bg')?.value || '#7B2D8E';
  const musicId = document.getElementById('status-music')?.value || '';
  let musicTrack = null;
  if (musicId && typeof PRISM_CATALOG !== 'undefined') {
    musicTrack = PRISM_CATALOG.find(t => String(t.id) === String(musicId)) || null;
  }

  if (!text && !file && !musicTrack) {
    toast('Escribe algo, elige musica o un archivo');
    return;
  }
  if (!currentUser) {
    toast('Inicia sesion primero');
    return;
  }

  let media_url = null;
  let media_type = null;

  if (file) {
    if (file.type.startsWith('image/')) media_type = 'image';
    else if (file.type.startsWith('video/')) media_type = 'video';
    else if (file.type.startsWith('audio/')) media_type = 'audio';
    else {
      toast('Solo foto, video o audio');
      return;
    }

    // Límites de duración: video ≤ 60s · audio/nota de voz ≤ 30s
    if (media_type === 'video' || media_type === 'audio') {
      toast('Comprobando duración...');
      const duration = await getMediaDuration(file);
      if (duration == null) {
        toast('No se pudo leer la duración del archivo');
        return;
      }
      if (media_type === 'video' && duration > 60.5) {
        toast('El video supera 60 segundos. Córtalo a 60s o menos (por ahora no hay recorte automático).');
        return;
      }
      if (media_type === 'audio' && duration > 30.5) {
        toast('Las notas de voz tienen un máximo de 30 segundos');
        return;
      }
    }

    toast('Subiendo archivo...');
    media_url = await uploadToStorage('statuses', file, currentUser.id);
    if (!media_url) {
      toast('Error: no se pudo subir a Storage');
      return;
    }
  }

  toast('Publicando estado...');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const payload = {
    user_id: currentUser.id,
    content: text || null,
    media_url: media_url,
    media_type: media_type,
    expires_at: expiresAt,
    music_url: musicTrack ? (() => {
      try {
        const u = new URL(musicTrack.file);
        u.pathname = u.pathname.split('/').map(p => encodeURIComponent(decodeURIComponent(p))).join('/');
        return u.toString();
      } catch (e) { return encodeURI(musicTrack.file); }
    })() : null,
    music_title: musicTrack ? (musicTrack.title + ' - ' + musicTrack.artist) : null,
    bg_color: (!media_url ? bg : null)
  };

  try {
    let { data, error } = await sb.from('statuses').insert(payload).select().single();
    // Si fallan columnas nuevas, reintentar sin ellas
    if (error && /music_url|music_title|bg_color|column/i.test(error.message || '')) {
      const basic = {
        user_id: currentUser.id,
        content: text ? (musicTrack ? text + '\n♪ ' + musicTrack.title + ' - ' + musicTrack.artist : text) : (musicTrack ? '♪ ' + musicTrack.title + ' - ' + musicTrack.artist : null),
        media_url: media_url || (musicTrack ? musicTrack.file : null),
        media_type: media_type || (musicTrack ? 'audio' : null),
        expires_at: expiresAt
      };
      ({ data, error } = await sb.from('statuses').insert(basic).select().single());
    }
    if (error) {
      console.error('statuses insert', error);
      toast('Error: ' + (error.message || error.code || 'no se pudo publicar'));
      return;
    }
    closeModal();
    toast('Estado publicado');
    await loadStatuses();
  } catch (e) {
    console.error(e);
    toast('Error de red al publicar');
  }
}

async function loadStatuses() {
  const list = document.getElementById('status-list');
  statusesData = [];

  if (!currentUser) {
    if (list) list.innerHTML = '<div class="status-empty"><p>Inicia sesion</p></div>';
    return;
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Borrar en servidor los que ya cumplieron 24 h (cada estado segun su expires_at)
  try {
    await sb.from('statuses').delete().lt('expires_at', nowIso);
  } catch (e) {
    console.warn('cleanup statuses', e);
  }

  try {
    const { data, error } = await sb
      .from('statuses')
      .select('id, user_id, content, media_url, media_type, music_url, music_title, bg_color, created_at, expires_at')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('loadStatuses', error);
      toast('No se pudieron cargar estados: ' + (error.message || error.code));
      renderStatusesUI();
      return;
    }

    // Filtro extra: 24 h desde created_at por si expires_at viene mal
    const rows = (data || []).filter(s => {
      if (s.expires_at && new Date(s.expires_at) <= now) return false;
      if (s.created_at) {
        const end = new Date(s.created_at).getTime() + 24 * 60 * 60 * 1000;
        if (end <= now.getTime()) return false;
      }
      return true;
    });
    const userIds = [...new Set(rows.map(s => s.user_id).filter(Boolean))];
    let profileMap = {};
    if (userIds.length) {
      const { data: profs } = await sb
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      (profs || []).forEach(p => { profileMap[p.id] = p; });
    }

    statusesData = rows.map(s => {
      const p = profileMap[s.user_id] || {};
      return {
        id: s.id,
        user_id: s.user_id,
        username: p.username || 'user',
        display_name: p.display_name || p.username || 'Usuario',
        avatar_url: safeAvatar(p.avatar_url),
        content: s.content || '',
        media_url: s.media_url,
        media_type: s.media_type,
        music_url: s.music_url || null,
        music_title: s.music_title || null,
        bg_color: s.bg_color || '#7B2D8E',
        views: [],
        created_at: s.created_at,
        expires_at: s.expires_at
      };
    });
  } catch (e) {
    console.error(e);
    toast('Error de red cargando estados');
  }

  renderStatusesUI();
}

function renderStatusesUI() {
  const list = document.getElementById('status-list');
  if (!list) return;

  const mine = statusesData.filter(s => s.user_id === currentUser?.id);
  const others = statusesData.filter(s => s.user_id !== currentUser?.id);

  // Agrupar por usuario
  const groups = new Map();
  others.forEach(s => {
    const k = String(s.user_id || s.username);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  });

  let html = `<div class="wa-status-row">`;

  // Mi estado
  html += `
    <button type="button" class="wa-status-bubble" data-status-user="${mine.length ? (currentUser?.id || '') : ''}" onclick="${mine.length ? `openStatusViewer('${currentUser?.id}')` : 'createStatus()'}">
      <div class="wa-avatar-wrap ${mine.length ? 'has-status' : ''}">
        <img src="${safeAvatar(profile?.avatar_url)}" alt="">
        <span class="wa-plus" onclick="event.stopPropagation();createStatus()">+</span>
      </div>
      <span class="wa-label">Mi estado</span>
    </button>`;

  // Otros
  groups.forEach((items, uid) => {
    const s = items[0];
    html += `
      <button type="button" class="wa-status-bubble" data-status-user="${uid}" onclick="openStatusViewer('${uid}')">
        <div class="wa-avatar-wrap has-status">
          <img src="${safeAvatar(s.avatar_url)}" alt="">
        </div>
        <span class="wa-label">${escapeHtml((s.display_name || s.username || 'User').slice(0, 12))}</span>
      </button>`;
  });

  html += `</div>`;

  // Lista estilo "mis estados recientes"
  html += `<div class="wa-status-section">`;
  if (mine.length) {
    html += `<p class="wa-section-title">Mis actualizaciones</p>`;
    mine.forEach(s => {
      const time = s.created_at ? new Date(s.created_at).toLocaleString() : '';
      const views = (s.views || []).length;
      const left = statusTimeLeft(s);
      html += `
        <button type="button" class="wa-status-row-item" data-status-user="${currentUser?.id}" onclick="openStatusViewer('${currentUser?.id}')">
          <img src="${safeAvatar(s.avatar_url)}" alt="">
          <div class="wa-row-meta">
            <strong>${escapeHtml(s.content ? s.content.slice(0, 40) : (s.media_type === 'image' || s.media_type === 'photo' ? 'Foto' : s.media_type === 'video' ? 'Video' : s.media_type === 'audio' || s.media_type === 'voice' ? 'Nota de voz' : 'Estado'))}</strong>
            <small>Visto por ${views} · ${time}${left ? ' · queda ' + left : ''}</small>
          </div>
        </button>`;
    });
  }
  if (groups.size) {
    html += `<p class="wa-section-title">Recientes</p>`;
    groups.forEach((items, uid) => {
      const s = items[0];
      const time = s.created_at ? new Date(s.created_at).toLocaleString() : '';
      html += `
        <button type="button" class="wa-status-row-item" data-status-user="${uid}" onclick="openStatusViewer('${uid}')">
          <img src="${safeAvatar(s.avatar_url)}" alt="">
          <div class="wa-row-meta">
            <strong>${escapeHtml(s.display_name || s.username || 'User')}</strong>
            <small>${time}</small>
          </div>
        </button>`;
    });
  }
  if (!mine.length && !groups.size) {
    html += `
      <div class="status-empty">
        <p>No hay estados</p>
        <p class="hint">Toca + en Mi estado para publicar</p>
        <button class="pixel-btn primary" onclick="createStatus()">+ NUEVO ESTADO</button>
      </div>`;
  }
  html += `</div>`;

  list.innerHTML = html;

  // Bind clicks (backup por si onclick inline falla en WebView)
  list.querySelectorAll('[data-status-user]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const uid = el.getAttribute('data-status-user');
      if (uid) openStatusViewer(uid);
    });
  });
}

function openStatusViewer(userId) {
  try {
  console.log('[status] openStatusViewer', userId, 'total', statusesData.length);
  const items = statusesData.filter(s => String(s.user_id) === String(userId));
  if (!items.length) {
    // fallback: si no hay por user_id, intentar por id de estado
    const byId = statusesData.filter(s => String(s.id) === String(userId));
    if (byId.length) {
      return openStatusViewerByItems(byId);
    }
    if (String(userId) === String(currentUser?.id)) {
      createStatus();
      return;
    }
    toast('Sin estados');
    return;
  }

  openStatusViewerByItems(items);
  } catch (err) {
    console.error('openStatusViewer error', err);
    toast('Error al abrir estado');
  }
}

function openStatusViewerByItems(items) {
  if (!items || !items.length) return;
  playSfx('status');
  // Limpiar timers anteriores
  if (window._statusTimer) {
    clearTimeout(window._statusTimer);
    window._statusTimer = null;
  }
  if (window._statusRaf) {
    cancelAnimationFrame(window._statusRaf);
    window._statusRaf = null;
  }

  let idx = 0;
  let paused = false;
  let pauseStarted = 0;
  let elapsedBeforePause = 0;
  let currentDuration = 5000;
  let startTime = 0;

  const clearTimers = () => {
    if (window._statusTimer) {
      clearTimeout(window._statusTimer);
      window._statusTimer = null;
    }
    if (window._statusRaf) {
      cancelAnimationFrame(window._statusRaf);
      window._statusRaf = null;
    }
  };

  const goNext = () => {
    clearTimers();
    if (idx < items.length - 1) {
      idx++;
      show();
    } else {
      closeStatusViewer();
    }
  };

  const goPrev = () => {
    clearTimers();
    if (idx > 0) {
      idx--;
      show();
    }
  };

  const animateProgress = (fillEl, durationMs) => {
    if (!fillEl) return;
    startTime = performance.now();
    elapsedBeforePause = 0;
    paused = false;

    const tick = (now) => {
      if (paused) {
        window._statusRaf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = (now - startTime) + elapsedBeforePause;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      fillEl.style.width = pct + '%';
      if (pct < 100) {
        window._statusRaf = requestAnimationFrame(tick);
      }
    };
    // Forzar reflow y arrancar
    fillEl.style.transition = 'none';
    fillEl.style.width = '0%';
    void fillEl.offsetWidth;
    window._statusRaf = requestAnimationFrame(tick);

    window._statusTimer = setTimeout(() => {
      if (!paused) goNext();
    }, durationMs);
  };

  const show = () => {
    clearTimers();
    // Detener TODA la música/audio anterior antes de cambiar de estado
    stopAllStatusAudio();
    const s = items[idx];
    if (!s) return;

    // registrar vista local
    if (s.user_id !== currentUser?.id) {
      if (!s.views) s.views = [];
      if (currentUser?.id && !s.views.includes(currentUser.id)) {
        s.views.push(currentUser.id);
        saveStatusesToStorage();
      }
    }

    const isText = (!s.media_url || s.music_url) && (s.content || s.music_title) && s.media_type !== 'image' && s.media_type !== 'photo' && s.media_type !== 'video';
    const bg = s.bg_color || '#7B2D8E';
    let body = '';
    const caption = (s.content || '').trim();
    const captionHtml = caption
      ? `<div class="wa-viewer-caption">${escapeHtml(caption)}</div>`
      : '';

    if ((s.media_type === 'image' || s.media_type === 'photo') && s.media_url) {
      body = `<img class="wa-viewer-media" src="${s.media_url}" alt="">${captionHtml}`;
    } else if (s.media_type === 'video' && s.media_url) {
      // sin controls nativos para que se sienta más "estado"
      body = `<video class="wa-viewer-media" src="${s.media_url}" autoplay playsinline></video>${captionHtml}`;
    } else if ((s.media_type === 'audio' || s.media_type === 'voice') && s.media_url && !s.music_url) {
      body = `<div class="wa-viewer-text"><audio class="wa-viewer-audio" src="${s.media_url}" autoplay></audio><p>${escapeHtml(caption || '')}</p></div>`;
    } else {
      body = `<div class="wa-viewer-text"><p>${escapeHtml(caption || '')}</p></div>`;
    }

    // Musica de fondo (catalogo)
    let musicSrc = s.music_url || null;
    if (musicSrc && !musicSrc.startsWith('data:')) {
      try {
        const u = new URL(musicSrc);
        const parts = u.pathname.split('/').map(p => encodeURIComponent(decodeURIComponent(p)));
        u.pathname = parts.join('/');
        musicSrc = u.toString();
      } catch (e) {
        musicSrc = encodeURI(musicSrc);
      }
    }
    const musicBar = musicSrc ? `
      <div class="wa-status-music" onclick="event.stopPropagation();toggleStatusMusic()">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <span>${escapeHtml(s.music_title || 'Musica')}</span>
        <button type="button" id="status-music-btn" class="wa-music-play-btn">PLAY</button>
        <audio id="status-music-audio" src="${musicSrc}" loop preload="auto"></audio>
      </div>` : '';

    const overlay = document.getElementById('status-viewer') || (() => {
      const el = document.createElement('div');
      el.id = 'status-viewer';
      document.body.appendChild(el);
      return el;
    })();

    overlay.className = 'wa-status-viewer open';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;background:' + (isText ? bg : '#000') + ';color:#fff;overflow:hidden;';


    // Barras de progreso con fill interno
    const barsHtml = items.map((_, i) => {
      const cls = i < idx ? 'done' : (i === idx ? 'on' : '');
      return `<div class="wa-bar ${cls}"><div class="wa-bar-fill"></div></div>`;
    }).join('');

    overlay.innerHTML = `
      <div class="wa-viewer-top">
        <div class="wa-progress">${barsHtml}</div>
        <div class="wa-viewer-user">
          <img src="${safeAvatar(s.avatar_url)}" alt="">
          <div>
            <strong>${escapeHtml(s.display_name || s.username || '')}</strong>
            <small>${s.created_at ? new Date(s.created_at).toLocaleString() : ''}</small>
          </div>
          <button type="button" class="wa-viewer-close" onclick="closeStatusViewer()">X</button>
        </div>
      </div>
      <div class="wa-viewer-body" id="status-viewer-body">
        ${body}
      </div>
      ${musicBar || ''}
      <div class="wa-viewer-bottom">
        <span>Visto por ${(s.views || []).length}</span>
        <div style="display:flex;gap:8px">
          ${s.user_id !== currentUser?.id ? `<button type="button" onclick="replyToStatus('${s.user_id}','${escapeHtml(s.display_name || s.username || '')}','${escapeHtml((s.content||'').replace(/'/g,'').slice(0,80))}')">Responder</button>` : ''}
          ${s.user_id === currentUser?.id ? `<button type="button" onclick="deleteMyStatus('${s.id}')">Borrar</button>` : ''}
        </div>
      </div>
    `;

    window._statusViewerItems = items;
    window._statusViewerIdx = idx;
    window._statusViewerShow = show;

    // Taps: izquierda = anterior, derecha = siguiente (zona central mantiene)
    const bodyEl = document.getElementById('status-viewer-body');
    if (bodyEl) {
      bodyEl.onclick = (e) => {
        const x = e.clientX || 0;
        const w = window.innerWidth;
        if (x < w / 3) goPrev();
        else if (x > (w * 2) / 3) goNext();
      };
      // Pausar mientras se mantiene pulsado (estilo WhatsApp)
      bodyEl.onpointerdown = () => {
        if (paused) return;
        paused = true;
        pauseStarted = performance.now();
        // pausar media también
        const v = overlay.querySelector('video');
        const a = overlay.querySelector('audio.wa-viewer-audio');
        if (v && !v.paused) v.pause();
        if (a && !a.paused) a.pause();
      };
      bodyEl.onpointerup = bodyEl.onpointerleave = bodyEl.onpointercancel = () => {
        if (!paused) return;
        const held = performance.now() - pauseStarted;
        elapsedBeforePause += held;
        paused = false;
        startTime = performance.now();
        // reanudar media
        const v = overlay.querySelector('video');
        const a = overlay.querySelector('audio.wa-viewer-audio');
        if (v) v.play().catch(() => {});
        if (a) a.play().catch(() => {});
        // recalcular el timeout restante
        const remaining = Math.max(50, currentDuration - elapsedBeforePause);
        if (window._statusTimer) clearTimeout(window._statusTimer);
        window._statusTimer = setTimeout(() => {
          if (!paused) goNext();
        }, remaining);
      };
    }

    // Música de fondo
    const audio = document.getElementById('status-music-audio');
    const btn = document.getElementById('status-music-btn');
    if (audio) {
      audio.volume = 1;
      setTimeout(() => {
        audio.play().then(() => {
          if (btn) btn.textContent = 'PAUSE';
        }).catch(() => {
          if (btn) btn.textContent = 'PLAY';
        });
      }, 150);
    }

    // ===== Duración según tipo =====
    // Foto / texto: 5 segundos
    // Video: duración real (máx 60s)
    // Audio (nota de voz): duración real (máx 30s)
    const fillEl = overlay.querySelector('.wa-bar.on .wa-bar-fill');

    if (s.media_type === 'video' && s.media_url) {
      const video = overlay.querySelector('video');
      if (video) {
        const startVideoProgress = () => {
          let dur = isFinite(video.duration) ? video.duration : 5;
          if (dur > 60) dur = 60;
          currentDuration = dur * 1000;
          animateProgress(fillEl, currentDuration);
          video.onended = () => goNext();
        };
        if (video.readyState >= 1) startVideoProgress();
        else video.onloadedmetadata = startVideoProgress;
        // fallback por si metadata tarda
        setTimeout(() => {
          if (!window._statusTimer && !window._statusRaf) {
            currentDuration = 5000;
            animateProgress(fillEl, currentDuration);
          }
        }, 3000);
      } else {
        currentDuration = 5000;
        animateProgress(fillEl, currentDuration);
      }
    } else if (s.media_type === 'audio' && s.media_url && !s.music_url) {
      const aud = overlay.querySelector('audio.wa-viewer-audio');
      if (aud) {
        const startAudioProgress = () => {
          let dur = isFinite(aud.duration) ? aud.duration : 5;
          if (dur > 30) dur = 30;
          currentDuration = dur * 1000;
          animateProgress(fillEl, currentDuration);
          aud.onended = () => goNext();
        };
        if (aud.readyState >= 1) startAudioProgress();
        else aud.onloadedmetadata = startAudioProgress;
        setTimeout(() => {
          if (!window._statusTimer && !window._statusRaf) {
            currentDuration = 5000;
            animateProgress(fillEl, currentDuration);
          }
        }, 3000);
      } else {
        currentDuration = 5000;
        animateProgress(fillEl, currentDuration);
      }
    } else {
      // imagen o texto puro → 5 segundos
      currentDuration = 5000;
      animateProgress(fillEl, currentDuration);
    }
  };

  show();
}

function toggleStatusMusic() {
  const audio = document.getElementById('status-music-audio');
  const btn = document.getElementById('status-music-btn');
  if (!audio) return;
  if (audio.paused) {
    audio.play().then(() => { if (btn) btn.textContent = 'PAUSE'; }).catch(() => toast('No se pudo reproducir'));
  } else {
    audio.pause();
    if (btn) btn.textContent = 'PLAY';
  }
}


function stopAllStatusAudio() {
  try {
    const a = document.getElementById('status-music-audio');
    if (a) {
      a.pause();
      a.currentTime = 0;
      a.removeAttribute('src');
      a.src = '';
      a.load();
    }
  } catch (e) {}
  try {
    const el = document.getElementById('status-viewer');
    if (el) {
      el.querySelectorAll('audio, video').forEach(m => {
        try {
          m.pause();
          m.currentTime = 0;
          m.removeAttribute('src');
          m.src = '';
          m.load();
        } catch (e2) {}
      });
    }
  } catch (e) {}
  // Por si quedó algún audio suelto en body
  try {
    document.querySelectorAll('audio[id^="status"], audio.wa-viewer-audio').forEach(m => {
      try { m.pause(); m.src = ''; m.load(); } catch (e3) {}
    });
  } catch (e) {}
}

function closeStatusViewer() {
  // Parar timers y animaciones del visor
  if (window._statusTimer) {
    clearTimeout(window._statusTimer);
    window._statusTimer = null;
  }
  if (window._statusRaf) {
    cancelAnimationFrame(window._statusRaf);
    window._statusRaf = null;
  }
  // Detener música y media SIEMPRE al salir
  stopAllStatusAudio();
  const el = document.getElementById('status-viewer');
  if (el) {
    el.classList.remove('open');
    el.style.display = 'none';
    el.style.cssText = 'display:none';
    el.innerHTML = '';
  }
}

function replyToStatus(userId, name, contentPreview) {
  closeStatusViewer();
  if (!userId) return;
  // Find avatar from statusesData or friends
  let avatar = null;
  const st = statusesData.find(s => String(s.user_id) === String(userId));
  if (st) avatar = st.avatar_url;
  startChat(userId, name || 'Usuario', avatar);
  // Prefill reply context
  const preview = contentPreview || 'estado';
  setReply('[Estado] ' + preview, false);
  const input = document.getElementById('message-input');
  if (input) {
    setTimeout(() => input.focus(), 200);
  }
  playSfx('click');
}

async function deleteMyStatus(id) {
  if (!id) return;
  if (!confirm('Borrar este estado?')) return;

  // Quitar de UI de inmediato
  statusesData = statusesData.filter(s => String(s.id) !== String(id));
  // Quitar tambien del array del viewer abierto
  if (window._statusViewerItems) {
    window._statusViewerItems = window._statusViewerItems.filter(s => String(s.id) !== String(id));
  }
  closeStatusViewer();
  renderStatusesUI();

  try {
    const { error } = await sb.from('statuses').delete().eq('id', id);
    if (error) {
      console.error('delete status', error);
      toast('No se pudo borrar en servidor: ' + (error.message || error.code));
      // recargar para sincronizar
      await loadStatuses();
      return;
    }
    toast('Estado eliminado');
    // recargar desde servidor para confirmar
    await loadStatuses();
  } catch (e) {
    console.error(e);
    toast('Error al borrar');
    await loadStatuses();
  }
}

// ========== REELS ==========

// ========== FOLLOWS (estilo TikTok) ==========
let followingSet = new Set();
try {
  const raw = JSON.parse(localStorage.getItem('reiny_following') || '[]');
  (raw || []).forEach(id => followingSet.add(String(id)));
} catch (e) {}

function isFollowing(userId) {
  return followingSet.has(String(userId));
}

function saveFollowing() {
  try {
    localStorage.setItem('reiny_following', JSON.stringify([...followingSet]));
  } catch (e) {}
}

async function toggleFollow(userId, btn) {
  if (!userId || !currentUser) {
    toast('Inicia sesión');
    return;
  }
  if (String(userId) === String(currentUser.id)) return;
  const id = String(userId);
  if (followingSet.has(id)) {
    followingSet.delete(id);
    if (btn) {
      btn.textContent = 'Seguir';
      btn.classList.remove('following');
    }
    playSfx('click');
    toast('Dejaste de seguir');
  } else {
    followingSet.add(id);
    if (btn) {
      btn.textContent = 'Siguiendo';
      btn.classList.add('following');
    }
    playSfx('success');
    toast('Ahora sigues a este usuario');
  }
  saveFollowing();
  // Best-effort DB (tabla follows opcional)
  try {
    if (followingSet.has(id)) {
      await sb.from('follows').upsert({ follower_id: currentUser.id, following_id: id });
    } else {
      await sb.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', id);
    }
  } catch (e) {}
}

let _peerProfileCache = null;

async function openUserProfile(userId, username, avatar) {
  await openPeerProfile(userId, username, avatar);
}

async function openPeerProfile(userId, username, avatar) {
  const view = document.getElementById('peer-profile-view');
  if (!view) {
    toast('Perfil no disponible');
    return;
  }

  // Chromo AI especial
  if (isChromoChat(userId) || String(username || '').toLowerCase() === 'chromo' || String(username || '') === 'Chromo AI') {
    _peerProfileCache = {
      id: CHROMO_AI.id,
      username: CHROMO_AI.username,
      display_name: CHROMO_AI.display_name,
      avatar_url: CHROMO_AI.avatar_url,
      banner_url: CHROMO_AI.banner_url,
      bio: 'Tsundere oficial de Reiny. Grosera con humor… y sí, también cariñosa. Menciona @chromo en cualquier chat.',
      level: 99,
      profile_sticker: '✨',
      isBot: true
    };
    fillPeerProfileUI(_peerProfileCache);
    view.classList.remove('hidden');
    playSfx('click');
    return;
  }

  // Si es tu propio perfil → pantalla normal
  if (userId && currentUser && String(userId) === String(currentUser.id)) {
    closePeerProfile();
    showScreen('profile');
    return;
  }

  let data = {
    id: userId || null,
    username: username || 'usuario',
    display_name: username || 'Usuario',
    avatar_url: avatar || AVATARS[0],
    banner_url: null,
    bio: 'Sin bio todavía…',
    level: 1,
    profile_sticker: null,
    profile_anim: null,
    profile_frame: null
  };

  // Cargar desde Supabase si hay id
  if (userId && !String(userId).startsWith('chromo')) {
    try {
      const { data: p } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (p) {
        data = {
          ...data,
          ...p,
          display_name: p.display_name || p.username || data.display_name,
          avatar_url: p.avatar_url || data.avatar_url
        };
      }
    } catch (e) {
      console.log('peer profile fetch', e);
    }
  }

  _peerProfileCache = data;
  fillPeerProfileUI(data);
  view.classList.remove('hidden');
  playSfx('click');
}

function fillPeerProfileUI(p) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('peer-display-name', p.display_name || p.username || 'Usuario');
  set('peer-username', '@' + (p.username || 'user'));
  set('peer-bio', p.bio || 'Sin bio todavía…');
  set('peer-joined', 'Reiny · @' + (p.username || 'user'));
  set('peer-level', p.isBot ? 'IA' : ('nivel ' + (p.level || 1)));
  set('peer-stat-friends', '—');
  set('peer-stat-groups', '—');
  set('peer-stat-posts', '—');

  const av = document.getElementById('peer-avatar');
  if (av) {
    av.src = safeAvatar(p.avatar_url);
    av.className = 'profile-avatar';
    if (p.profile_anim && p.profile_anim !== 'none') av.classList.add('anim-' + p.profile_anim);
    if (p.profile_frame && p.profile_frame !== 'none') av.classList.add('frame-' + p.profile_frame);
  }

  const banner = document.getElementById('peer-banner-img');
  if (banner) {
    if (p.banner_url) {
      banner.src = p.banner_url;
      banner.style.display = 'block';
    } else {
      banner.removeAttribute('src');
      banner.style.display = 'none';
    }
  }

  const badge = document.getElementById('peer-sticker-badge');
  if (badge) {
    if (p.profile_sticker && p.profile_sticker !== 'none') {
      badge.textContent = p.profile_sticker;
      badge.style.display = 'block';
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }

  // Botones
  const btnChat = document.getElementById('peer-btn-chat');
  const btnFriend = document.getElementById('peer-btn-friend');
  if (p.isBot) {
    if (btnChat) btnChat.textContent = 'Abrir chat';
    if (btnFriend) {
      btnFriend.textContent = 'Asistente IA';
      btnFriend.disabled = true;
      btnFriend.style.opacity = '0.6';
    }
  } else {
    if (btnChat) btnChat.textContent = 'Chat';
    if (btnFriend) {
      btnFriend.disabled = false;
      btnFriend.style.opacity = '1';
      btnFriend.textContent = 'Agregar';
    }
  }
}

function closePeerProfile() {
  const view = document.getElementById('peer-profile-view');
  if (view) view.classList.add('hidden');
}

function peerStartChat() {
  const p = _peerProfileCache;
  if (!p) return;
  closePeerProfile();
  startChat(p.id, p.display_name || p.username || 'Usuario', safeAvatar(p.avatar_url));
}

async function peerToggleFriend() {
  const p = _peerProfileCache;
  if (!p || !p.id || p.isBot) return;
  try {
    if (typeof sendFriendRequest === 'function') {
      await sendFriendRequest(p.id);
      toast('Solicitud enviada');
    } else {
      toast('No se pudo agregar');
    }
  } catch (e) {
    toast('Error al agregar');
  }
}

let reelsData = []; // local + from DB
let currentReelComments = null;
let hashtagCounts = {}; // tag -> number of reels using it

function loadReelsFromStorage() {
  try {
    const raw = localStorage.getItem('reiny_reels');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const blobs = window._reinyReelBlobs || {};
    reelsData = (parsed || []).map(r => ({
      ...r,
      // restaurar blob de la sesión si existe; si no, quitar blob muerto
      video_url: blobs[r.id] || ((r.video_url && r.video_url.startsWith('blob:')) ? null : r.video_url)
    }));
  } catch (e) {
    reelsData = [];
  }
}

function saveReelsToStorage() {
  try {
    const toSave = reelsData.map(r => ({
      id: r.id,
      user_id: r.user_id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      video_url: (r.video_url && !r.video_url.startsWith('blob:')) ? r.video_url : null,
      caption: r.caption,
      hashtags: r.hashtags,
      likes: r.likes || 0,
      liked: !!r.liked,
      comments: r.comments || [],
      created_at: r.created_at
    }));
    localStorage.setItem('reiny_reels', JSON.stringify(toSave));
  } catch (e) {}
}

function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]+/g) || [];
  return [...new Set(matches.map(t => t.toLowerCase()))];
}

function updateHashtagCounts() {
  hashtagCounts = {};
  reelsData.forEach(r => {
    (r.hashtags || extractHashtags(r.caption)).forEach(tag => {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
    });
  });
}

function formatCaptionWithHashtags(caption) {
  if (!caption) return '';
  return caption.replace(/#[a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]+/g, (tag) => {
    const count = hashtagCounts[tag.toLowerCase()] || 1;
    return `<span class="hashtag" onclick="filterByHashtag('${tag.toLowerCase()}')">${tag} <small>(${count})</small></span>`;
  });
}

function filterByHashtag(tag) {
  const filtered = reelsData.filter(r => (r.hashtags || extractHashtags(r.caption)).includes(tag));
  const feed = document.getElementById('reels-feed');
  if (!feed) return;
  if (filtered.length === 0) {
    toast('Nadie más usa ' + tag);
    return;
  }
  // temporarily show only those reels
  const backup = reelsData;
  reelsData = filtered;
  loadReels();
  // restore full list in memory but UI shows filtered; add back button feel via toast
  reelsData = backup;
  toast(tag + ' · ' + filtered.length + ' reel(s)');
}

function uploadReel() {
  openModal(`
    <h2>SUBIR REEL</h2>
    <p class="hint">Video (mp4/webm), sin límite de tamaño. Usa #hashtags en la descripción.</p>
    <input type="file" id="reel-file" accept="video/*" class="pixel-input">
    <input type="text" id="reel-caption" class="pixel-input" placeholder="Descripción + #hashtags..." maxlength="200">
    <button class="pixel-btn primary" onclick="confirmUploadReel()">PUBLICAR</button>
  `);
}

async function confirmUploadReel() {
  const fileInput = document.getElementById('reel-file');
  const caption = document.getElementById('reel-caption')?.value.trim() || '';
  const file = fileInput?.files?.[0];
  if (!file) {
    toast('Elige un video');
    return;
  }
  if (!file.type.startsWith('video/')) {
    toast('Solo videos');
    return;
  }

  // Max 3 minutos
  const durationOk = await new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(v.duration <= 180);
    };
    v.onerror = () => resolve(true); // si no se puede leer, dejar pasar
    v.src = URL.createObjectURL(file);
  });
  if (!durationOk) {
    toast('Maximo 3 minutos por reel');
    return;
  }

  toast('Subiendo reel...');
  let url = await uploadToStorage('reels', file, currentUser?.id || 'anon');
  if (!url) {
    url = URL.createObjectURL(file);
    toast('Storage falló: reel solo en este dispositivo');
  }

  const hashtags = extractHashtags(caption);
  const id = 'local-' + Date.now();

  const reel = {
    id,
    user_id: currentUser?.id,
    username: profile?.username || 'tú',
    display_name: profile?.display_name || 'Tú',
    avatar_url: safeAvatar(profile?.avatar_url),
    video_url: url,
    file_ref: file,
    caption,
    hashtags,
    likes: 0,
    liked: false,
    comments: [],
    created_at: new Date().toISOString()
  };

  if (!window._reinyReelBlobs) window._reinyReelBlobs = {};
  if (url.startsWith('blob:')) window._reinyReelBlobs[id] = url;

  reelsData.unshift(reel);
  updateHashtagCounts();
  saveReelsToStorage();

  try {
    const { data, error } = await sb.from('reels').insert({
      user_id: currentUser.id,
      caption,
      video_url: url.startsWith('http') ? url : null
    }).select().single();
    if (error) console.log('reels insert', error);
    else if (data?.id) {
      reel.id = data.id;
      saveReelsToStorage();
    }
  } catch (e) {
    console.log('Tabla reels no lista aún, guardado solo local');
  }

  closeModal();
  toast('Reel publicado');
  loadReels();
  showScreen('reels');
}

async function loadReels() {
  const feed = document.getElementById('reels-feed');
  if (!feed) return;

  // Traer reels remotos (sin join, para que no falle si no hay FK)
  try {
    const { data, error } = await sb
      .from('reels')
      .select('id, user_id, caption, video_url, likes_count, created_at')
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) console.error('remote reels', error);
    if (data && data.length) {
      const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
      let profileMap = {};
      if (userIds.length) {
        const { data: profs } = await sb.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds);
        (profs || []).forEach(p => { profileMap[p.id] = p; });
      }
      data.forEach(r => {
        if (reelsData.find(x => String(x.id) === String(r.id))) return;
        if (!r.video_url || !String(r.video_url).startsWith('http')) return;
        const p = profileMap[r.user_id] || {};
        reelsData.push({
          id: r.id,
          user_id: r.user_id,
          username: p.username || 'user',
          display_name: p.display_name || p.username || 'User',
          avatar_url: safeAvatar(p.avatar_url),
          video_url: r.video_url,
          caption: r.caption || '',
          hashtags: extractHashtags(r.caption || ''),
          likes: r.likes_count || 0,
          liked: false,
          comments: [],
          created_at: r.created_at
        });
      });
      reelsData.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      saveReelsToStorage();
    }
  } catch (e) {
    console.log('remote reels', e);
  }

  updateHashtagCounts();

  if (reelsData.length === 0) {
    feed.innerHTML = `<div class="empty-state" style="color:#fff;padding-top:40vh">
      <p>No hay reels aún</p>
      <p class="hint" style="color:#aaa">Sube el primero con + SUBIR</p>
    </div>`;
    return;
  }

  feed.innerHTML = reelsData.map((r) => `
    <div class="reel-item" data-id="${r.id}">
      ${r.video_url
        ? `<video src="${r.video_url}" loop playsinline webkit-playsinline onclick="toggleReelVideo(this)"></video>`
        : `<div class="reel-placeholder"><div>▶</div><small>${r.caption || 'Reel'}</small></div>`
      }
      <div class="reel-overlay"></div>
      <div class="reel-info">
        <div class="reel-user">
          <img src="${safeAvatar(r.avatar_url)}" alt="" onclick="openUserProfile('${r.user_id || ''}','${escapeHtml(r.username||'user')}','${safeAvatar(r.avatar_url)}')" style="cursor:pointer">
          <span class="name" onclick="openUserProfile('${r.user_id || ''}','${escapeHtml(r.username||'user')}','${safeAvatar(r.avatar_url)}')" style="cursor:pointer">@${r.username || 'user'}</span>
          ${r.user_id && r.user_id !== currentUser?.id ? `<button type="button" class="reel-follow-btn ${isFollowing(r.user_id)?'following':''}" data-reel-action="follow" data-user-id="${r.user_id}">${isFollowing(r.user_id)?'Siguiendo':'Seguir'}</button>` : ''}
        </div>
        <div class="reel-caption">${formatCaptionWithHashtags(r.caption)}</div>
      </div>
      <div class="reel-actions">
        <button type="button" class="reel-action-btn ${r.liked ? 'liked' : ''}" data-reel-action="like" data-reel-id="${r.id}">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="${r.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6C19 16.4 12 21 12 21z"/></svg>
          <span>${r.likes || 0}</span>
        </button>
        <button type="button" class="reel-action-btn" data-reel-action="com" data-reel-id="${r.id}">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H7l-3 3V5z"/></svg>
          <span>${(r.comments || []).length}</span>
        </button>
        <button type="button" class="reel-action-btn" data-reel-action="share" data-reel-id="${r.id}">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.5 13.5l7 4M8.5 10.5l7-4"/></svg>
          <span></span>
        </button>
      </div>
    </div>
  `).join('');

  // Play with sound (browsers may still require a user gesture first)
  const firstVid = feed.querySelector('video');
  if (firstVid) {
    firstVid.muted = false;
    firstVid.volume = 1;
    firstVid.play().catch(() => {
      // Autoplay with sound blocked → unmute on first tap
      firstVid.muted = false;
    });
  }

  setupReelObserver();
  setupReelActionDelegation();
}

// Delegacion de clicks (mas fiable que onclick inline en movil)
function setupReelActionDelegation() {
  const feed = document.getElementById('reels-feed');
  if (!feed || feed._reelActionsBound) return;
  feed._reelActionsBound = true;
  feed.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-reel-action]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const action = btn.getAttribute('data-reel-action');
    const id = btn.getAttribute('data-reel-id');
    if (action === 'like') toggleReelLike(id, btn);
    else if (action === 'com') openReelComments(id);
    else if (action === 'share') shareReel(id);
    else if (action === 'follow') toggleFollow(btn.getAttribute('data-user-id'), btn);
  });
}

let reelObserver = null;
function setupReelObserver() {
  if (reelObserver) reelObserver.disconnect();
  reelObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target.querySelector('video');
      if (!vid) return;
      if (entry.isIntersecting) {
        vid.muted = false;
        vid.volume = 1;
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.reel-item').forEach(el => reelObserver.observe(el));
}

function toggleReelVideo(vid) {
  vid.muted = false;
  vid.volume = 1;
  if (vid.paused) vid.play();
  else vid.pause();
}

function toggleReelLike(id, btn) {
  const reel = reelsData.find(r => String(r.id) === String(id));
  if (!reel) { toast('Reel no encontrado'); return; }
  reel.liked = !reel.liked;
  reel.likes += reel.liked ? 1 : -1;
  btn.classList.toggle('liked', reel.liked);
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="${reel.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6C19 16.4 12 21 12 21z"/></svg><span>${reel.likes}</span>`;
  btn.classList.toggle('liked', reel.liked);
  saveReelsToStorage();
}

function openReelComments(id) {
  const reel = reelsData.find(r => String(r.id) === String(id));
  if (!reel) { toast('Reel no encontrado'); return; }
  currentReelComments = id;

  let sheet = document.getElementById('reel-comments-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'reel-comments-sheet';
    document.body.appendChild(sheet);
  }
  sheet.className = 'reel-comments-sheet open';
  sheet.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:100000;display:flex;flex-direction:column;max-height:70vh;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -8px 32px rgba(0,0,0,0.25);';

  sheet.innerHTML = `
    <div class="reel-comments-header">
      <span>Comentarios</span>
      <button type="button" class="reel-comments-close" onclick="closeReelComments()">X</button>
    </div>
    <div class="reel-comments-list" id="reel-comments-list">
      ${(reel.comments || []).map(c => `<div class="reel-comment"><strong>@${escapeHtml(c.user || 'user')}</strong> ${escapeHtml(c.text || '')}</div>`).join('') || '<p class="hint">Sin comentarios aún. Sé el primero.</p>'}
    </div>
    <div class="reel-comment-input">
      <input type="text" id="reel-comment-text" placeholder="Escribe un comentario..." maxlength="200">
      <button type="button" class="pixel-btn primary small" onclick="postReelComment()">Enviar</button>
    </div>
  `;
  setTimeout(() => {
    const input = document.getElementById('reel-comment-text');
    if (input) input.focus();
  }, 100);
}

function closeReelComments() {
  const sheet = document.getElementById('reel-comments-sheet');
  if (sheet) {
    sheet.classList.remove('open');
    sheet.style.display = 'none';
  }
  currentReelComments = null;
}

function postReelComment() {
  const input = document.getElementById('reel-comment-text');
  const text = input?.value.trim();
  if (!text || !currentReelComments) {
    toast('Escribe un comentario');
    return;
  }
  const reel = reelsData.find(r => String(r.id) === String(currentReelComments));
  if (!reel) {
    toast('Reel no encontrado');
    return;
  }
  if (!reel.comments) reel.comments = [];
  reel.comments.push({
    user: profile?.username || 'tu',
    text
  });
  saveReelsToStorage();
  input.value = '';
  // refrescar solo el panel, no todo el feed
  openReelComments(String(reel.id));
  toast('Comentario publicado');
}

function shareReel(id) {
  const reel = reelsData.find(r => String(r.id) === String(id));
  if (!reel) { toast('Reel no encontrado'); return; }

  const link = `https://reiny.app/reel/${reel.id}`;

  openModal(`
    <h2>COMPARTIR</h2>
    <div class="share-options">
      <button class="share-opt" onclick="shareCopyLink('${link}')">
        <span class="share-icon">🔗</span>
        <span>Copiar link</span>
      </button>
      <button class="share-opt" onclick="shareDownload('${reel.id}')">
        <span class="share-icon">⬇</span>
        <span>Descargar video</span>
      </button>
      <button class="share-opt" onclick="shareToChat('${reel.id}')">
        <span class="share-icon">COM</span>
        <span>Enviar a chat</span>
      </button>
      <button class="share-opt" onclick="shareToGroup('${reel.id}')">
        <span class="share-icon">👥</span>
        <span>Enviar a grupo</span>
      </button>
      <button class="share-opt" onclick="shareWhatsApp('${link}', \`${(reel.caption || '').replace(/`/g, '')}\`)">
        <span class="share-icon">🟢</span>
        <span>WhatsApp</span>
      </button>
      <button class="share-opt" onclick="shareNative('${reel.id}')">
        <span class="share-icon">SHR</span>
        <span>Más opciones</span>
      </button>
    </div>
  `);
}

function shareCopyLink(link) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => toast('Link copiado')).catch(() => fallbackCopy(link));
  } else {
    fallbackCopy(link);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Link copiado'); } catch(e) { toast(text); }
  document.body.removeChild(ta);
}

function shareDownload(id) {
  const reel = reelsData.find(r => r.id === id);
  if (!reel || !reel.video_url) {
    toast('No hay video para descargar');
    return;
  }
  const a = document.createElement('a');
  a.href = reel.video_url;
  a.download = `reiny-reel-${id}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('Descarga iniciada');
  closeModal();
}

function shareToChat(id) {
  closeModal();
  toast('Elige un chat para enviar el reel');
  showScreen('home');
}

function shareToGroup(id) {
  closeModal();
  toast('Elige un grupo para enviar el reel');
  showScreen('groups');
}

function shareWhatsApp(link, caption) {
  const text = encodeURIComponent((caption ? caption + '\\n' : '') + link);
  window.open('https://wa.me/?text=' + text, '_blank');
  closeModal();
}

function shareNative(id) {
  const reel = reelsData.find(r => r.id === id);
  if (!reel) return;
  const link = `https://reiny.app/reel/${reel.id}`;
  if (navigator.share) {
    navigator.share({
      title: 'Reiny Reel',
      text: reel.caption || 'Mira este reel',
      url: link
    }).catch(() => {});
  } else {
    shareCopyLink(link);
  }
  closeModal();
}

// ========== THEME PRESETS ==========
const THEME_PRESETS = {
  soft: {
    name: 'Reiny Soft',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'classic',
    colors: { bg: '#EAF4FC', primary: '#5B9FE3', secondary: '#F4A261', text: '#1E2A3A', bubbleMe: '#5B9FE3', bubbleOther: '#FFFFFF' },
    crt: 0
  },
  bliss: {
    name: 'Bliss',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'classic',
    colors: { bg: '#B8DCF0', primary: '#4A90D9', secondary: '#7BC8A4', text: '#1E2A3A', bubbleMe: '#4A90D9', bubbleOther: '#FFFFFF' },
    crt: 0
  },
  frutiger: {
    name: 'Frutiger Aero',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'soft',
    colors: { bg: '#D6EBFA', primary: '#5B9FE3', secondary: '#7BC8A4', text: '#1E3A5F', bubbleMe: '#5B9FE3', bubbleOther: '#FFFFFF' },
    crt: 0
  },
  sky: {
    name: 'Cielo',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'soft',
    colors: { bg: '#E8F4FC', primary: '#4A90D9', secondary: '#7BC8A4', text: '#1E3A5F', bubbleMe: '#4A90D9', bubbleOther: '#FFFFFF' },
    crt: 0
  },
  peach: {
    name: 'Durazno',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'classic',
    colors: { bg: '#FFF5EE', primary: '#E07A5F', secondary: '#F4A261', text: '#3D2C29', bubbleMe: '#E07A5F', bubbleOther: '#FFFFFF' },
    crt: 0
  },
  mint: {
    name: 'Menta',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'soft',
    colors: { bg: '#F0F9F4', primary: '#5BB87A', secondary: '#7BC8A4', text: '#1E3A2A', bubbleMe: '#5BB87A', bubbleOther: '#FFFFFF' },
    crt: 0
  },
  lavender: {
    name: 'Lavanda',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'classic',
    colors: { bg: '#F5F0FA', primary: '#9B8AE0', secondary: '#C4B5F0', text: '#2D2640', bubbleMe: '#9B8AE0', bubbleOther: '#FFFFFF' },
    crt: 0
  },
  pixel: {
    name: 'Pixel',
    font: "'Pixelify Sans', sans-serif",
    bubble_style: 'pixel',
    colors: { bg: '#F6F3EE', primary: '#5B9FE3', secondary: '#F4A261', text: '#2A2A2A', bubbleMe: '#5B9FE3', bubbleOther: '#FFFFFF' },
    crt: 0
  },
  night: {
    name: 'Noche suave',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'classic',
    colors: { bg: '#1E2430', primary: '#7BB8F0', secondary: '#F4A261', text: '#E8ECF0', bubbleMe: '#4A7AB0', bubbleOther: '#2A3340' },
    crt: 0
  },
  mono: {
    name: 'Mono',
    font: "'Nunito', system-ui, sans-serif",
    bubble_style: 'classic',
    colors: { bg: '#F5F5F5', primary: '#333333', secondary: '#888888', text: '#222222', bubbleMe: '#333333', bubbleOther: '#FFFFFF' },
    crt: 0
  }
};

function applyCrtIntensity(value) {
  const v = Math.max(0, Math.min(1, Number(value) || 0.35));
  const overlay = document.querySelector('.crt-overlay');
  const scan = document.querySelector('.scanlines');
  if (overlay) overlay.style.opacity = String(0.15 + v * 0.55);
  if (scan) scan.style.opacity = String(0.2 + v * 0.6);
  document.documentElement.style.setProperty('--crt-intensity', String(v));
}

function applyThemePreset(key) {
  const p = THEME_PRESETS[key];
  if (!p) return;
  // Update form if open
  const fontRadios = document.querySelectorAll('input[name="edit-font"]');
  fontRadios.forEach(r => { r.checked = (r.value === p.font); });
  const bubbleRadios = document.querySelectorAll('input[name="edit-bubble"]');
  bubbleRadios.forEach(r => { r.checked = (r.value === p.bubble_style); });
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('edit-color-bg', p.colors.bg);
  set('edit-color-primary', p.colors.primary);
  set('edit-color-secondary', p.colors.secondary);
  set('edit-color-text', p.colors.text);
  set('edit-color-bubble-me', p.colors.bubbleMe);
  set('edit-color-bubble-other', p.colors.bubbleOther);
  set('edit-crt', p.crt);
  // Live preview
  document.documentElement.style.setProperty('--bg', p.colors.bg);
  document.documentElement.style.setProperty('--primary', p.colors.primary);
  document.documentElement.style.setProperty('--secondary', p.colors.secondary);
  document.documentElement.style.setProperty('--text', p.colors.text);
  document.documentElement.style.setProperty('--bubble-me', p.colors.bubbleMe);
  document.documentElement.style.setProperty('--bubble-other', p.colors.bubbleOther);
  document.documentElement.style.setProperty('--font', p.font);
  document.body.style.fontFamily = p.font;
  document.body.classList.remove('bubble-classic', 'bubble-pixel', 'bubble-neon', 'bubble-terminal');
  document.body.classList.add('bubble-' + p.bubble_style);
  applyCrtIntensity(p.crt);
  toast('Preset: ' + p.name);
}

function editProfile() {
  const anim = profile?.profile_anim || 'none';
  const frame = profile?.profile_frame || 'none';
  const sticker = profile?.profile_sticker || 'none';
  const font = profile?.font || "'VT323', monospace";
  const bubble = profile?.bubble_style || 'classic';
  const c = profile?.colors || {};
  const crt = profile?.crt_intensity != null ? profile.crt_intensity : 0.35;

  const fonts = [
    { v: "'Press Start 2P', cursive", l: 'Press Start 2P' },
    { v: "'VT323', monospace", l: 'VT323 Retro' },
    { v: "'Share Tech Mono', monospace", l: 'Share Tech Mono' },
    { v: "'Pixelify Sans', sans-serif", l: 'Pixelify Sans' },
    { v: "'DotGothic16', sans-serif", l: 'ドットゴシック' }
  ];
  const bubbles = [
    { v: 'classic', l: 'Classic' },
    { v: 'pixel', l: 'Pixel' },
    { v: 'neon', l: 'Neón' },
    { v: 'terminal', l: 'Terminal' }
  ];

  const fontOpts = fonts.map(f =>
    `<label class="font-option" style="display:block;margin:4px 0">
      <input type="radio" name="edit-font" value="${f.v.replace(/"/g, '&quot;')}" ${font === f.v ? 'checked' : ''}>
      <span style="font-family:${f.v};font-size:13px">${f.l}</span>
    </label>`
  ).join('');

  const bubbleOpts = bubbles.map(b =>
    `<label style="margin-right:10px">
      <input type="radio" name="edit-bubble" value="${b.v}" ${bubble === b.v ? 'checked' : ''}> ${b.l}
    </label>`
  ).join('');

  const presetsHtml = Object.keys(THEME_PRESETS).map(k =>
    `<button type="button" class="pixel-btn" style="font-size:11px;padding:6px 8px" onclick="applyThemePreset('${k}')">${THEME_PRESETS[k].name}</button>`
  ).join(' ');

  openModal(`
    <h2>✦ PERSONALIZAR</h2>
    <p class="hint">Nombre y bio</p>
    <input type="text" id="edit-name" class="pixel-input" value="${(profile?.display_name || '').replace(/"/g, '&quot;')}" placeholder="Nombre">
    <textarea id="edit-bio" class="pixel-input" rows="2" placeholder="Bio">${profile?.bio || ''}</textarea>

    <p class="hint" style="margin-top:12px">Presets de tema (rápido)</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${presetsHtml}</div>

    <p class="hint">Fuente</p>
    <div style="max-height:110px;overflow:auto;border:1px solid #333;padding:6px">${fontOpts}</div>

    <p class="hint">Burbujas</p>
    <div>${bubbleOpts}</div>

    <p class="hint">Colores</p>
    <div class="color-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="color-item"><label>Fondo</label><input type="color" id="edit-color-bg" value="${c.bg || '#F6F3EE'}"></div>
      <div class="color-item"><label>Principal</label><input type="color" id="edit-color-primary" value="${c.primary || '#5B9FE3'}"></div>
      <div class="color-item"><label>Secundario</label><input type="color" id="edit-color-secondary" value="${c.secondary || '#7B2D8E'}"></div>
      <div class="color-item"><label>Texto</label><input type="color" id="edit-color-text" value="${c.text || '#e0e0e0'}"></div>
      <div class="color-item"><label>Burbuja tú</label><input type="color" id="edit-color-bubble-me" value="${c.bubbleMe || '#128C7E'}"></div>
      <div class="color-item"><label>Burbuja otro</label><input type="color" id="edit-color-bubble-other" value="${c.bubbleOther || '#1f2c34'}"></div>
    </div>

    <p class="hint">Intensidad CRT / Scanlines</p>
    <input type="range" id="edit-crt" min="0" max="1" step="0.05" value="${crt}"
      oninput="applyCrtIntensity(this.value)" style="width:100%">

    <p class="hint">Animación del avatar</p>
    <select id="edit-anim" class="pixel-select">
      <option value="none" ${anim==='none'?'selected':''}>Ninguna</option>
      <option value="glow" ${anim==='glow'?'selected':''}>Glow</option>
      <option value="pulse" ${anim==='pulse'?'selected':''}>Pulse</option>
      <option value="glitch" ${anim==='glitch'?'selected':''}>Glitch</option>
      <option value="float" ${anim==='float'?'selected':''}>Float</option>
      <option value="bounce" ${anim==='bounce'?'selected':''}>Bounce</option>
      <option value="spin" ${anim==='spin'?'selected':''}>Spin</option>
      <option value="shake" ${anim==='shake'?'selected':''}>Shake</option>
      <option value="rainbow" ${anim==='rainbow'?'selected':''}>Rainbow</option>
      <option value="neon" ${anim==='neon'?'selected':''}>Neon Border</option>
      <option value="pixel" ${anim==='pixel'?'selected':''}>Pixel Flicker</option>
      <option value="wave" ${anim==='wave'?'selected':''}>Wave</option>
      <option value="heartbeat" ${anim==='heartbeat'?'selected':''}>Heartbeat</option>
    </select>

    <p class="hint">Marco</p>
    <select id="edit-frame" class="pixel-select">
      <option value="none" ${frame==='none'?'selected':''}>Ninguno</option>
      <option value="soft" ${frame==='soft'?'selected':''}>Suave</option>
      <option value="glow" ${frame==='glow'?'selected':''}>Glow</option>
      <option value="pixel" ${frame==='pixel'?'selected':''}>Pixel</option>
      <option value="neon" ${frame==='neon'?'selected':''}>Neón</option>
      <option value="double" ${frame==='double'?'selected':''}>Doble</option>
      <option value="crt" ${frame==='crt'?'selected':''}>CRT</option>
      <option value="glitch" ${frame==='glitch'?'selected':''}>Glitch</option>
    </select>

    <p class="hint">Sticker</p>
    <select id="edit-sticker" class="pixel-select">
      <option value="none" ${sticker==='none'?'selected':''}>Ninguno</option>
      <option value="🔥" ${sticker==='🔥'?'selected':''}>🔥</option>
      <option value="👾" ${sticker==='👾'?'selected':''}>👾</option>
      <option value="💀" ${sticker==='💀'?'selected':''}>💀</option>
      <option value="✨" ${sticker==='✨'?'selected':''}>✨</option>
      <option value="🌸" ${sticker==='🌸'?'selected':''}>🌸</option>
      <option value="🌙" ${sticker==='🌙'?'selected':''}>🌙</option>
      <option value="⚡" ${sticker==='⚡'?'selected':''}>⚡</option>
      <option value="🎸" ${sticker==='🎸'?'selected':''}>🎸</option>
      <option value="🖤" ${sticker==='🖤'?'selected':''}>🖤</option>
      <option value="👁️" ${sticker==='👁️'?'selected':''}>👁️</option>
      <option value="🎮" ${sticker==='🎮'?'selected':''}>🎮</option>
      <option value="🐱" ${sticker==='🐱'?'selected':''}>🐱</option>
      <option value="💜" ${sticker==='💜'?'selected':''}>💜</option>
    </select>

    <p class="hint" style="margin-top:12px">Fondo del chat</p>
    <select id="edit-chat-bg" class="pixel-select">
      ${Object.keys(CHAT_BGS).map(k => `<option value="${k}" ${(profile?.chat_bg||'none')===k?'selected':''}>${CHAT_BGS[k].name}</option>`).join('')}
    </select>
    <div style="margin-top:6px">
      <label style="font-size:12px">Color de fondo</label>
      <input type="color" id="edit-chat-bg-color" value="${profile?.chat_bg_color || '#0b141a'}">
    </div>

    <p class="hint" style="margin-top:12px">Sonidos retro</p>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px">
      <input type="checkbox" id="edit-sound-enabled" ${soundEnabled ? 'checked' : ''}> Activar sonidos
    </label>
    <input type="range" id="edit-sound-volume" min="0" max="1" step="0.05" value="${soundVolume}" style="width:100%;margin-top:4px"
      oninput="soundVolume=parseFloat(this.value);playSfx('click')">
    <button type="button" class="pixel-btn small" style="margin-top:6px" onclick="playSfx('success')">Probar sonido</button>

    <button class="pixel-btn primary" style="margin-top:14px" onclick="saveProfileEdit()">GUARDAR TODO</button>
  `);
}

async function saveProfileEdit() {
  const name = document.getElementById('edit-name')?.value.trim();
  const bio = document.getElementById('edit-bio')?.value.trim() || '';
  const anim = document.getElementById('edit-anim')?.value || 'none';
  const frame = document.getElementById('edit-frame')?.value || 'none';
  const sticker = document.getElementById('edit-sticker')?.value || 'none';
  const font = document.querySelector('input[name="edit-font"]:checked')?.value || profile?.font || "'VT323', monospace";
  const bubble = document.querySelector('input[name="edit-bubble"]:checked')?.value || profile?.bubble_style || 'classic';
  const crt = parseFloat(document.getElementById('edit-crt')?.value || '0.35');
  const colors = {
    bg: document.getElementById('edit-color-bg')?.value || '#F6F3EE',
    primary: document.getElementById('edit-color-primary')?.value || '#5B9FE3',
    secondary: document.getElementById('edit-color-secondary')?.value || '#7B2D8E',
    text: document.getElementById('edit-color-text')?.value || '#e0e0e0',
    bubbleMe: document.getElementById('edit-color-bubble-me')?.value || '#128C7E',
    bubbleOther: document.getElementById('edit-color-bubble-other')?.value || '#1f2c34'
  };
  const chatBg = document.getElementById('edit-chat-bg')?.value || 'none';
  const chatBgColor = document.getElementById('edit-chat-bg-color')?.value || '#0b141a';
  soundEnabled = !!document.getElementById('edit-sound-enabled')?.checked;
  soundVolume = parseFloat(document.getElementById('edit-sound-volume')?.value || '0.35');
  saveSoundPrefs();

  if (!name) {
    toast('Pon un nombre');
    return;
  }

  const updates = {
    display_name: name,
    bio,
    profile_anim: anim,
    profile_frame: frame,
    profile_sticker: sticker,
    font,
    bubble_style: bubble,
    colors,
    crt_intensity: crt,
    chat_bg: chatBg,
    chat_bg_color: chatBgColor
  };

  const { error } = await sb.from('profiles').update(updates).eq('id', currentUser.id);

  // Apply locally always
  Object.assign(profile, updates);
  try {
    localStorage.setItem('reiny_chat_bg', chatBg);
    localStorage.setItem('reiny_chat_bg_color', chatBgColor);
  } catch (e) {}
  updateProfileUI();
  applyTheme();
  applyCrtIntensity(crt);
  applyChatBackground();
  playSfx('success');
  toast(error ? 'Guardado local (algunas columnas nuevas pueden faltar en Supabase)' : 'Personalización guardada');
  closeModal();
}


const PIXEL_STICKERS = [
  '👾','🎮','🕹️','💻','⌨️','🖥️','📱','💾','📀','📼',
  '🔥','⚡','✨','💫','🌟','💥','🌈','💜','🖤','💚',
  '😎','🤖','🐱','🦊','🐸','👻','💀','👽','🎃','😈',
  '❤️','😂','👀','👍','👎','🙏','💪','🧠','👑','💎',
  '🌸','🌙','⭐','🎵','🎶','🎧','🎸','🎤','📷','🎬',
  '🍕','🍩','☕','🧋','🌮','🍦','🍪','🧁','🍒','🍉'
];

function openStickerPicker() {
  if (!currentChatId) {
    toast('Abre un chat primero');
    return;
  }
  const grid = PIXEL_STICKERS.map(s =>
    `<button type="button" class="sticker-pick" onclick="sendSticker('${s}')">${s}</button>`
  ).join('');
  openModal(`
    <h2>STICKERS PIXEL</h2>
    <div class="sticker-grid">${grid}</div>
  `);
  playSfx('click');
}

async function sendSticker(emoji) {
  closeModal();
  if (!currentChatId || !emoji) return;
  const content = '[STICKER] ' + emoji;
  const replyContent = replyTo ? replyTo.content : null;
  appendMessage(content, true, true, replyContent);
  playSfx('send');
  cancelReply();
  try {
    if (currentChatIsGroup) {
      await sb.from('group_messages').insert({
        group_id: currentChatId,
        sender_id: currentUser.id,
        content
      });
    } else {
      await sb.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: currentChatId,
        content
      });
    }
  } catch (e) {
    console.error(e);
  }
}

const GIPHY_KEY = 'y1UYimEs46Hujw3Tnod2dj8zYO8fkKoq';

async function openGifPicker() {
  openModal(`
    <h2>GIF</h2>
    <input type="text" id="gif-search" class="pixel-input" placeholder="Buscar GIF..." oninput="searchGifs(this.value)">
    <div id="gif-results" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:50vh;overflow:auto;margin-top:12px;"></div>
  `);
  searchGifs('retro');
}

async function searchGifs(q) {
  if (!q || q.length < 2) return;
  const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`);
  const json = await res.json();
  const box = document.getElementById('gif-results');
  if (!box) return;
  box.innerHTML = '';
  (json.data || []).forEach(g => {
    const full = g.images?.original?.url || g.images?.fixed_height?.url || '';
    const thumb = g.images?.fixed_height_small?.url || full;
    if (!full) return;
    const img = document.createElement('img');
    img.src = thumb;
    img.style.cssText = 'width:100%;cursor:pointer;border:1px solid #fff';
    img.onclick = () => sendGif(full);
    box.appendChild(img);
  });
}

async function sendGif(url) {
  closeModal();
  if (!currentChatId) {
    toast('Abre un chat primero');
    return;
  }
  if (!url) return;
  const content = '[GIF] ' + url;
  const replyContent = replyTo ? replyTo.content : null;
  appendMessage(content, true, true, replyContent);
  cancelReply();
  try {
    const { error } = await sb.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: currentChatId,
      content
    });
    if (error) {
      console.error('sendGif', error);
      toast('GIF guardado local (no llegó al otro)');
    }
  } catch (e) {
    console.error(e);
  }
}

function openChatSettings() {
  if (!currentChatId) {
    toast('Abre un chat primero');
    return;
  }
  // Group settings
  if (currentChatIsGroup) {
    const g = currentGroupMeta || { id: currentChatId, name: document.getElementById('chat-name')?.textContent || 'Grupo', theme: 'classic', description: '' };
    openModal(`
      <h2>AJUSTES DEL GRUPO</h2>
      <p class="hint">${escapeHtml(g.name || 'Grupo')}</p>
      <input type="text" id="set-g-name" class="pixel-input" value="${escapeHtml(g.name || '')}" placeholder="Nombre">
      <textarea id="set-g-desc" class="pixel-input" rows="2" placeholder="Descripción">${escapeHtml(g.description || '')}</textarea>
      <p class="hint">Tema</p>
      <select id="set-g-theme" class="pixel-select">
        <option value="classic" ${g.theme==='classic'?'selected':''}>Classic</option>
        <option value="neon" ${g.theme==='neon'?'selected':''}>Neón</option>
        <option value="pixel" ${g.theme==='pixel'?'selected':''}>Pixel</option>
        <option value="dark" ${g.theme==='dark'?'selected':''}>Dark</option>
        <option value="sakura" ${g.theme==='sakura'?'selected':''}>Sakura</option>
        <option value="bliss" ${g.theme==='bliss'?'selected':''}>Bliss</option>
        <option value="aero" ${g.theme==='aero'?'selected':''}>Frutiger Aero</option>
      </select>
      <p class="hint">Nueva foto</p>
      <input type="file" id="set-g-avatar" class="pixel-input" accept="image/*">
      <button class="pixel-btn primary" style="margin-top:10px" onclick="saveGroupSettings()">GUARDAR</button>
      <button class="pixel-btn secondary" onclick="clearGroupChat()">BORRAR MENSAJES LOCALES</button>
    `);
    return;
  }
  // Private chat settings
  const savedBg = localStorage.getItem('reiny_chat_bg_' + currentChatId) || 'default';
  openModal(`
    <h2>AJUSTES DEL CHAT</h2>
    <p class="hint">Personaliza esta conversación</p>
    <p class="hint">Fondo del chat</p>
    <select id="set-chat-bg" class="pixel-select">
      <option value="default" ${savedBg==='default'?'selected':''}>Por defecto (cielo)</option>
      <option value="dark" ${savedBg==='dark'?'selected':''}>Oscuro</option>
      <option value="neon" ${savedBg==='neon'?'selected':''}>Neón</option>
      <option value="sakura" ${savedBg==='sakura'?'selected':''}>Sakura</option>
      <option value="crt" ${savedBg==='crt'?'selected':''}>CRT verde</option>
    </select>
    <button class="pixel-btn primary" style="margin-top:10px" onclick="saveChatSettings()">APLICAR FONDO</button>
    <button class="pixel-btn secondary" onclick="clearPrivateChat()">BORRAR MENSAJES LOCALES</button>
  `);
}

async function saveGroupSettings() {
  if (!currentGroupMeta) {
    currentGroupMeta = { id: currentChatId, name: 'Grupo', theme: 'classic', description: '' };
  }
  const name = document.getElementById('set-g-name')?.value.trim();
  const description = document.getElementById('set-g-desc')?.value.trim() || '';
  const theme = document.getElementById('set-g-theme')?.value || 'classic';
  const file = document.getElementById('set-g-avatar')?.files?.[0];
  if (name) currentGroupMeta.name = name;
  currentGroupMeta.description = description;
  currentGroupMeta.theme = theme;
  if (file) {
    try {
      currentGroupMeta.avatar_url = await fileToDataUrl(file);
    } catch (e) {}
  }
  const idx = groupsData.findIndex(x => String(x.id) === String(currentGroupMeta.id));
  if (idx >= 0) groupsData[idx] = currentGroupMeta;
  saveGroupsToStorage();
  try {
    await sb.from('groups').update({
      name: currentGroupMeta.name,
      description,
      theme
    }).eq('id', currentGroupMeta.id);
  } catch (e) {}
  document.getElementById('chat-name').textContent = currentGroupMeta.name;
  document.getElementById('chat-avatar').src = safeAvatar(currentGroupMeta.avatar_url);
  document.getElementById('chat-status').textContent = 'tema: ' + theme;
  closeModal();
  toast('Grupo actualizado');
  loadGroups();
}

function saveChatSettings() {
  const bg = document.getElementById('set-chat-bg')?.value || 'default';
  const msgs = document.getElementById('messages-container');
  if (!msgs) return;
  try {
    localStorage.setItem('reiny_chat_bg_' + currentChatId, bg);
  } catch (e) {}
  if (bg === 'default') {
    msgs.className = 'messages';
    msgs.style.backgroundColor = '';
    msgs.style.backgroundImage = '';
  } else {
    msgs.className = 'messages chat-bg-' + bg;
    msgs.style.backgroundColor = '';
    msgs.style.backgroundImage = '';
  }
  closeModal();
  toast('Fondo aplicado');
}

function clearPrivateChat() {
  if (!currentChatId || currentChatIsGroup) return;
  try {
    localStorage.removeItem(getLocalMessagesKey(currentChatId));
  } catch (e) {}
  document.getElementById('messages-container').innerHTML = '';
  closeModal();
  toast('Chat local borrado');
}

function clearGroupChat() {
  if (!currentChatId || !currentChatIsGroup) return;
  try {
    localStorage.removeItem('reiny_gmsgs_' + currentChatId);
  } catch (e) {}
  document.getElementById('messages-container').innerHTML = '';
  closeModal();
  toast('Mensajes locales del grupo borrados');
}

function openModal(html) {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');
  if (!modal || !body) {
    console.error('Modal elements missing');
    toast('No se pudo abrir el panel');
    return;
  }
  body.innerHTML = html;
  modal.classList.remove('hidden');
  // Ensure visible even if CSS conflict
  modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.style.display = '';
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.add('show');
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    t.classList.remove('show');
    t.classList.add('hidden');
    t.style.opacity = '';
    t.style.transform = '';
  }, 2500);
}

async function logout() {
  await sb.auth.signOut();
}

// Enter to send
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement?.id === 'message-input') {
    sendMessage();
  }
});

// Expose for inline onclick (safety)
window.nextOnboardStep = nextOnboardStep;
window.prevOnboardStep = prevOnboardStep;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.validateIdentity = validateIdentity;
window.finishOnboarding = finishOnboarding;
window.showScreen = showScreen;
window.sendMessage = sendMessage;
window.openGifPicker = openGifPicker;
window.searchGifs = searchGifs;
window.sendGif = sendGif;
window.closeModal = closeModal;
window.startChat = startChat;
window.sendFriendRequest = sendFriendRequest;
window.createGroup = createGroup;
window.confirmCreateGroup = confirmCreateGroup;

// ========== REINY MUSIC (PRISM) ==========
// Cambia PRISM_REPO a la URL base donde tienes los mp3/covers
const PRISM_REPO = "https://raw.githubusercontent.com/alexis2003martinezz-blip/Miku-station-music-storage1/main/";

const PRISM_CATALOG = [
  { id: 1, title: "Piel Canela", artist: "Cuco", cover: PRISM_REPO + "piel-canela-cuco.jpg", file: PRISM_REPO + "Cuco-Piel-Canela-(Official-Animated Video).mp3" },
  { id: 2, title: "Coqueta", artist: "Grupo Frontera", cover: PRISM_REPO + "coqueta-grupo-frontera.jpg", file: PRISM_REPO + "Grupo-Frontera,-Fuerza-Regida-COQUETA(Letra Oficial).mp3" },
  { id: 3, title: "Que te parece?", artist: "Matías", cover: PRISM_REPO + "si-te-parece-matias.jpg", file: PRISM_REPO + "Qué-Te-Parece-Matias-Ft.Trapzongo-(LETRA).mp3" },
  { id: 4, title: "From the Start", artist: "Laufey", cover: PRISM_REPO + "form-the-start-laufey.jpg", file: PRISM_REPO + "Laufey-From-The-Start(Official-Music-Video).mp3" },
  { id: 5, title: "Moonlight", artist: "Kali Uchis", cover: PRISM_REPO + "moonlight..jpg", file: PRISM_REPO + "Kali-Uchis-Moonlight.mp3" },
  { id: 6, title: "Seventh Heaven", artist: "INOHA", cover: PRISM_REPO + "seventh-heaven-inoah.jpg", file: PRISM_REPO + "INOHA-Seventh-Heaven-(Official-Tour-Lyric-Video).mp3" },
  { id: 7, title: "From the Start (Cover)", artist: "Good Kid", cover: PRISM_REPO + "form-the-start-cool-kid.jpg", file: PRISM_REPO + "Good-Kid-From-The-Start(Laufey-Cover).mp3" },
  { id: 8, title: "Dile que tu me quieres", artist: "Ozuna", cover: PRISM_REPO + "dile-que-tu-me-quieres-ozuna.jpg", file: PRISM_REPO + "Ozuna-Dile_Que_Tu_Me_Quieres_(Video Oficial)_Odisea.mp3" },
  { id: 9, title: "ASKIM COK PARDON", artist: "LVBEL C5", cover: "https://files.catbox.moe/vp68o1.jpg", file: PRISM_REPO + "LVBEL-C5-AŞKIM-ÇOK-PARDON-(TikTok-REMIX-SLOWED).mp3" },
  { id: 10, title: "Uma Musume Rap", artist: "Helios", cover: PRISM_REPO + "uma-mesume.jpg", file: PRISM_REPO + "Uma-Musume-Helios-Rap.mp3" },
  { id: 11, title: "Coqueta (Bocchi Live)", artist: "Grupo Frontera", cover: PRISM_REPO + "ed73b785275a5309837cd09c35b23d2a.jpg", file: PRISM_REPO + "COQUETA-BOCCHI-THE-ROCKxGRUPO-FRONTERA-FUERZA-REGIDA-Live.mp3" },
  { id: 12, title: "Gotoubun no Kimochi", artist: "Kouko-chan", cover: PRISM_REPO + "gotobu-kimochi.jpg", file: PRISM_REPO + "Gotoubun-no-Hanayome-OP-1Gotoubun-no-KimochiCover-EspaolKouko-chan-IKuraa-SayuPalomares-lia_rtist.mp3" },
  { id: 13, title: "Freaks", artist: "Surf Curse", cover: PRISM_REPO + "freaks-surf-curse.jpg", file: PRISM_REPO + "Surf-Curse-Freaks%5BOfficial-Audio%5D.mp3" },
  { id: 14, title: "Nino", artist: "Milo J", cover: PRISM_REPO + "d5c2ef862671d2f4adf9602d841b36f2.jpg", file: PRISM_REPO + "niño-milo.mp4" },
  { id: 15, title: "Contigo", artist: "Los Panchos", cover: PRISM_REPO + "contigo-los-panchos-cover.jpg", file: PRISM_REPO + "Contigo.mp3" },
  { id: 16, title: "Birds of a Feather", artist: "Billie Eilish", cover: PRISM_REPO + "bird-of-a-feather-billie-elliesh.jpg", file: PRISM_REPO + "Billie-Eilish-BIRDS-OF-A-FEATHER-(Official-Music-Video).mp3" },
  { id: 17, title: "Kick Back", artist: "Kenshi Yonezu", cover: PRISM_REPO + "kick-back-chainsaw-man-opening.jpg", file: PRISM_REPO + "チェンソーマンノンクレジットオープニング-CHAINSAW-MAN-Opening米津玄師-KICK-BACK.mp3" },
  { id: 18, title: "Notion", artist: "Rare Occasions", cover: PRISM_REPO + "the-rare-ocasion-notion.jpg", file: PRISM_REPO + "The-Rare-Occasions-Notion.mp3" },
  { id: 19, title: "Fukashigi no Carte", artist: "Bunny Girl", cover: PRISM_REPO + "bunny-senpai-ending-cover.jpg", file: PRISM_REPO + "Bunny-Girl-Senpai-Ending-Song-Fukashigi-no-Carte.mp3" },
  { id: 20, title: "DtMF", artist: "Bad Bunny", cover: PRISM_REPO + "debi-de-tirar-mas-fotos-bad-bunny.jpg", file: PRISM_REPO + "Bad-Bunny-DtMF-(Letra).mp3" },
  { id: 21, title: "Propuesta Indecente", artist: "Romeo Santos", cover: PRISM_REPO + "propuesta-indecente-romeo-santos.jpg", file: PRISM_REPO + "Romeo-Santos-Propuesta-Indecente-(Official-Video).mp3" },
  { id: 22, title: "No One Noticed", artist: "The Marias", cover: PRISM_REPO + "no-one-noticed-cover.jpg", file: PRISM_REPO + "The-Marías-No-One-Noticed-(Visualizer).mp3" },
  { id: 23, title: "Sienna", artist: "The Marias", cover: PRISM_REPO + "sienna-cover.jpg", file: PRISM_REPO + "The-Marías-Sienna(Visualizer).mp3" },
  { id: 24, title: "Insomnia", artist: "Eve", cover: PRISM_REPO + "insomnia-(eve).jpg", file: PRISM_REPO + "インソムニア-(INSOMNIA)- Eve-Music-Video.mp3" },
  { id: 25, title: "Aquel Nap ZzZz", artist: "Rauw Alejandro", cover: PRISM_REPO + "aquel-nap-ZzZz-cover.jpg", file: PRISM_REPO + "Rauw-Alejandro-Aquel-Nap-ZzZz-(Audio-Oficial).mp3" },
  { id: 26, title: "Sabanas Blancas", artist: "La Santa Grifa", cover: PRISM_REPO + "sabanas-blancas-covee.jpg", file: PRISM_REPO + "Sabanas-Blancas.mp3" },
  { id: 27, title: "Mi Gata", artist: "Junior H", cover: PRISM_REPO + "propuesta-indecente-romeo-santos.jpg", file: PRISM_REPO + "Junior-H,-Gael-Valenzuela-MI-GATA-(Lyric-Video)-CantoYo.mp3" },
  { id: 28, title: "0 Sentimientos", artist: "Jhon Z", cover: PRISM_REPO + "propuesta-indecente-romeo-santos.jpg", file: PRISM_REPO + "Jon-Z-0-Sentimientos-(Remix)-ft.-Baby-Rasta,-Noriel,-Lyan,-Darkiel,-Messiah-(Audio).mp3" },
  { id: 29, title: "Ayer y Hoy", artist: "Julio Jaramillo", cover: PRISM_REPO + "propuesta-indecente-romeo-santos.jpg", file: PRISM_REPO + "Ayer-y-Hoy.mp3" },
  { id: 30, title: "Tiroteo", artist: "Rauw Alejandro", cover: PRISM_REPO + "propuesta-indecente-romeo-santos.jpg", file: PRISM_REPO + "Marc-Seguí-Tiroteo Remix-ft-Rauw-Alejandro-y-Pol-Granch.mp3" },
  { id: 31, title: "Demencia", artist: "Junior H", cover: PRISM_REPO + "propuesta-indecente-romeo-santos.jpg", file: PRISM_REPO + "Junior-H,-Gael-Valenzuela-DEMENCIA.mp3" },
  { id: 32, title: "Die With A Smile", artist: "Lady Gaga & Bruno Mars", cover: "https://images.genius.com/abe185baf2b9fd84ebb5d493ffe715b3.1000x1000x1.png", file: PRISM_REPO + "Lady%20Gaga%2C%20Bruno%20Mars%20-%20Die%20With%20A%20Smile%20(SPOTISAVER).mp3" },
];

let musicIndex = 0;
let musicPlaying = false;

function loadMusicList() {
  const list = document.getElementById('music-list');
  if (!list) return;
  list.innerHTML = PRISM_CATALOG.map((t, i) => `
    <button class="music-track ${i === musicIndex ? 'active' : ''}" onclick="musicPlayIndex(${i})">
      <span class="music-track-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="music-track-cover" style="background-image:url('${t.cover}')"></span>
      <span class="music-track-meta">
        <strong>${t.title}</strong>
        <small>${t.artist}</small>
      </span>
    </button>
  `).join('');
  musicUpdateNow();
}

function musicUpdateNow() {
  const t = PRISM_CATALOG[musicIndex];
  if (!t) return;
  const title = document.getElementById('music-now-title');
  const artist = document.getElementById('music-now-artist');
  const cover = document.getElementById('music-now-cover');
  const btn = document.getElementById('music-play-btn');
  if (title) title.textContent = t.title;
  if (artist) artist.textContent = t.artist;
  if (cover) cover.style.backgroundImage = `url("${t.cover}")`;
  if (btn) btn.textContent = musicPlaying ? 'PAUSE' : 'PLAY';
}

function musicPlayIndex(i) {
  musicIndex = i;
  const audio = document.getElementById('music-audio');
  const t = PRISM_CATALOG[musicIndex];
  if (!audio || !t) return;
  audio.src = t.file;
  audio.play().then(() => {
    musicPlaying = true;
    musicUpdateNow();
    loadMusicList();
  }).catch(err => {
    console.error('music play', err);
    toast('No se pudo reproducir (URL o CORS)');
    musicPlaying = false;
    musicUpdateNow();
  });
}

function musicToggle() {
  const audio = document.getElementById('music-audio');
  if (!audio) return;
  if (!audio.src) {
    musicPlayIndex(musicIndex);
    return;
  }
  if (audio.paused) {
    audio.play().then(() => { musicPlaying = true; musicUpdateNow(); }).catch(() => toast('Error al reproducir'));
  } else {
    audio.pause();
    musicPlaying = false;
    musicUpdateNow();
  }
}

function musicNext() {
  musicPlayIndex((musicIndex + 1) % PRISM_CATALOG.length);
}
function musicPrev() {
  musicPlayIndex((musicIndex - 1 + PRISM_CATALOG.length) % PRISM_CATALOG.length);
}

document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('music-audio');
  if (audio) {
    audio.addEventListener('ended', () => musicNext());
  }
});

window.createStatus = createStatus;
window.pickStatusColor = pickStatusColor;
window.closeStatusViewer = closeStatusViewer;
window.toggleStatusMusic = toggleStatusMusic;
window.deleteMyStatus = deleteMyStatus;
window.deleteMyStatus = deleteMyStatus;
window.renderStatusesUI = renderStatusesUI;

window.confirmStatus = confirmStatus;
window.closeChat = closeChat;
window.openGroup = openGroup;
window.openChatSettings = openChatSettings;
window.openChatPeerProfile = openChatPeerProfile;
window.saveGroupSettings = saveGroupSettings;
window.saveChatSettings = saveChatSettings;
window.clearPrivateChat = clearPrivateChat;
window.clearGroupChat = clearGroupChat;
window.sendGif = sendGif;
window.cancelReply = cancelReply;
window.setReply = setReply;
window.pickChatMedia = pickChatMedia;
window.handleChatMedia = handleChatMedia;
window.setupVoiceButton = setupVoiceButton;
window.startVoiceRecording = startVoiceRecording;
window.stopVoiceRecording = stopVoiceRecording;
window.respondFriendRequest = respondFriendRequest;
window.loadStatuses = loadStatuses;
window.uploadReel = uploadReel;
window.confirmUploadReel = confirmUploadReel;
window.loadReels = loadReels;
window.toggleReelLike = toggleReelLike;
window.openReelComments = openReelComments;
window.closeReelComments = closeReelComments;
window.postReelComment = postReelComment;
window.shareReel = shareReel;
window.toggleReelVideo = toggleReelVideo;
window.filterByHashtag = filterByHashtag;
window.shareCopyLink = shareCopyLink;
window.shareDownload = shareDownload;
window.shareToChat = shareToChat;
window.shareToGroup = shareToGroup;
window.shareWhatsApp = shareWhatsApp;
window.shareNative = shareNative;

window.editProfile = editProfile;
window.saveProfileEdit = saveProfileEdit;
window.applyThemePreset = applyThemePreset;
window.applyCrtIntensity = applyCrtIntensity;
window.playSfx = playSfx;
window.applyChatBackground = applyChatBackground;
window.addReactionToBubble = addReactionToBubble;
window.openStickerPicker = openStickerPicker;
window.sendSticker = sendSticker;
window.replyToStatus = replyToStatus;
window.toggleFollow = toggleFollow;
window.openUserProfile = openUserProfile;
window.openPeerProfile = openPeerProfile;
window.closePeerProfile = closePeerProfile;
window.peerStartChat = peerStartChat;
window.peerToggleFriend = peerToggleFriend;
window.isFollowing = isFollowing;
window.logout = logout;
window.openNewChat = openNewChat;
window.showAddFriend = showAddFriend;
window.switchFriendsTab = switchFriendsTab;
window.handleCustomAvatar = handleCustomAvatar;
window.handleBanner = handleBanner;
window.selectSticker = selectSticker;
window.selectBanner = selectBanner;

window.loadMusicList = loadMusicList;
window.musicPlayIndex = musicPlayIndex;
window.musicToggle = musicToggle;
window.musicNext = musicNext;
window.musicPrev = musicPrev;
window.openStatusViewer = openStatusViewer;
window.openStatusViewerByItems = openStatusViewerByItems;
window.playProfileSong = playProfileSong;




// ========== VOICE CALLS (UI + stub WebRTC/Realtime) ==========
let activeCall = null; // { id, peerId, peerName, peerAvatar, role: 'caller'|'callee', status }
let callTimerInterval = null;
let callStartedAt = 0;
let callMuted = false;
let callSpeaker = true;

function showCallScreen(opts) {
  const el = document.getElementById('call-screen');
  if (!el) return;
  el.classList.remove('hidden');
  el.setAttribute('aria-hidden', 'false');
  const av = document.getElementById('call-avatar');
  const name = document.getElementById('call-peer-name');
  const status = document.getElementById('call-status-text');
  const timer = document.getElementById('call-timer');
  const incoming = document.getElementById('call-incoming-panel');
  const actions = document.getElementById('call-active-actions');
  const topLabel = document.getElementById('call-top-label');
  if (av) av.src = safeAvatar(opts.avatar);
  if (name) name.textContent = opts.name || 'Usuario';
  if (status) status.textContent = opts.statusText || 'Llamando…';
  if (timer) {
    timer.textContent = '00:00';
    timer.classList.add('hidden');
  }
  if (opts.incoming) {
    if (topLabel) topLabel.textContent = 'Llamada entrante';
    if (incoming) incoming.classList.remove('hidden');
    if (actions) actions.classList.add('hidden');
  } else {
    if (topLabel) topLabel.textContent = 'Llamada';
    if (incoming) incoming.classList.add('hidden');
    if (actions) actions.classList.remove('hidden');
  }
  playCallRingtone(true);
}

function hideCallScreen() {
  const el = document.getElementById('call-screen');
  if (!el) return;
  el.classList.add('hidden');
  el.setAttribute('aria-hidden', 'true');
  playCallRingtone(false);
  stopCallTimer();
}

function startCallTimer() {
  stopCallTimer();
  callStartedAt = Date.now();
  const timer = document.getElementById('call-timer');
  if (timer) timer.classList.remove('hidden');
  const status = document.getElementById('call-status-text');
  if (status) status.textContent = 'En llamada';
  callTimerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - callStartedAt) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    if (timer) timer.textContent = mm + ':' + ss;
  }, 500);
}

function stopCallTimer() {
  if (callTimerInterval) {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }
}

let _ringtoneAudio = null;
function playCallRingtone(on) {
  try {
    if (!on) {
      if (_ringtoneAudio) {
        _ringtoneAudio.pause();
        _ringtoneAudio.currentTime = 0;
      }
      return;
    }
    // Ringtone sintético con Web Audio (sin archivo externo)
    if (!_ringtoneCtx) {
      try {
        _ringtoneCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { return; }
    }
    if (_ringtoneInterval) clearInterval(_ringtoneInterval);
    const beep = () => {
      if (!soundEnabled) return;
      try {
        const ctx = _ringtoneCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 440;
        g.gain.value = (soundVolume || 0.35) * 0.4;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        setTimeout(() => {
          o.frequency.value = 520;
        }, 180);
        setTimeout(() => {
          try { o.stop(); } catch (e) {}
        }, 360);
      } catch (e) {}
    };
    beep();
    _ringtoneInterval = setInterval(beep, 1400);
  } catch (e) {}
}
let _ringtoneCtx = null;
let _ringtoneInterval = null;

function stopRingtoneLoop() {
  if (_ringtoneInterval) {
    clearInterval(_ringtoneInterval);
    _ringtoneInterval = null;
  }
  playCallRingtone(false);
}

async function startVoiceCall() {
  if (!currentChatId) {
    toast('Abre un chat primero');
    return;
  }
  if (isChromoChat(currentChatId)) {
    toast('Chromo AI no atiende llamadas… aún');
    return;
  }
  if (!currentUser) {
    toast('Inicia sesión');
    return;
  }
  const peerName = document.getElementById('chat-name')?.textContent || 'Usuario';
  const peerAvatar = document.getElementById('chat-avatar')?.src || '';

  activeCall = {
    id: null,
    peerId: currentChatId,
    peerName,
    peerAvatar,
    role: 'caller',
    status: 'ringing'
  };

  showCallScreen({
    name: peerName,
    avatar: peerAvatar,
    statusText: 'Llamando…',
    incoming: false
  });

  // Registrar en Supabase si existe la tabla
  try {
    const { data, error } = await sb.from('calls').insert({
      caller_id: currentUser.id,
      callee_id: currentChatId,
      status: 'ringing',
      call_type: 'audio'
    }).select().single();
    if (!error && data) {
      activeCall.id = data.id;
      // Escuchar cambios de estado
      subscribeCallChannel(data.id);
    } else if (error) {
      console.warn('calls insert', error);
      // Demo local: tras 2s simular que nadie contesta / permitir colgar
      toast('Llamada local (ejecuta SQL-LLAMADAS.sql en Supabase para llamadas reales)');
    }
  } catch (e) {
    console.warn(e);
    toast('Llamada local (falta tabla calls en Supabase)');
  }
  playSfx('open');
}

function subscribeCallChannel(callId) {
  try {
    if (window._callChannel) {
      try { sb.removeChannel(window._callChannel); } catch (e) {}
    }
    window._callChannel = sb.channel('call-' + callId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
        filter: 'id=eq.' + callId
      }, (payload) => {
        const row = payload.new;
        if (!row) return;
        if (row.status === 'accepted') {
          stopRingtoneLoop();
          activeCall.status = 'accepted';
          startCallTimer();
          playSfx('success');
        } else if (row.status === 'rejected' || row.status === 'ended' || row.status === 'missed') {
          endVoiceCall(true);
        }
      })
      .subscribe();
  } catch (e) {
    console.warn('call channel', e);
  }
}

async function endVoiceCall(silent) {
  stopRingtoneLoop();
  stopCallTimer();
  const call = activeCall;
  activeCall = null;
  hideCallScreen();
  if (window._callChannel) {
    try { sb.removeChannel(window._callChannel); } catch (e) {}
    window._callChannel = null;
  }
  if (call && call.id && currentUser) {
    try {
      await sb.from('calls').update({
        status: 'ended',
        ended_at: new Date().toISOString()
      }).eq('id', call.id);
    } catch (e) {}
  }
  if (!silent) {
    playSfx('click');
    toast('Llamada finalizada');
  }
}

async async function acceptVoiceCall() {
  if (!activeCall) return;
  stopRingtoneLoop();
  activeCall.status = 'accepted';
  const incoming = document.getElementById('call-incoming-panel');
  const actions = document.getElementById('call-active-actions');
  if (incoming) incoming.classList.add('hidden');
  if (actions) actions.classList.remove('hidden');
  const topLabel = document.getElementById('call-top-label');
  if (topLabel) topLabel.textContent = 'En llamada';
  startCallTimer();
  if (activeCall.id) {
    try {
      await sb.from('calls').update({
        status: 'accepted',
        answered_at: new Date().toISOString()
      }).eq('id', activeCall.id);
    } catch (e) {}
  }
  playSfx('success');
}


async function rejectVoiceCall() {
  if (activeCall && activeCall.id) {
    try {
      await sb.from('calls').update({ status: 'rejected' }).eq('id', activeCall.id);
    } catch (e) {}
  }
  endVoiceCall(true);
  toast('Llamada rechazada');
}

function toggleCallMute() {
  callMuted = !callMuted;
  const btn = document.getElementById('call-btn-mute');
  if (btn) btn.classList.toggle('on', callMuted);
  toast(callMuted ? 'Micrófono silenciado' : 'Micrófono activo');
  // WebRTC track.enabled = !callMuted cuando haya stream
}

function toggleCallSpeaker() {
  callSpeaker = !callSpeaker;
  const btn = document.getElementById('call-btn-speaker');
  if (btn) btn.classList.toggle('on', callSpeaker);
  toast(callSpeaker ? 'Altavoz' : 'Auricular');
}

// Escuchar llamadas entrantes (Realtime en calls donde eres callee)
function setupIncomingCallListener() {
  if (!currentUser || window._incomingCallChannel) return;
  try {
    window._incomingCallChannel = sb.channel('incoming-calls-' + currentUser.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: 'callee_id=eq.' + currentUser.id
      }, async (payload) => {
        const row = payload.new;
        if (!row || row.status !== 'ringing') return;
        if (activeCall) return; // ya en otra llamada
        let peerName = 'Usuario';
        let peerAvatar = AVATARS[0];
        try {
          const { data: p } = await sb.from('profiles')
            .select('display_name, username, avatar_url')
            .eq('id', row.caller_id)
            .maybeSingle();
          if (p) {
            peerName = p.display_name || p.username || peerName;
            peerAvatar = p.avatar_url || peerAvatar;
          }
        } catch (e) {}
        activeCall = {
          id: row.id,
          peerId: row.caller_id,
          peerName,
          peerAvatar,
          role: 'callee',
          status: 'ringing'
        };
        showCallScreen({
          name: peerName,
          avatar: peerAvatar,
          statusText: 'Llamada entrante…',
          incoming: true
        });
        subscribeCallChannel(row.id);
      })
      .subscribe();
  } catch (e) {
    console.warn('incoming calls', e);
  }
}

// Hook: cuando se muestra la app, escuchar llamadas entrantes
const _origShowApp = typeof showApp === 'function' ? showApp : null;
if (_origShowApp) {
  window.showApp = function() {
    _origShowApp();
    setTimeout(setupIncomingCallListener, 500);
  };
}

window.startVoiceCall = startVoiceCall;
window.endVoiceCall = endVoiceCall;
window.acceptVoiceCall = acceptVoiceCall;
window.rejectVoiceCall = rejectVoiceCall;
window.toggleCallMute = toggleCallMute;
window.toggleCallSpeaker = toggleCallSpeaker;



// ========== CHANGELOG v0.2 (una vez por versión) ==========
const REINY_CHANGELOG_VERSION = '0.2';

function maybeShowChangelog() {
  try {
    const seen = localStorage.getItem('reiny_changelog_seen');
    if (seen === REINY_CHANGELOG_VERSION) return;
    const modal = document.getElementById('changelog-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  } catch (e) {}
}

function dismissChangelog() {
  try {
    localStorage.setItem('reiny_changelog_seen', REINY_CHANGELOG_VERSION);
  } catch (e) {}
  const modal = document.getElementById('changelog-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  playSfx('click');
}

function remindCallLater() {
  toast('Te recordaremos en un momento');
  rejectVoiceCall();
}

function messageInsteadOfCall() {
  const peerId = activeCall && activeCall.peerId;
  const peerName = activeCall && activeCall.peerName;
  const peerAvatar = activeCall && activeCall.peerAvatar;
  rejectVoiceCall();
  if (peerId && typeof startChat === 'function') {
    setTimeout(() => startChat(peerId, peerName || 'Usuario', peerAvatar), 200);
  }
}

window.dismissChangelog = dismissChangelog;
window.remindCallLater = remindCallLater;
window.messageInsteadOfCall = messageInsteadOfCall;

// Mostrar changelog al entrar a la app
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(maybeShowChangelog, 1200);
});

// ========== ANDROID BACK BUTTON (no salir de la app) ==========
(function setupAndroidBackButton() {
  function handleBack() {
    // 0) Si hay llamada activa, colgar / cerrar pantalla
    const callScreen = document.getElementById('call-screen');
    if (callScreen && !callScreen.classList.contains('hidden')) {
      if (typeof endVoiceCall === 'function') endVoiceCall();
      return;
    }
    // 1) Cerrar overlays / modales primero
    const statusViewer = document.getElementById('status-viewer');
    if (statusViewer && statusViewer.classList.contains('open')) {
      if (typeof closeStatusViewer === 'function') closeStatusViewer();
      return;
    }
    const peer = document.getElementById('peer-profile-view');
    if (peer && !peer.classList.contains('hidden')) {
      if (typeof closePeerProfile === 'function') closePeerProfile();
      return;
    }
    const reelComments = document.getElementById('reel-comments-sheet');
    if (reelComments && reelComments.classList.contains('open')) {
      if (typeof closeReelComments === 'function') closeReelComments();
      return;
    }
    const modal = document.getElementById('modal');
    if (modal && !modal.classList.contains('hidden')) {
      if (typeof closeModal === 'function') closeModal();
      return;
    }

    // 2) Si hay chat abierto → volver al inicio (chats)
    const chatView = document.getElementById('chat-view');
    if (chatView && chatView.classList.contains('active')) {
      if (typeof closeChat === 'function') closeChat();
      return;
    }

    // 3) Si estás en otra pantalla (reels, perfil, etc.) → ir a home
    const home = document.getElementById('home-screen');
    if (home && !home.classList.contains('active')) {
      if (typeof showScreen === 'function') showScreen('home');
      return;
    }

    // 4) Ya estás en home → NO salir. Intentar minimizar
    try {
      const App = window.Capacitor?.Plugins?.App;
      if (App && typeof App.minimizeApp === 'function') {
        App.minimizeApp();
      }
    } catch (e) {}
  }

  function tryRegister() {
    try {
      const Cap = window.Capacitor;
      if (!Cap || Cap.getPlatform() !== 'android') return;
      const App = Cap.Plugins && Cap.Plugins.App;
      if (!App || !App.addListener) return;

      App.addListener('backButton', () => {
        handleBack();
      });
      console.log('[Reiny] Android back button handler listo');
    } catch (e) {
      console.warn('[Reiny] back button', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryRegister, 300));
  } else {
    setTimeout(tryRegister, 300);
  }
})();
