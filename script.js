// Importa o cliente do Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// === CONFIGURAÇÃO DO SUPABASE ===
// Credenciais atualizadas com os valores que você forneceu:
const SUPABASE_URL = 'https://rcoolituxxptiaptadns.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjb29saXR1eHhwdGlhcHRhZG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NTMyMzEsImV4cCI6MjA3MDIyOTIzMX0.oAjndl7fR-0ENptTG02yDvqw7Md_fZY0ieZUzGfZYG8';

// Inicializa o cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === ELEMENTOS DOM ===
const authSection = document.getElementById('auth-section');
const wishlistSection = document.getElementById('wishlist-section');
const initialAuthChoicesDiv = document.getElementById('initial-auth-choices');
const loginFormContainer = document.getElementById('login-form-container');
const signupFormContainer = document.getElementById('signup-form-container');

const showLoginFormBtn = document.getElementById('show-login-form-btn');
const showSignupFormBtn = document.getElementById('show-signup-form-btn');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const signupSubmitBtn = document.getElementById('signup-submit-btn');
const backToChoicesFromLoginBtn = document.getElementById('back-to-choices-from-login');
const backToChoicesFromSignupBtn = document.getElementById('back-to-choices-from-signup');

const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const signupUsernameInput = document.getElementById('signup-usuario');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');

const logoutBtn = document.getElementById('logout-btn');
const userInfoSpan = document.getElementById('user-info');
const addItemForm = document.getElementById('add-item-form');
const itemUrlInput = document.getElementById('item-url-input');
const fetchProductBtn = document.getElementById('fetch-product-btn');
const productPreview = document.getElementById('product-preview');
const previewImage = document.getElementById('preview-image');
const previewName = document.getElementById('preview-name');
const itemNameInput = document.getElementById('item-name');
const itemImageUrlInput = document.getElementById('item-image-url');
const itemDescriptionInput = document.getElementById('item-description');
const wishlistItemsDiv = document.getElementById('wishlist-items');
const messageModal = document.getElementById('message-modal');
const modalMessage = document.getElementById('modal-message');
const closeModalBtn = document.getElementById('close-modal-btn');
const loadingSpinner = document.getElementById('loading-spinner');

let currentUser = null; // Armazena o objeto de usuário completo do Supabase

// === UI HELPERS ===
function showLoading() { loadingSpinner.classList.remove('hidden') }
function hideLoading() { loadingSpinner.classList.add('hidden') }

function showMessage(message, type) {
    modalMessage.textContent = message;
    modalMessage.classList.toggle('text-green-500', type === 'success');
    modalMessage.classList.toggle('text-red-500', type === 'error');
    messageModal.classList.remove('hidden');
}

function hideMessage() { messageModal.classList.add('hidden'); }

function showInitialAuthChoices() {
    initialAuthChoicesDiv.classList.remove('hidden');
    loginFormContainer.classList.add('hidden');
    signupFormContainer.classList.add('hidden');
    loginEmailInput.value = '';
    loginPasswordInput.value = '';
    signupUsernameInput.value = '';
    signupEmailInput.value = '';
    signupPasswordInput.value = '';
}
function showLoginForm() {
    initialAuthChoicesDiv.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
    signupFormContainer.classList.add('hidden');
}
function showSignupForm() {
    initialAuthChoicesDiv.classList.add('hidden');
    loginFormContainer.classList.add('hidden');
    signupFormContainer.classList.remove('hidden');
}

// --- Funções de Web Scraping (Netlify Function) ---

/**
 * Busca informações do produto (nome e imagem) de uma URL usando a Netlify Function.
 * @param {string} url - A URL do produto.
 * @returns {Promise<{name: string, imageUrl: string}>} - Nome e URL da imagem do produto.
 */
async function fetchProductInfo(url) {
    showLoading();
    try {
        // Endpoint da Netlify Function - APONTA PARA A FUNÇÃO SERVERLESS CORRETA
        const netlifyFunctionUrl = '/.netlify/functions/scrape'; 

        const response = await fetch(netlifyFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro na busca: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error("Erro ao buscar informações do produto:", error);
        showMessage(`Erro ao buscar informações do produto: ${error.message}. Certifique-se de que a Netlify Function foi implantada corretamente e que a URL do produto está acessível.`, 'error');
        return { name: '', imageUrl: '' }; // Retorna vazio em caso de erro
    } finally {
        hideLoading();
    }
}


// === SUPABASE AUTH ===
async function handleLogin() {
    showLoading();
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    hideLoading();
    
    if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'E-mail ou senha inválidos. Tente novamente.';
        }
        showMessage(errorMessage, 'error');
    } else {
        showMessage('Login realizado com sucesso!', 'success');
        currentUser = data.user;
        updateUIForAuthState(currentUser);
    }
}

