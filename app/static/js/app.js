
// Simple single-workspace UI. No login, tokens, or user accounts.

const $ = id => document.getElementById(id);


// Generate unique ID with browser compatibility fallback
const createId = () => {

    // Modern browsers
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    // Fallback for browsers where randomUUID is unavailable
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.getRandomValues === 'function'
    ) {
        const bytes = new Uint8Array(16);

        crypto.getRandomValues(bytes);

        // Set UUID version 4
        bytes[6] = (bytes[6] & 0x0f) | 0x40;

        // Set UUID variant
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        return [...bytes].map((b, i) =>
            ([4, 6, 8, 10].includes(i) ? '-' : '') +
            b.toString(16).padStart(2, '0')
        ).join('');
    }

    // Last-resort fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};


// Single-workspace conversation identifier
let conversationId =
    sessionStorage.getItem('atlas_conversation_id') ||
    createId();

sessionStorage.setItem('atlas_conversation_id', conversationId);


// Toast notification
const toast = msg => {
    const el = $('toast');

    if (!el) return;

    el.textContent = msg;
    el.style.display = 'block';

    setTimeout(() => {
        el.style.display = 'none';
    }, 4000);
};


// New conversation
$('newChat').onclick = () => {

    conversationId = createId();

    sessionStorage.setItem(
        'atlas_conversation_id',
        conversationId
    );

    $('messages').replaceChildren();

    toast('Started a new conversation');
};
