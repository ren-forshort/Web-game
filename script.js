// Data - Cleaned up (No price/discount)
const games = [
    { id: 1, title: "null", genre: "Nhập vai (RPG)", image: "https://placehold.co/600x400/101010/101010.png", desc: "desc", featured: true },
    { id: 2, title: "null", genre: "Hành động", image: "https://placehold.co/600x400/2b2005/2b2005.png", desc: "desc", featured: true },
    { id: 3, title: "null", genre: "Mô phỏng", image: "https://placehold.co/600x400/000033/000033.png", desc: "desc", featured: false },
    { id: 4, title: "null", genre: "Phiêu lưu", image: "https://placehold.co/600x400/4a0e0e/4a0e0e.png", desc: "desc", featured: false },
    { id: 5, title: "null", genre: "Thể thao", image: "https://placehold.co/600x400/990000/990000.png", desc: "desc", featured: false },
    { id: 6, title: "null", genre: "Chiến thuật", image: "https://placehold.co/600x400/1a1a1a/1a1a1a.png", desc: "desc", featured: false },
    { id: 7, title: "null", genre: "Hành động", image: "https://placehold.co/600x400/2e3b23/2e3b23.png", desc: "desc", featured: true },
    { id: 8, title: "null", genre: "Mô phỏng", image: "https://placehold.co/600x400/3e5c26/3e5c26.png", desc: "desc", featured: false },
    { id: 9, title: "null", genre: "Nhập vai (RPG)", image: "https://placehold.co/600x400/220044/220044.png", desc: "desc", featured: false },
    { id: 10, title: "null", genre: "Phiêu lưu", image: "https://placehold.co/600x400/3c8e22/3c8e22.png", desc: "desc", featured: false },
    { id: 11, title: "null", genre: "Chiến thuật", image: "https://placehold.co/600x400/440000/440000.png", desc: "desc", featured: false },
    { id: 12, title: "null", genre: "Thể thao", image: "https://placehold.co/600x400/000000/000000.png", desc: "desc", featured: false }
];

let cart = [];
let currentFilter = 'All';

// DOM Elements
const grid = document.getElementById('games-grid');
const featuredContainer = document.getElementById('featured-carousel');
const searchInput = document.getElementById('search-input');

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    } else {
        console.error("Lucide library failed to load.");
    }
});

// Initial Render
renderFeatured();
renderGames(games);

// Featured Carousel Logic
function renderFeatured() {
    const featuredGames = games.filter(g => g.featured);
    featuredContainer.innerHTML = featuredGames.map((game, index) => `
        <div class="featured-slide ${index === 0 ? 'active' : ''}" style="z-index: ${featuredGames.length - index}">
            <img src="${game.image}" class="featured-image" alt="${game.title}">
            <div class="featured-info">
                <div>
                    <div class="featured-title">${game.title}</div>
                    <div class="featured-tags">
                        <span class="tag">Bán chạy nhất</span>
                        <span class="tag">${game.genre}</span>
                    </div>
                </div>
                <div class="featured-desc">${game.desc}</div>
            </div>
        </div>
    `).join('');

    // Auto rotation
    let currentSlide = 0;
    const slides = document.querySelectorAll('.featured-slide');
    if (slides.length > 0) {
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000);
    }
}

// Render Game Grid
function renderGames(gamesList) {
    grid.innerHTML = gamesList.map(game => `
        <div class="game-card" onclick="openModal(${game.id})">
            <div class="card-image-container">
                <img src="${game.image}" class="card-image" alt="${game.title}">
            </div>
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-tags">${game.genre}</div>
            </div>
        </div>
    `).join('');
    
    // Re-run icons for new elements
    if (typeof lucide !== 'undefined') {
            lucide.createIcons();
    }
}

// Filters
function filterByGenre(genre) {
    currentFilter = genre;
    document.getElementById('current-genre').innerText = genre === 'All' ? 'Tất cả trò chơi' : genre;
    
    // Update active class on sidebar
    document.querySelectorAll('.filter-option').forEach(el => {
        el.classList.remove('active');
        if(el.innerText.includes(genre)) el.classList.add('active');
    });

    applyFilters();
}

function applyFilters() {
    let filtered = games;

    // Genre Filter
    if (currentFilter !== 'All') {
        filtered = filtered.filter(g => g.genre === currentFilter);
    }

    // Search Text Filter
    const term = searchInput.value.toLowerCase();
    if (term) {
        filtered = filtered.filter(g => g.title.toLowerCase().includes(term));
    }

    renderGames(filtered);
}

searchInput.addEventListener('input', applyFilters);

// Modal Logic
const modal = document.getElementById('game-modal');
let selectedGame = null;

function openModal(id) {
    selectedGame = games.find(g => g.id === id);
    
    document.getElementById('modal-img').src = selectedGame.image;
    document.getElementById('modal-title').innerText = selectedGame.title;
    document.getElementById('modal-genre').innerText = selectedGame.genre;
    document.getElementById('modal-desc').innerText = selectedGame.desc;
    document.getElementById('modal-buy-title').innerText = selectedGame.title;
    
    // Add btn listener
    const btn = document.getElementById('modal-add-btn');
    btn.onclick = () => addToCart(selectedGame);

    modal.classList.add('open');
    document.body.style.overflow = 'hidden'; // prevent scrolling
    
    // Re-render icons in modal if any
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = 'auto';
}

// Close modal on click outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Cart Logic
function addToCart(game) {
    cart.push(game);
    updateCartCount();
    closeModal();
    showToast();
}

function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.length;
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleCart() {
    if (cart.length === 0) {
        alert("Giỏ hàng của bạn đang trống!");
        return;
    }
    alert(`Các mặt hàng trong giỏ:\n${cart.map(i => i.title).join('\n')}`);
}