async function handleSignUp() {
    showLoading();
    const username = signupUsernameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username || !email || !password) {
        showMessage('Preencha o nome de usuário, e-mail e senha.', 'error');
        hideLoading();
        return;
    }
    if (!emailRegex.test(email)) {
        showMessage('Formato de e-mail inválido. Exemplo: seu.email@exemplo.com', 'error');
        hideLoading();
        return;
    }
    if (password.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
        hideLoading();
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Salva o username nos metadados do usuário (correto para Supabase)
        options: {
            data: { username }
        }
    });

    hideLoading();

    if (error) {
        let errorMessage = error.message;
        if (error.message.includes('User already registered')) {
            errorMessage = 'Este e-mail já está em uso. Tente fazer login.';
        }
        showMessage(errorMessage, 'error');
        return;
    }

    if (data.user && data.session) {
        // Confirmação de e-mail desativada no Supabase, login automático
        currentUser = data.user;
        updateUIForAuthState(currentUser);
        showMessage('Conta criada e login realizado com sucesso!', 'success');
    } else {
        // Confirmação de e-mail ativada, precisa verificar caixa de entrada
        showMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'success');
    }
}

async function handleSignOut() {
    await supabase.auth.signOut();
    currentUser = null;
    updateUIForAuthState(null);
    showMessage('Você saiu!', 'success');
}

// === WISHLIST CRUD ===
async function addWishlistItem(name, imageUrl, productUrl, description) {
    // Usa o currentUser global
    if (!currentUser) {
        showMessage('Você precisa estar logado.', 'error');
        return;
    }

    showLoading();
    const { error } = await supabase
        .from('wishlist_items') // Tabela renomeada para wishlist_items
        .insert([{ 
            user_id: currentUser.id,
            name,
            image_url: imageUrl,
            product_url: productUrl,
            description,
            purchased: false
        }]);
    
    hideLoading();

    if (error) {
        console.error('[DEBUG] Erro ao inserir:', error);
        showMessage(`Erro ao adicionar item: ${error.message}`, 'error');
    } else {
        // Limpa campos após sucesso
        itemUrlInput.value = '';
        itemNameInput.value = '';
        itemImageUrlInput.value = '';
        itemDescriptionInput.value = '';
        productPreview.classList.add('hidden');
        previewImage.src = '';
        previewName.textContent = '';
        
        showMessage('Item adicionado com sucesso!', 'success');
        loadWishlist();
    }
}

async function deleteWishlistItem(itemId) {
    if (!currentUser) return;

    showLoading();
    const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', currentUser.id); // RLS: Verifica se pertence ao usuário
    hideLoading();

    if (error) {
        showMessage(error.message, 'error');
    } else {
        showMessage('Item excluído!', 'success');
        loadWishlist();
    }
}

async function togglePurchased(itemId, isPurchased) {
    if (!currentUser) return;

    const { error } = await supabase
        .from('wishlist_items')
        .update({ purchased: isPurchased })
        .eq('id', itemId)
        .eq('user_id', currentUser.id); // RLS: Verifica se pertence ao usuário

    if (error) {
        showMessage(error.message, 'error');
    } else {
        loadWishlist();
    }
}

async function loadWishlist() {
    if (!currentUser) return;

    showLoading();
    const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    hideLoading();

    if (error) {
        showMessage(`Erro ao carregar lista: ${error.message}`, 'error');
        return;
    }
    renderWishlist(data);
}

