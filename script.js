import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE SETUP ---
// Using your specific configuration
const firebaseConfig = {
    apiKey: "AIzaSyCqyEB-WagVK1bInuz7EAzb8q96yt7j1ww",
    authDomain: "hoi-ae-store.firebaseapp.com",
    projectId: "hoi-ae-store",
    storageBucket: "hoi-ae-store.firebasestorage.app",
    messagingSenderId: "618880423826",
    appId: "1:618880423826:web:e13227cbeebd3627b9534b",
    measurementId: "G-SSDSFNVC18"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Using a static App ID for data organization within your project
const appId = 'hoi-ae-store-v1';
 
let currentUser = null;
// Since we have direct config now, we assume it's available
let isFirebaseAvailable = true;

// Initialize Auth
async function initAuth() {
    if (!isFirebaseAvailable) return;
    try {
        // Try anonymous sign-in directly since we are running locally/web
        await signInAnonymously(auth);
        
        currentUser = auth.currentUser;
        // Start listening to posts and games only after auth
        loadCommunityPosts();
        loadUserGames();
    } catch (error) {
        console.error("Auth failed", error);
        // Fallback for AI environment if custom token is present (optional safety)
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
             try {
                await signInWithCustomToken(auth, __initial_auth_token);
                currentUser = auth.currentUser;
                loadCommunityPosts();
                loadUserGames();
             } catch(e) { console.error("Fallback Auth failed", e); }
        }
    }
}
initAuth();

