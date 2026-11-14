
// ============================================================
// ATLAS ENTERPRISE AI - FRONTEND APPLICATION
// Single workspace demo - no login or user accounts
// ============================================================

const $ = id => document.getElementById(id);


// ============================================================
// 1. UNIQUE ID GENERATOR
// ============================================================

const createId = () => {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.getRandomValues === 'function'
    ) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);

        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        return [...bytes].map((b, i) =>
            ([4, 6, 8, 10].includes(i) ? '-' : '') +
            b.toString(16).padStart(2, '0')
        ).join('');
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};


// ============================================================
// 2. APPLICATION STATE
// ============================================================

let conversationId =
    sessionStorage.getItem('atlas_conversation_id') || createId();

sessionStorage.setItem('atlas_conversation_id', conversationId);


// ============================================================
// 3. COMMON HELPERS
// ============================================================

const toast = (message) => {
    const el = $('toast');
    if (!el) return;

    el.textContent = message;
    el.style.display = 'block';

    setTimeout(() => {
        el.style.display = 'none';
    }, 4000);
};


const api = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body instanceof FormData
                ? {}
                : options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }
    });

    const contentType = response.headers.get('content-type') || '';

    let data = {};

    if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const message =
            typeof data === 'object'
                ? data.detail || data.message || JSON.stringify(data)
                : data;

        throw new Error(message || `Request failed: ${response.status}`);
    }

    return data;
};


const setLoading = (button, loading, originalText) => {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? 'Please wait...' : originalText;
};


const addText = (parent, tag, text, className = '') => {
    const el = document.createElement(tag);
    el.textContent = text ?? '';

    if (className) {
        el.className = className;
    }

    parent.appendChild(el);
    return el;
};


const formatDate = value => {
    if (!value) return '';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString();
};


const showError = (error) => {
    console.error('Atlas application error:', error);
    toast(error.message || 'Something went wrong.');
};


// ============================================================
// 4. NAVIGATION
// ============================================================

const views = {
    chat: 'chatView',
    documents: 'docsView',
    approvals: 'approvalView',
    metrics: 'adminView'
};


const titles = {
    chat: "Ask your organization's knowledge",
    documents: 'Knowledge library',
    approvals: 'Human-in-the-loop approvals',
    metrics: 'Workspace metrics'
};


const switchView = (name) => {
    Object.entries(views).forEach(([key, id]) => {
        const view = $(id);
        if (view) {
            view.classList.toggle('hidden', key !== name);
        }
    });

    const buttons = {
        chat: 'chatTab',
        documents: 'docsTab',
        approvals: 'approvalTab',
        metrics: 'adminTab'
    };

    Object.entries(buttons).forEach(([key, id]) => {
        const button = $(id);
        if (button) {
            button.classList.toggle('active', key === name);
        }
    });

    $('heading').textContent = titles[name];

    if (name === 'documents') loadDocuments();
    if (name === 'approvals') loadApprovals();
    if (name === 'metrics') loadMetrics();
};


$('chatTab').onclick = () => switchView('chat');
$('docsTab').onclick = () => switchView('documents');
$('approvalTab').onclick = () => switchView('approvals');
$('adminTab').onclick = () => switchView('metrics');


// ============================================================
// 5. KNOWLEDGE CHAT
// ============================================================

const addMessage = (role, content) => {
    const container = $('messages');

    const message = document.createElement('div');
    message.className = `message ${role}`;

    addText(
        message,
        'strong',
        role === 'user' ? 'You' : 'Atlas'
    );

    const body = document.createElement('div');
    body.className = 'message-content';
    body.textContent = content;

    message.appendChild(body);
    container.appendChild(message);

    return message;
};


const renderSources = (message, sources) => {
    if (!Array.isArray(sources) || sources.length === 0) return;

    const section = document.createElement('div');
    section.className = 'sources';

    addText(section, 'strong', 'Evidence / Sources');

    sources.forEach((source, index) => {
        const item = document.createElement('div');
        item.className = 'source-item';

        const content =
            typeof source === 'string'
                ? source
                : JSON.stringify(source, null, 2);

        addText(item, 'p', `${index + 1}. ${content}`);
        section.appendChild(item);
    });

    message.appendChild(section);
};


const sendQuestion = async (question) => {
    const cleaned = question.trim();

    if (!cleaned) {
        toast('Please enter a question.');
        return;
    }

    const button = $('chatForm').querySelector('button[type="submit"]');

    addMessage('user', cleaned);

    $('question').value = '';

    const thinking = addMessage('assistant', 'Thinking...');

    setLoading(button, true, 'Send ↗');

    try {
        const result = await api('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                question: cleaned,
                conversation_id: conversationId
            })
        });

        thinking.querySelector('.message-content').textContent =
            result.answer || 'No answer returned.';

        renderSources(thinking, result.sources);

        if (result.conversation_id) {
            conversationId = result.conversation_id;

            sessionStorage.setItem(
                'atlas_conversation_id',
                conversationId
            );
        }

        if (result.status === 'pending_approval') {
            toast('Your request requires administrator approval.');
        }

        $('messages').scrollTop = $('messages').scrollHeight;

    } catch (error) {
        thinking.querySelector('.message-content').textContent =
            `Error: ${error.message}`;

        showError(error);

    } finally {
        setLoading(button, false, 'Send ↗');
    }
};


$('chatForm').addEventListener('submit', async event => {
    event.preventDefault();
    await sendQuestion($('question').value);
});