function renderWishlist(items) {
    wishlistItemsDiv.innerHTML = '';
    if (items.length === 0) {
        wishlistItemsDiv.innerHTML = '<p class="text-center text-gray-500 col-span-full">Nenhum item ainda.</p>';
        return;
    }
    items.forEach(item => {
        const el = document.createElement('div');
        el.classList.add('card', 'p-4', 'flex', 'flex-col', 'space-y-3', 'relative', 'wishlist-item');
        if (item.purchased) el.classList.add('purchased');

        el.innerHTML = `
            <div class="flex-shrink-0 w-full h-48 bg-gray-800 rounded-md overflow-hidden flex items-center justify-center mb-3">
                <img src="${item.image_url || 'https://placehold.co/400x200/2d2d2d/e0e0e0?text=Sem+Imagem'}"
                     alt="${item.name}"
                     class="object-cover w-full h-full"
                     onerror="this.onerror=null;this.src='https://placehold.co/400x200/2d2d2d/e0e0e0?text=Sem+Imagem';">
            </div>
            <h3 class="text-xl font-semibold text-blue-400">${item.name}</h3>
            ${item.description ? `<p class="text-sm text-gray-400 flex-grow">${item.description}</p>` : ''}
            ${item.product_url ? `<a href="${item.product_url}" target="_blank" class="text-red-500 hover:underline text-sm"><i class="fas fa-external-link-alt mr-1"></i>Ver Produto</a>` : ''}
            <div class="flex justify-between items-center mt-auto pt-3 border-t border-gray-700">
                <button class="toggle-purchased-btn text-sm px-3 py-1 rounded-full ${item.purchased ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white transition-colors" data-id="${item.id}" data-purchased="${item.purchased}">
                    <i class="fas fa-check-circle mr-1"></i>${item.purchased ? 'Comprado' : 'Marcar como Comprado'}
                </button>
                <button class="delete-item-btn text-red-500 hover:text-red-700 text-lg transition-colors" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        wishlistItemsDiv.appendChild(el);
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', e => deleteWishlistItem(e.target.closest('button').dataset.id));
    });
    document.querySelectorAll('.toggle-purchased-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const b = e.target.closest('button');
            togglePurchased(b.dataset.id, b.dataset.purchased !== 'true');
        });
    });
}

// === ATUALIZA UI ===
function updateUIForAuthState(user) {
    // Usa user_metadata para buscar o nome de usuário
    const username = user?.user_metadata?.username;
    
    if (user) {
        userInfoSpan.textContent = `Usuário: ${username || user.email}`;
        authSection.classList.add('hidden');
        wishlistSection.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        loadWishlist();
    } else {
        userInfoSpan.textContent = '';
        authSection.classList.remove('hidden');
        wishlistSection.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        showInitialAuthChoices();
    }
}

// === EVENTOS ===
showLoginFormBtn.addEventListener('click', showLoginForm);
showSignupFormBtn.addEventListener('click', showSignupForm);
backToChoicesFromLoginBtn.addEventListener('click', showInitialAuthChoices);
backToChoicesFromSignupBtn.addEventListener('click', showInitialAuthChoices);
loginSubmitBtn.addEventListener('click', handleLogin);
signupSubmitBtn.addEventListener('click', handleSignUp);
logoutBtn.addEventListener('click', handleSignOut);

// Listener para o botão "Buscar Info"
fetchProductBtn.addEventListener('click', async () => {
    const url = itemUrlInput.value.trim();
    if (url) {
        const productInfo = await fetchProductInfo(url);
        if (productInfo.name || productInfo.imageUrl) {
            itemNameInput.value = productInfo.name;
            itemImageUrlInput.value = productInfo.imageUrl;
            previewImage.src = productInfo.imageUrl || 'https://placehold.co/100x100/2d2d2d/e0e0e0?text=Sem+Imagem';
            previewName.textContent = productInfo.name || 'Nome não encontrado';
            productPreview.classList.remove('hidden');
        } else {
            showMessage('Não foi possível encontrar informações para esta URL. Por favor, preencha manualmente.', 'error');
            productPreview.classList.add('hidden');
        }
    } else {
        showMessage('Por favor, insira um link de produto para buscar informações.', 'error');
    }
});

addItemForm.addEventListener('submit', e => {
    e.preventDefault();
    addWishlistItem(itemNameInput.value.trim(), itemImageUrlInput.value.trim(), itemUrlInput.value.trim(), itemDescriptionInput.value.trim());
});
closeModalBtn.addEventListener('click', hideMessage);

// === INICIALIZAÇÃO ===
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
        currentUser = session.user;
    } else {
        currentUser = null;
    }
    updateUIForAuthState(currentUser);
});

// Monitora mudanças na autenticação (login/logout)
supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateUIForAuthState(currentUser);
});