// Load Posts Real-time
function loadCommunityPosts() {
    if (!currentUser) {
        const postsContainer = document.getElementById('community-feed');
        if (postsContainer) postsContainer.innerHTML = '<div class="loading-text">Đang kết nối...</div>';
        return;
    }
    
    const postsContainer = document.getElementById('community-feed');
    const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'community_posts');

    onSnapshot(postsRef, (snapshot) => {
        const posts = [];
        snapshot.forEach(doc => {
            posts.push({ id: doc.id, ...doc.data() });
        });

        posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (posts.length === 0) {
            postsContainer.innerHTML = '<div class="loading-text">Chưa có bài viết nào. Hãy là người đầu tiên!</div>';
            return;
        }

        postsContainer.innerHTML = posts.map(post => {
            const upvotes = post.upvotes || 0;
            const downvotes = post.downvotes || 0;
            const score = upvotes - downvotes;
            const replies = post.replies || [];
            
            const isUpvoted = post.upvotedBy && post.upvotedBy.includes(currentUser.uid);
            const isDownvoted = post.downvotedBy && post.downvotedBy.includes(currentUser.uid);
            
            return `
            <div class="community-post">
                <div class="post-header">
                    <span class="post-author">${escapeHtml(post.author)}</span>
                    <span>${new Date(post.timestamp).toLocaleString('vi-VN')}</span>
                </div>
                <div class="post-content">${escapeHtml(post.content)}</div>
                
                <div class="post-actions">
                    <div class="vote-group">
                        <button class="vote-btn ${isUpvoted ? 'active' : ''}" onclick="window.votePost('${post.id}', 'up')" title="Upvote">
                            <i data-lucide="chevron-up"></i>
                        </button>
                        <span class="vote-count" style="color: ${score > 0 ? '#a4d007' : (score < 0 ? '#ff4d4d' : 'inherit')}">${score}</span>
                        <button class="vote-btn down ${isDownvoted ? 'active' : ''}" onclick="window.votePost('${post.id}', 'down')" title="Downvote">
                            <i data-lucide="chevron-down"></i>
                        </button>
                    </div>
                    <button class="reply-btn" onclick="window.toggleReply('${post.id}')">
                        <i data-lucide="message-circle" size="16"></i> Trả lời (${replies.length})
                    </button>
                </div>

                <div class="replies-section">
                    ${replies.map(r => `
                        <div class="reply-item">
                            <div class="post-header" style="margin-bottom: 5px;">
                                <span class="post-author" style="font-size: 13px;">${escapeHtml(r.author)}</span>
                                <span style="font-size: 11px;">${new Date(r.timestamp).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div class="post-content" style="font-size: 14px;">${escapeHtml(r.content)}</div>
                        </div>
                    `).join('')}
                    
                    <div id="reply-form-${post.id}" class="reply-form">
                        <input type="text" id="reply-author-${post.id}" class="form-input" placeholder="Tên của bạn" style="padding: 8px;">
                        <textarea id="reply-content-${post.id}" class="form-textarea" placeholder="Viết phản hồi của bạn..." style="min-height: 60px; padding: 8px;"></textarea>
                        <div style="display:flex; justify-content: flex-end; gap: 10px;">
                            <button class="btn-submit" style="margin-top:0; padding: 8px 15px; font-size: 13px; background: #2a475e;" onclick="window.toggleReply('${post.id}')">Hủy</button>
                            <button class="btn-submit" style="margin-top:0; padding: 8px 15px; font-size: 13px;" onclick="window.submitReply('${post.id}')">Gửi</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join('');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }, (error) => {
        console.error("Error loading posts:", error);
    });
}

// Vote Function
window.votePost = async function(postId, type) {
    if (!currentUser) { alert("Vui lòng đợi kết nối..."); return; }
    
    const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_posts', postId);
    const uid = currentUser.uid;

    try {
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) return;
        
        const post = postSnap.data();
        const upvotedBy = post.upvotedBy || [];
        const downvotedBy = post.downvotedBy || [];

        if (type === 'up') {
            if (upvotedBy.includes(uid)) {
                await updateDoc(postRef, {
                    upvotedBy: arrayRemove(uid),
                    upvotes: increment(-1)
                });
            } else if (downvotedBy.includes(uid)) {
                await updateDoc(postRef, {
                    downvotedBy: arrayRemove(uid),
                    downvotes: increment(-1),
                    upvotedBy: arrayUnion(uid),
                    upvotes: increment(1)
                });
            } else {
                await updateDoc(postRef, {
                    upvotedBy: arrayUnion(uid),
                    upvotes: increment(1)
                });
            }
        } else { // type === 'down'
            if (downvotedBy.includes(uid)) {
                await updateDoc(postRef, {
                    downvotedBy: arrayRemove(uid),
                    downvotes: increment(-1)
                });
            } else if (upvotedBy.includes(uid)) {
                await updateDoc(postRef, {
                    upvotedBy: arrayRemove(uid),
                    upvotes: increment(-1),
                    downvotedBy: arrayUnion(uid),
                    downvotes: increment(1)
                });
            } else {
                await updateDoc(postRef, {
                    downvotedBy: arrayUnion(uid),
                    downvotes: increment(1)
                });
            }
        }
    } catch (error) {
        console.error("Vote failed:", error);
    }
}

window.toggleReply = function(postId) {
    const form = document.getElementById(`reply-form-${postId}`);
    if (form) form.classList.toggle('open');
}

window.submitReply = async function(postId) {
    if (!currentUser) return;
    
    const authorInput = document.getElementById(`reply-author-${postId}`);
    const contentInput = document.getElementById(`reply-content-${postId}`);
    
    if (!authorInput.value.trim() || !contentInput.value.trim()) {
        alert("Vui lòng nhập tên và nội dung phản hồi.");
        return;
    }

    const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_posts', postId);
    const newReply = {
        author: authorInput.value,
        content: contentInput.value,
        timestamp: Date.now(),
        userId: currentUser.uid
    };

    try {
        await updateDoc(postRef, {
            replies: arrayUnion(newReply)
        });
        contentInput.value = '';
        window.toggleReply(postId);
    } catch (error) {
        console.error("Reply failed:", error);
        alert("Lỗi khi gửi phản hồi.");
    }
}

// Load Uploaded Games Real-time
function loadUserGames() {
    if (!currentUser) return;
    const gamesRef = collection(db, 'artifacts', appId, 'public', 'data', 'uploaded_games');

    onSnapshot(gamesRef, (snapshot) => {
        let uploadedGames = [];
        snapshot.forEach(doc => {
            uploadedGames.push({ id: doc.id, ...doc.data(), isUploaded: true });
        });
        
        allGames = [...staticGames, ...uploadedGames];
        
        window.renderFeatured();
        window.filterByGenre(currentFilter);
        
    }, (error) => {
        console.error("Error loading games:", error);
    });
}

// Submit Post
window.submitPost = async function(e) {
    e.preventDefault();
    const authorInput = document.getElementById('post-author');
    const contentInput = document.getElementById('post-content');
    const btn = e.target.querySelector('button');

    if (!authorInput.value.trim() || !contentInput.value.trim()) return;
    if (!currentUser) {
        alert("Đang kết nối database...");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Đang đăng...";

    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community_posts'), {
            author: authorInput.value,
            content: contentInput.value,
            timestamp: Date.now(),
            userId: currentUser.uid
        });
        contentInput.value = '';
    } catch (error) {
        console.error("Error posting:", error);
        alert("Lỗi khi đăng bài. Vui lòng thử lại.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Đăng bài";
    }
}

// Submit Game
window.submitGame = async function(e) {
    e.preventDefault();
    
    const developer = document.getElementById('game-dev').value;
    const email = document.getElementById('game-email').value;
    const title = document.getElementById('game-title').value;
    const desc = document.getElementById('game-desc').value;
    const downloadLink = document.getElementById('game-link').value;
    const demoLink = document.getElementById('game-demo').value;
    const genre = document.getElementById('game-genre').value;
    const image = document.getElementById('game-image').value;
    const notes = document.getElementById('game-notes').value;
    
    const btn = e.target.querySelector('button');

    if (!currentUser) {
        alert("Đang kết nối database...");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Đang xử lý...";

    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'uploaded_games'), {
            developer: developer,
            email: email,
            title: title,
            desc: desc,
            downloadUrl: downloadLink,
            demoUrl: demoLink,
            genre: genre,
            image: image,
            notes: notes,
            releaseDate: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            userId: currentUser.uid
        });
        
        alert("Đăng game thành công! Game của bạn đã xuất hiện trên cửa hàng.");
        e.target.reset();
        window.switchPage('store', document.querySelector('.nav-link'));
    } catch (error) {
        console.error("Error submitting game:", error);
        alert("Lỗi khi đăng game. Vui lòng thử lại.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Đăng game";
    }
}

// Submit Report
window.submitReport = async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('report-name').value;
    const email = document.getElementById('report-email').value;
    const type = document.getElementById('report-type').value;
    const desc = document.getElementById('report-desc').value;
    
    const btn = e.target.querySelector('button');

    if (!currentUser) {
        alert("Đang kết nối database...");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Đang gửi...";

    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), {
            reporterName: name,
            reporterEmail: email,
            issueType: type,
            description: desc,
            timestamp: Date.now(),
            userId: currentUser.uid
        });
        
        alert('Cảm ơn bạn đã báo cáo! Chúng tôi sẽ xem xét sớm nhất.');
        e.target.reset();
        window.switchPage('store', document.querySelector('.nav-link'));
    } catch (error) {
        console.error("Error submitting report:", error);
        alert("Lỗi khi gửi báo cáo. Vui lòng thử lại.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Gửi báo cáo";
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const postForm = document.getElementById('post-form');
if(postForm) {
    postForm.addEventListener('submit', window.submitPost);
}

/* --- STANDARD JS LOGIC --- */
 
window.formatGameDate = function(dateString) {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Static Data 
const staticGames = [
    {
        id: 1,
        title: "Game 1",
        genre: "Nhập vai (RPG)",
        image: "https://placehold.co/600x400/101010/101010.png",
        gallery: [
            "https://placehold.co/800x400/101010/ffffff.png?text=Slide+1",
            "https://placehold.co/800x400/202020/ffffff.png?text=Slide+2",
            "https://placehold.co/800x400/303030/ffffff.png?text=Slide+3"
        ],
        desc: "Bước vào một tương lai đen tối nơi ánh đèn neon gặp gỡ thép lạnh.",
        featured: true,
        downloadUrl: "https://itch.io/games",
        releaseDate: "2025-10-12"
    },
    {
        id: 2,
        title: "Game 2",
        genre: "Hành động",
        image: "https://placehold.co/600x400/2b2005/2b2005.png",
        gallery: [
            "https://placehold.co/800x400/2b2005/ffffff.png?text=Action+1",
            "https://placehold.co/800x400/4a3810/ffffff.png?text=Action+2"
        ],
        desc: "Trỗi dậy, Kẻ bị lu mờ, và được dẫn dắt bởi ân sủng.",
        featured: true,
        downloadUrl: "https://github.com",
        releaseDate: "2024-02-25"
    },
    {
        id: 3,
        title: "Game 3",
        genre: "Mô phỏng",
        image: "https://placehold.co/600x400/000033/000033.png",
        gallery: [
            "https://placehold.co/800x400/000033/ffffff.png?text=Space+1"
        ],
        desc: "Khám phá dải ngân hà, giao thương với các nền văn minh ngoài hành tinh.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2023-11-15"
    },
    {
        id: 4,
        title: "Game 4",
        genre: "Phiêu lưu",
        image: "https://placehold.co/600x400/4a0e0e/4a0e0e.png",
        gallery: [
            "https://placehold.co/800x400/4a0e0e/ffffff.png"
        ],
        desc: "Một trò chơi khám phá hầm ngục lấy cảm hứng cổ điển.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2024-05-01"
    },
    {
        id: 5,
        title: "Game 5",
        genre: "Thể thao",
        image: "https://placehold.co/600x400/990000/990000.png",
        gallery: [
            "https://placehold.co/800x400/990000/ffffff.png"
        ],
        desc: "Trò chơi mô phỏng đua xe đỉnh cao.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2024-08-20"
    },
    {
        id: 6,
        title: "Game 6",
        genre: "Chiến thuật",
        image: "https://placehold.co/600x400/1a1a1a/1a1a1a.png",
        gallery: [
            "https://placehold.co/800x400/1a1a1a/ffffff.png"
        ],
        desc: "Chiến thuật lén lút hạng nặng lấy bối cảnh Nhật Bản cổ đại.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2023-03-10"
    },
    {
        id: 7,
        title: "Game 7",
        genre: "Hành động",
        image: "https://placehold.co/600x400/2e3b23/2e3b23.png",
        gallery: [
            "https://placehold.co/800x400/2e3b23/ffffff.png"
        ],
        desc: "Sống sót qua ngày tận thế cùng bạn bè.",
        featured: true,
        downloadUrl: "https://itch.io",
        releaseDate: "2024-10-31"
    },
    {
        id: 8,
        title: "Game 8",
        genre: "Mô phỏng",
        image: "https://placehold.co/600x400/3e5c26/3e5c26.png",
        gallery: [
            "https://placehold.co/800x400/3e5c26/ffffff.png"
        ],
        desc: "Thư giãn và phát triển trang trại của bạn.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2023-06-15"
    },
    {
        id: 9,
        title: "Game 9",
        genre: "Nhập vai (RPG)",
        image: "https://placehold.co/600x400/220044/220044.png",
        gallery: [
            "https://placehold.co/800x400/220044/ffffff.png"
        ],
        desc: "Du hành qua hư không và chiến đấu với nỗi kinh hoàng.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2024-01-01"
    },
    {
        id: 10,
        title: "Game 10",
        genre: "Phiêu lưu",
        image: "https://placehold.co/600x400/3c8e22/3c8e22.png",
        gallery: [
            "https://placehold.co/800x400/3c8e22/ffffff.png"
        ],
        desc: "Xây dựng bất cứ thứ gì bạn có thể tưởng tượng.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2023-12-25"
    },
    {
        id: 11,
        title: "Game 11",
        genre: "Chiến thuật",
        image: "https://placehold.co/600x400/440000/440000.png",
        gallery: [
            "https://placehold.co/800x400/440000/ffffff.png"
        ],
        desc: "Chỉ huy các đội quân khổng lồ ở châu Âu.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2024-07-14"
    },
    {
        id: 12,
        title: "Game 12",
        genre: "Thể thao",
        image: "https://placehold.co/600x400/000000/000000.png",
        gallery: [
            "https://placehold.co/800x400/000000/ffffff.png"
        ],
        desc: "Trò chơi pong tương lai với vật lý.",
        featured: false,
        downloadUrl: "https://itch.io",
        releaseDate: "2024-09-09"
    }
];

let allGames = [...staticGames];
let currentFilter = 'All';
let selectedGame = null;
let currentModalImageIndex = 0;
 
// DOM Elements
const grid = document.getElementById('games-grid');
const featuredContainer = document.getElementById('featured-carousel');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('game-modal');
 
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    } else {
        console.error("Lucide library failed to load.");
    }
    renderFeatured();
    renderGames(allGames);
});
 
// Global functions for HTML interaction
window.renderFeatured = function() {
    const featuredGames = allGames.filter(g => g.featured);
    featuredContainer.innerHTML = featuredGames.map((game, index) => `
        <div class="featured-slide ${index === 0 ? 'active' : ''}" style="z-index: ${featuredGames.length - index}" onclick="openModal('${game.id}')">
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

    // Auto rotation logic needs to re-select elements
    if (window.carouselInterval) clearInterval(window.carouselInterval);
    
    window.carouselInterval = setInterval(() => {
        const slides = document.querySelectorAll('.featured-slide');
        if (slides.length === 0) return;
        
        let activeIndex = -1;
        slides.forEach((s, i) => {
            if (s.classList.contains('active')) activeIndex = i;
            s.classList.remove('active');
        });
        
        let nextIndex = (activeIndex + 1) % slides.length;
        slides[nextIndex].classList.add('active');
    }, 5000);
}

window.renderGames = function(gamesList) {
    grid.innerHTML = gamesList.map(game => `
        <div class="game-card" onclick="openModal('${game.id}')">
            <div class="card-image-container">
                <img src="${game.image}" class="card-image" alt="${game.title}" onerror="this.src='https://placehold.co/600x400/333/fff?text=No+Image'">
            </div>
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-tags">${game.genre}</div>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.filterByGenre = function(genre) {
    currentFilter = genre;
    document.getElementById('current-genre').innerText = genre === 'All' ? 'Tất cả sản phẩm' : genre;
    
    document.querySelectorAll('.filter-option').forEach(el => {
        el.classList.remove('active');
        if(el.innerText.includes(genre)) el.classList.add('active');
    });

    applyFilters();
}

function applyFilters() {
    let filtered = allGames;
    if (currentFilter !== 'All') {
        filtered = filtered.filter(g => g.genre === currentFilter);
    }
    const term = searchInput.value.toLowerCase();
    if (term) {
        filtered = filtered.filter(g => g.title.toLowerCase().includes(term));
    }
    renderGames(filtered);
}

searchInput.addEventListener('input', applyFilters);

window.openModal = function(id) {
    selectedGame = allGames.find(g => g.id == id);
    if (!selectedGame) return;
    
    currentModalImageIndex = 0; 
    
    document.getElementById('modal-title').innerText = selectedGame.title;
    document.getElementById('modal-genre').innerText = selectedGame.genre;
    
    const devText = selectedGame.developer ? `Nhà phát triển: ${selectedGame.developer}` : "Nhà phát triển: Hoi AE KHTN";
    document.getElementById('modal-dev').innerText = devText;

    let fullDesc = selectedGame.desc;
    if (selectedGame.notes) {
        fullDesc += `\n\n--- Ghi chú thêm ---\n${selectedGame.notes}`;
    }
    document.getElementById('modal-desc').innerText = fullDesc;
    
    document.getElementById('modal-buy-title').innerText = selectedGame.title;
    
    const releaseDate = formatGameDate(selectedGame.releaseDate);
    document.getElementById('modal-release').innerText = `Phát hành: ${releaseDate}`;
    
    const downloadBtn = document.getElementById('modal-download-btn');
    if (selectedGame.downloadUrl) {
        downloadBtn.href = selectedGame.downloadUrl;
        downloadBtn.style.display = 'inline-flex';
    } else {
        downloadBtn.style.display = 'none';
    }

    const demoBtn = document.getElementById('modal-demo-btn');
    if (selectedGame.demoUrl) {
        demoBtn.href = selectedGame.demoUrl;
        demoBtn.style.display = 'inline-flex';
    } else {
        demoBtn.style.display = 'none';
    }

    updateModalGallery();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden'; 
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.updateModalGallery = function() {
    const images = selectedGame.gallery || [selectedGame.image];
    const imgElement = document.getElementById('modal-gallery-img');
    imgElement.src = images[currentModalImageIndex];
}

window.nextModalSlide = function() {
    if (!selectedGame) return;
    const images = selectedGame.gallery || [selectedGame.image];
    currentModalImageIndex = (currentModalImageIndex + 1) % images.length;
    updateModalGallery();
}

window.prevModalSlide = function() {
    if (!selectedGame) return;
    const images = selectedGame.gallery || [selectedGame.image];
    currentModalImageIndex = (currentModalImageIndex - 1 + images.length) % images.length;
    updateModalGallery();
}

window.closeModal = function() {
    modal.classList.remove('open');
    document.body.style.overflow = 'auto';
}

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

window.switchPage = function(page, element) {
    document.getElementById('store-view').style.display = 'none';
    document.getElementById('report-view').style.display = 'none';
    document.getElementById('support-view').style.display = 'none';
    document.getElementById('community-view').style.display = 'none';
    document.getElementById('upload-view').style.display = 'none';
    
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    if(page === 'store') {
        document.getElementById('store-view').style.display = 'grid';
    } else if (page === 'report') {
        document.getElementById('report-view').style.display = 'block';
    } else if (page === 'support') {
        document.getElementById('support-view').style.display = 'block';
    } else if (page === 'community') {
        document.getElementById('community-view').style.display = 'block';
    } else if (page === 'upload') {
        document.getElementById('upload-view').style.display = 'block';
    }
    
    if(element) element.classList.add('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