// Suggested questions
document.querySelectorAll('[data-q]').forEach(button => {
    button.addEventListener('click', () => {
        sendQuestion(button.dataset.q);
    });
});


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


// ============================================================
// 6. DOCUMENT MANAGEMENT
// ============================================================

const loadDocuments = async () => {
    const container = $('docs');

    container.replaceChildren();
    addText(container, 'p', 'Loading documents...');

    try {
        const result = await api('/api/documents');

        container.replaceChildren();

        const documents = result.documents || [];

        if (documents.length === 0) {
            addText(container, 'p', 'No documents found.');
            return;
        }

        documents.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'document-item';

            addText(card, 'h3', doc.title || 'Untitled document');
            addText(card, 'p', `Status: ${doc.status || 'unknown'}`);
            addText(card, 'small', `Version: ${doc.current_version || 1}`);

            container.appendChild(card);
        });

    } catch (error) {
        container.replaceChildren();
        addText(container, 'p', `Unable to load documents: ${error.message}`);
        showError(error);
    }
};


// Upload document
$('uploadForm').addEventListener('submit', async event => {
    event.preventDefault();

    const file = $('file').files[0];

    if (!file) {
        toast('Please select a document.');
        return;
    }

    const button = $('uploadForm').querySelector('button');
    setLoading(button, true, 'Upload document');

    try {
        // Step 1: Request presigned S3 upload URL
        const upload = await api('/api/documents/uploads', {
            method: 'POST',
            body: JSON.stringify({
                filename: file.name
            })
        });

        // Step 2: Upload file directly to S3
        const s3Response = await fetch(upload.upload_url, {
            method: 'PUT',
            headers: upload.headers || {
                'Content-Type': 'application/octet-stream'
            },
            body: file
        });

        if (!s3Response.ok) {
            throw new Error(
                `S3 upload failed: HTTP ${s3Response.status}`
            );
        }

        // Step 3: Complete ingestion
        const completed = await api('/api/documents/complete', {
            method: 'POST',
            body: JSON.stringify({
                document_id: upload.document_id
            })
        });

        $('file').value = '';

        toast(
            completed.status === 'ready'
                ? 'Document uploaded and processed successfully.'
                : 'Document upload completed.'
        );

        await loadDocuments();

    } catch (error) {
        showError(error);

    } finally {
        setLoading(button, false, 'Upload document');
    }
});


// ============================================================
// 7. APPROVAL MANAGEMENT
// ============================================================

const loadApprovals = async () => {
    const container = $('approvalList');

    container.replaceChildren();

    $('approvalSummary').textContent = 'Loading approvals...';

    try {
        const result = await api('/api/approvals');

        const approvals = result.approvals || [];

        $('approvalSummary').textContent =
            `${approvals.length} approval request(s) found.`;

        if (approvals.length === 0) {
            addText(container, 'p', 'No approval requests found.');
            return;
        }

        approvals.forEach(item => {
            const card = document.createElement('div');
            card.className = 'approval-item';

            addText(card, 'h3', `Request #${item.id}`);
            addText(card, 'p', `Requester: ${item.requester}`);
            addText(card, 'p', `Question: ${item.question}`);
            addText(card, 'p', `Status: ${item.status}`);
            addText(card, 'small', `Created: ${formatDate(item.created_at)}`);

            if (item.status === 'pending') {
                const actions = document.createElement('div');
                actions.className = 'approval-actions';

                const approve = document.createElement('button');
                approve.type = 'button';
                approve.textContent = 'Approve';
                approve.onclick = () =>
                    decideApproval(item.id, true, approve);

                const reject = document.createElement('button');
                reject.type = 'button';
                reject.textContent = 'Reject';
                reject.onclick = () =>
                    decideApproval(item.id, false, reject);

                actions.append(approve, reject);
                card.appendChild(actions);
            }

            container.appendChild(card);
        });

    } catch (error) {
        $('approvalSummary').textContent =
            `Unable to load approvals: ${error.message}`;

        showError(error);
    }
};


const decideApproval = async (id, approve, button) => {
    const original = button.textContent;

    setLoading(button, true, original);

    try {
        const result = await api(
            `/api/approvals/${encodeURIComponent(id)}/decision`,
            {
                method: 'POST',
                body: JSON.stringify({ approve })
            }
        );

        toast(`Decision recorded: ${result.status}`);

        await loadApprovals();

    } catch (error) {
        showError(error);

    } finally {
        if (button.isConnected) {
            setLoading(button, false, original);
        }
    }
};


$('refreshApprovals').onclick = loadApprovals;


// ============================================================
// 8. WORKSPACE METRICS
// ============================================================

const loadMetrics = async () => {
    const metrics = $('metrics');
    const guardrails = $('guardrailMetrics');

    metrics.textContent = 'Loading metrics...';
    guardrails.textContent = 'Loading guardrail metrics...';

    try {
        const result = await api('/api/admin/metrics');

        metrics.textContent = JSON.stringify(result, null, 2);

    } catch (error) {
        metrics.textContent = `Unable to load metrics: ${error.message}`;
    }

    try {
        const result = await api('/api/admin/guardrails');

        guardrails.textContent = JSON.stringify(result, null, 2);

    } catch (error) {
        guardrails.textContent =
            `Unable to load guardrail metrics: ${error.message}`;
    }
};


// ============================================================
// 9. INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Atlas Enterprise AI frontend initialized.');

    switchView('chat');
});
