// Importa o cliente do Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// === CONFIGURAÇÃO DO SUPABASE ===
const SUPABASE_URL = 'https://rcoolituxxptiaptadns.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjb29saXR1eHhwdGlhcHRhZG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NTMyMzEsImV4cCI6MjA3MDIyOTIzMX0.oAjndl7fR-0ENptTG02yDvqw7Md_fZY0ieZUzGfZYG8'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// === ELEMENTOS DOM ===
const authSection = document.getElementById('auth-section')
const wishlistSection = document.getElementById('wishlist-section')
const initialAuthChoicesDiv = document.getElementById('initial-auth-choices')
const loginFormContainer = document.getElementById('login-form-container')
const signupFormContainer = document.getElementById('signup-form-container')

const showLoginFormBtn = document.getElementById('show-login-form-btn')
const showSignupFormBtn = document.getElementById('show-signup-form-btn')
const loginSubmitBtn = document.getElementById('login-submit-btn')
const signupSubmitBtn = document.getElementById('signup-submit-btn')
const backToChoicesFromLoginBtn = document.getElementById('back-to-choices-from-login')
const backToChoicesFromSignupBtn = document.getElementById('back-to-choices-from-signup')

const loginEmailInput = document.getElementById('login-email')
const loginPasswordInput = document.getElementById('login-password')
const signupUsernameInput = document.getElementById('signup-usuario')
const signupEmailInput = document.getElementById('signup-email')
const signupPasswordInput = document.getElementById('signup-password')

const logoutBtn = document.getElementById('logout-btn')
const userInfoSpan = document.getElementById('user-info')
const addItemForm = document.getElementById('add-item-form')
const itemUrlInput = document.getElementById('item-url-input')
const fetchProductBtn = document.getElementById('fetch-product-btn')
const productPreview = document.getElementById('product-preview')
const previewImage = document.getElementById('preview-image')
const previewName = document.getElementById('preview-name')
const itemNameInput = document.getElementById('item-name')
const itemImageUrlInput = document.getElementById('item-image-url')
const itemDescriptionInput = document.getElementById('item-description')
const wishlistItemsDiv = document.getElementById('wishlist-items')
const messageModal = document.getElementById('message-modal')
const modalMessage = document.getElementById('modal-message')
const closeModalBtn = document.getElementById('close-modal-btn')
const loadingSpinner = document.getElementById('loading-spinner')

let currentUser = null

// === UI HELPERS ===
function showLoading() { loadingSpinner.classList.remove('hidden') }
function hideLoading() { loadingSpinner.classList.add('hidden') }
function showMessage(message, type) {
    modalMessage.textContent = message
    modalMessage.classList.toggle('text-green-500', type === 'success')
    modalMessage.classList.toggle('text-red-500', type === 'error')
    messageModal.classList.remove('hidden')
}
function hideMessage() { messageModal.classList.add('hidden') }
function showInitialAuthChoices() {
    initialAuthChoicesDiv.classList.remove('hidden')
    loginFormContainer.classList.add('hidden')
    signupFormContainer.classList.add('hidden')
    loginEmailInput.value = ''
    loginPasswordInput.value = ''
    signupUsernameInput.value = ''
    signupEmailInput.value = ''
    signupPasswordInput.value = ''
}
function showLoginForm() {
    initialAuthChoicesDiv.classList.add('hidden')
    loginFormContainer.classList.remove('hidden')
    signupFormContainer.classList.add('hidden')
}
function showSignupForm() {
    initialAuthChoicesDiv.classList.add('hidden')
    loginFormContainer.classList.add('hidden')
    signupFormContainer.classList.remove('hidden')
}

// === SUPABASE AUTH ===
async function handleLogin() {
    showLoading()
    const email = loginEmailInput.value.trim()
    const password = loginPasswordInput.value.trim()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
        showMessage(error.message, 'error')
    } else {
        showMessage('Login realizado com sucesso!', 'success')
        currentUser = data.user
        updateUIForAuthState(currentUser)
    }
    hideLoading()
}

async function handleSignUp() {
    showLoading()
    const username = signupUsernameInput.value.trim()
    const email = signupEmailInput.value.trim()
    const password = signupPasswordInput.value.trim()

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
    })

    hideLoading()

    if (error) {
        showMessage(error.message, 'error')
        return
    }

    if (data.user && data.session) {
        // Já está logado (quando confirmação de e-mail está desativada)
        currentUser = data.user
        updateUIForAuthState(currentUser)
        showMessage('Conta criada e login realizado com sucesso!', 'success')
    } else {
        // Conta criada, mas precisa confirmar o e-mail
        showMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'success')
    }

}

async function handleSignOut() {
    await supabase.auth.signOut()
    currentUser = null
    updateUIForAuthState(null)
    showMessage('Você saiu!', 'success')
}

// === WISHLIST CRUD ===
async function addWishlistItem(name, imageUrl, productUrl, description) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        showMessage('Você precisa estar logado.', 'error')
        return
    }

    console.log('[DEBUG] Inserindo item para user_id:', user.id)

    showLoading()
    const { error } = await supabase
        .from('wishlist')
        .insert([{ 
            user_id: user.id,
            name,
            image_url: imageUrl,
            product_url: productUrl,
            description,
            purchased: false
        }])
    hideLoading()

    if (error) {
        console.error('[DEBUG] Erro ao inserir:', error)
        showMessage(error.message, 'error')
    } else {
        showMessage('Item adicionado com sucesso!', 'success')
        loadWishlist()
    }
}

async function deleteWishlistItem(itemId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        showMessage('Você precisa estar logado.', 'error')
        return
    }

    showLoading()
    const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)
    hideLoading()

    if (error) {
        showMessage(error.message, 'error')
    } else {
        showMessage('Item excluído!', 'success')
        loadWishlist()
    }
}

async function togglePurchased(itemId, isPurchased) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        showMessage('Você precisa estar logado.', 'error')
        return
    }

    const { error } = await supabase
        .from('wishlist')
        .update({ purchased: isPurchased })
        .eq('id', itemId)
        .eq('user_id', user.id)

    if (error) {
        showMessage(error.message, 'error')
    } else {
        loadWishlist()
    }
}

async function loadWishlist() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        showMessage(error.message, 'error')
        return
    }
    renderWishlist(data)
}

function renderWishlist(items) {
    wishlistItemsDiv.innerHTML = ''
    if (items.length === 0) {
        wishlistItemsDiv.innerHTML = '<p class="text-center text-gray-500 col-span-full">Nenhum item ainda.</p>'
        return
    }
    items.forEach(item => {
        const el = document.createElement('div')
        el.classList.add('card', 'p-4', 'flex', 'flex-col', 'space-y-3')
        if (item.purchased) el.classList.add('purchased')
        el.innerHTML = `
            <div class="h-48 bg-gray-800 rounded-md overflow-hidden flex items-center justify-center">
                <img src="${item.image_url || 'https://placehold.co/400x200'}" class="w-full h-full object-cover">
            </div>
            <h3 class="text-xl font-semibold text-blue-400">${item.name}</h3>
            ${item.description ? `<p class="text-sm text-gray-400">${item.description}</p>` : ''}
            ${item.product_url ? `<a href="${item.product_url}" target="_blank" class="text-red-500 hover:underline">Ver Produto</a>` : ''}
            <div class="flex justify-between items-center pt-3">
                <button class="toggle-purchased-btn bg-yellow-600 text-white px-3 py-1 rounded" data-id="${item.id}" data-purchased="${item.purchased}">
                    ${item.purchased ? 'Comprado' : 'Marcar como Comprado'}
                </button>
                <button class="delete-item-btn text-red-500" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
        `
        wishlistItemsDiv.appendChild(el)
    })

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', e => deleteWishlistItem(e.target.closest('button').dataset.id))
    })
    document.querySelectorAll('.toggle-purchased-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const b = e.target.closest('button')
            togglePurchased(b.dataset.id, b.dataset.purchased !== 'true')
        })
    })
}

// === ATUALIZA UI ===
function updateUIForAuthState(user) {
    if (user) {
        userInfoSpan.textContent = `Usuário: ${user.user_metadata?.username || user.email}`
        authSection.classList.add('hidden')
        wishlistSection.classList.remove('hidden')
        logoutBtn.classList.remove('hidden')
        loadWishlist()
    } else {
        userInfoSpan.textContent = ''
        authSection.classList.remove('hidden')
        wishlistSection.classList.add('hidden')
        logoutBtn.classList.add('hidden')
        showInitialAuthChoices()
    }
}

// === EVENTOS ===
showLoginFormBtn.addEventListener('click', showLoginForm)
showSignupFormBtn.addEventListener('click', showSignupForm)
backToChoicesFromLoginBtn.addEventListener('click', showInitialAuthChoices)
backToChoicesFromSignupBtn.addEventListener('click', showInitialAuthChoices)
loginSubmitBtn.addEventListener('click', handleLogin)
signupSubmitBtn.addEventListener('click', handleSignUp)
logoutBtn.addEventListener('click', handleSignOut)
addItemForm.addEventListener('submit', e => {
    e.preventDefault()
    addWishlistItem(itemNameInput.value.trim(), itemImageUrlInput.value.trim(), itemUrlInput.value.trim(), itemDescriptionInput.value.trim())
})
closeModalBtn.addEventListener('click', hideMessage)

// === INICIALIZAÇÃO ===
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
        currentUser = session.user
    } else {
        currentUser = null
    }
    updateUIForAuthState(currentUser)
})

// Monitora mudanças na autenticação (login/logout)
supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null
    updateUIForAuthState(currentUser)
})

