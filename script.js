// הגדרות חיבור - Supabase Settings
const SUPABASE_URL = 'https://acjxhufnotvweoeoccvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjanhodWZub3R2d2VvZW9jY3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE2MjQsImV4cCI6MjA4NTc1NzYyNH0.TF79yXwg9T8sThhfw4P9vvb9iWY9qkzUVh6t-_v38iA';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false
    },
    global: {
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    }
});

let allDeceased = []; // כאן נשמור את כל הנתונים מה-DB
let displayedCount = 0;
const ITEMS_PER_PAGE = 30;
let isLoading = false;
let hasMoreData = true;
let searchDebounceTimer = null;

// Pull-to-Refresh variables
let pullStartY = 0;
let isPulling = false;
let pullDistance = 0;
const pullThreshold = 80;

// فونقضية لشليفت النتونيم منهطبلة death
async function loadData(forceRefresh = false) {
    // בדיקת cache תחילה
    const cachedData = localStorage.getItem('memorial_cache');
    const cacheTime = localStorage.getItem('memorial_cache_time');
    const now = Date.now();
    
    // אם יש cache ולא עבר יותר מ-5 דקות (אלא אם זה forceRefresh)
    if (!forceRefresh && cachedData && cacheTime && (now - parseInt(cacheTime)) < 300000) {
        allDeceased = JSON.parse(cachedData);
        renderInitialCards();
        updateCounter(allDeceased.length);
        return;
    }
    
    // عرض loading icon
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
            <div class="relative w-20 h-20">
                <div class="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
                <div class="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p class="mt-6 text-gray-600 text-lg font-semibold">جاري التحميل...</p>
        </div>
    `;
    
    const { data, error } = await supabaseClient
        .from('death')
        .select(`
            death_id,
            title,
            first_name,
            middle_name,
            last_name,
            nickname,
            gender,
            birth_date,
            death_date,
            city,
            images!left(url, cover, display)
        `)
        .order('death_date', { ascending: false }); // ترتيب تنازلي - الأحدث أولاً

    if (error) {
        console.error('טעות בשליפת נתונים:', error);
        container.innerHTML = `
            <div class="text-center py-20">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-red-600 text-lg font-semibold">حدث خطأ في التحميل</p>
            </div>
        `;
        return;
    }

    console.log('Data from database:', data);
    console.log('First person images:', data[0]?.images);

    allDeceased = data;
    
    // שמירה ב-cache
    try {
        localStorage.setItem('memorial_cache', JSON.stringify(data));
        localStorage.setItem('memorial_cache_time', Date.now().toString());
    } catch (e) {
        console.warn('Cache save failed:', e);
    }
    
    renderInitialCards();
    setupInfiniteScroll();
    updateCounter(allDeceased.length);
}

// טעינה הדרגתית ראשונית
function renderInitialCards() {
    displayedCount = 0;
    document.getElementById('resultsContainer').innerHTML = '';
    loadMoreCards();
}

// טעינת כרטיסים נוספים
function loadMoreCards() {
    if (isLoading || !hasMoreData) return;
    
    console.log('📚 Loading more cards...', { displayedCount, total: allDeceased.length });
    isLoading = true;
    const container = document.getElementById('resultsContainer');
    
    // הסרת כפתור אם קיים
    const existingBtn = document.getElementById('mainLoadMoreBtn');
    if (existingBtn) existingBtn.remove();
    
    // הצגת skeleton loader
    const loadingEl = document.createElement('div');
    loadingEl.id = 'loading-more';
    loadingEl.className = 'text-center py-8';
    loadingEl.innerHTML = '<div class="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>';
    container.appendChild(loadingEl);
    
    setTimeout(() => {
        const nextBatch = allDeceased.slice(displayedCount, displayedCount + ITEMS_PER_PAGE);
        
        if (nextBatch.length === 0) {
            hasMoreData = false;
            loadingEl?.remove();
            isLoading = false;
            console.log('✅ No more data to load');
            return;
        }
        
        renderCards(nextBatch, true); // true = append mode
        displayedCount += nextBatch.length;
        
        if (displayedCount >= allDeceased.length) {
            hasMoreData = false;
            console.log('✅ All cards loaded');
        } else {
            // הוספת כפתור "טען עוד"
            addLoadMoreButton();
        }
        
        loadingEl?.remove();
        isLoading = false;
        console.log('✅ Loaded', nextBatch.length, 'cards. Total displayed:', displayedCount);
    }, 100);
}

function addLoadMoreButton() {
    const container = document.getElementById('resultsContainer');
    const existingBtn = document.getElementById('mainLoadMoreBtn');
    if (existingBtn) return;
    
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'mainLoadMoreBtn';
    loadMoreBtn.className = 'w-full mt-8 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-5 px-6 rounded-2xl shadow-xl transition-all active:scale-95 text-lg';
    loadMoreBtn.innerHTML = '⬇️ تحميل المزيد... (عرض ' + displayedCount + ' من ' + allDeceased.length + ')';
    loadMoreBtn.onclick = () => {
        loadMoreBtn.innerHTML = '<div class="inline-block h-6 w-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>';
        setTimeout(() => loadMoreCards(), 200);
    };
    container.appendChild(loadMoreBtn);
}

// פונקציה לחישוב גיל (מעוגל כלפי מטה)
function calculateAge(birthDate, deathDate) {
    if (!birthDate || !deathDate) return null;
    
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    
    if (isNaN(birth.getTime()) || isNaN(death.getTime())) return null;
    
    let age = death.getFullYear() - birth.getFullYear();
    const monthDiff = death.getMonth() - birth.getMonth();
    
    // תיקון אם עוד לא הגיע יום ההולדת השנתי
    if (monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())) {
        age--;
    }
    
    return Math.floor(age);
}

// פונקציה להצגת הכרטיסים
function renderCards(data, append = false) {
    const container = document.getElementById('resultsContainer');
    if (!append) {
        container.innerHTML = ''; // ניקוי הרשימה
        displayedCount = 0;
        hasMoreData = true;
    }

    const labels = {
        ar: { birth: 'تاريخ الميلاد:', death: 'تاريخ الوفاة:', age: 'العمر:' },
        he: { birth: 'שנת לידה:', death: 'שנת פטירה:', age: 'גיל:' }
    };

    data.forEach(person => {
        // Facebook-style card with prominent image
        const nameColor = person.gender === 'female' ? 'text-pink-600' : 'text-blue-600';
        
        // Build full name
        const title = person.title || '';
        const firstName = person.first_name || '';
        const middleName = person.middle_name || '';
        const lastName = person.last_name || '';
        const nickname = person.nickname ? `<span class="text-gray-500 text-sm">(${person.nickname})</span>` : '';
        
        const fullName = `${title} ${firstName} ${middleName} ${lastName}`.trim();
        
        // Calculate age
        const age = calculateAge(person.birth_date, person.death_date);
        const ageDisplay = age !== null ? `<span class="font-bold text-gray-900">${age}</span>` : '';
        
        // Format full dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '---';
            const date = new Date(dateStr);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };
        
        const birthDate = formatDate(person.birth_date);
        const deathDate = formatDate(person.death_date);
        
        // Get cover image from images array
        const coverImage = person.images?.find(img => img.cover === true && img.display === true);
        const baseImagePath = 'https://acjxhufnotvweoeoccvt.supabase.co/storage/v1/object/public/photos/';
        
        // Default avatar images based on gender
        const defaultAvatar = person.gender === 'female' 
            ? baseImagePath + 'female-avatar.png'
            : baseImagePath + 'male-avatar.png';
        
        let imageSection;
        if (coverImage && coverImage.url) {
            const fullImageUrl = baseImagePath + coverImage.url;
            imageSection = `
                <div class="w-full aspect-square bg-gray-50 relative overflow-hidden flex items-center justify-center">
                    <img src="${fullImageUrl}" 
                         alt="${fullName}" 
                         class="w-full h-full object-contain"
                         loading="lazy"
                         decoding="async"
                         fetchpriority="low"
                         onerror="this.parentElement.style.cssText='background: #f9fafb;'; this.src='${defaultAvatar}';">
                    ${ageDisplay ? `
                    <div class="absolute bottom-3 right-3 backdrop-blur-md bg-white/95 px-4 py-2 rounded-xl shadow-lg border border-gray-200/50">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">${age}</span>
                            <span class="text-xs font-semibold text-gray-600">سنة</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            imageSection = `
                <div class="w-full aspect-square bg-gray-50 relative overflow-hidden">
                    <img src="${defaultAvatar}" 
                         alt="${fullName}" 
                         class="w-full h-full object-contain p-4"
                         loading="lazy"
                         decoding="async">
                    ${ageDisplay ? `
                    <div class="absolute bottom-3 right-3 backdrop-blur-md bg-white/95 px-4 py-2 rounded-xl shadow-lg border border-gray-200/50">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">${age}</span>
                            <span class="text-xs font-semibold text-gray-600">سنة</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        
        const card = `
            <div class="memorial-card rounded-lg shadow-sm overflow-hidden cursor-pointer touch-manipulation" onclick="window.location.href='person.html?id=${person.death_id}'" style="-webkit-tap-highlight-color: transparent;">
                <!-- Name Section - First -->
                <div class="p-4 pb-3 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                    <h2 class="text-lg font-bold ${nameColor} leading-snug text-right drop-shadow-sm">
                        <span class="inline-block">${fullName}</span>${nickname ? ` <span class="text-gray-600 text-base font-normal inline-block">${nickname}</span>` : ''}
                    </h2>
                </div>
                
                <!-- Prominent Image Section -->
                ${imageSection}
                
                <!-- Info Section -->
                <div class="p-3">
                    <!-- Birth Date -->
                    <div class="mb-2 text-right">
                        <div class="text-xs text-gray-500 mb-0.5">
                            ${currentLang === 'ar' ? 'تاريخ الولادة' : 'תאריך לידה'}
                        </div>
                        <div class="text-sm font-semibold text-gray-900" data-birth-year="${person.birth_date ? new Date(person.birth_date).getFullYear() : ''}">
                            ${birthDate}
                        </div>
                    </div>
                    
                    <!-- Death Date -->
                    <div class="mb-1 text-right">
                        <div class="text-xs text-gray-500 mb-0.5">
                            ${currentLang === 'ar' ? 'تاريخ الوفاة' : 'תאריך פטירה'}
                        </div>
                        <div class="text-sm font-semibold text-gray-900" data-death-year="${person.death_date ? new Date(person.death_date).getFullYear() : ''}">
                            ${deathDate}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}

// Intersection Observer לinfinite scroll
let scrollObserver = null;

function setupInfiniteScroll() {
    if (scrollObserver) scrollObserver.disconnect();
    
    console.log('🔄 Setting up infinite scroll...');
    const container = document.getElementById('resultsContainer');
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.className = 'h-20';
    container.appendChild(sentinel);
    
    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMoreData && !isLoading) {
                console.log('👁️ Sentinel visible, loading more...');
                loadMoreCards();
            }
        });
    }, {
        rootMargin: '200px'
    });
    
    scrollObserver.observe(sentinel);
    console.log('✅ Infinite scroll ready');
}

// פונקציית עדכון מונה (עבור desktop ו-mobile)
function updateCounter(count) {
    const desktopCounter = document.getElementById('totalCounter');
    const mobileCounter = document.getElementById('totalCounterMobile');
    
    if (desktopCounter) desktopCounter.innerText = count;
    if (mobileCounter) mobileCounter.innerText = count;
}

// לוגיקת החיפוש בזמן אמת
function setupSearch() {
    const inputs = ['searchGeneralModal', 'searchFirstNameModal', 'searchLastNameModal', 'searchBirthYearModal', 'searchDeathYearModal'];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        
        element.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                const general = document.getElementById('searchGeneralModal')?.value.toLowerCase() || '';
                const first = document.getElementById('searchFirstNameModal')?.value.toLowerCase() || '';
                const last = document.getElementById('searchLastNameModal')?.value.toLowerCase() || '';
                const birthYear = document.getElementById('searchBirthYearModal')?.value || '';
                const deathYear = document.getElementById('searchDeathYearModal')?.value || '';

                const filtered = allDeceased.filter(person => {
                    const fullText = `${person.first_name || ''} ${person.middle_name || ''} ${person.last_name || ''} ${person.nickname || ''} ${person.title || ''}`.toLowerCase();
                    const matchesGeneral = !general || fullText.includes(general);
                    const matchesFirst = !first || (person.first_name || '').toLowerCase().includes(first);
                    const matchesLast = !last || (person.last_name || '').toLowerCase().includes(last);
                    
                    const personBirthYear = person.birth_date ? new Date(person.birth_date).getFullYear().toString() : '';
                    const personDeathYear = person.death_date ? new Date(person.death_date).getFullYear().toString() : '';
                    const matchesBirthYear = !birthYear || personBirthYear === birthYear;
                    const matchesDeathYear = !deathYear || personDeathYear === deathYear;

                    return matchesGeneral && matchesFirst && matchesLast && matchesBirthYear && matchesDeathYear;
                });

                renderCards(filtered);
                updateCounter(filtered.length);
            }, 300);
        });
    });
}

// מערכת שפה
let currentLang = 'ar'; // ברירת מחדל ערבית

// Auto-hide header on scroll (Facebook style)
let lastScrollTop = 0;
let scrollTimeout;

window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const header = document.querySelector('header');
        const bottomNav = document.querySelector('.bottom-nav');
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down - hide header and bottom nav
            if (header) header.classList.add('header-hidden');
            if (bottomNav) bottomNav.classList.add('nav-hidden');
        } else {
            // Scrolling up - show header and bottom nav
            if (header) header.classList.remove('header-hidden');
            if (bottomNav) bottomNav.classList.remove('nav-hidden');
        }
        
        lastScrollTop = scrollTop;
    }, 100);
});

// Search Modal
function openSearchModal() {
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchGeneralModal').focus();
}

function closeSearchModal() {
    document.getElementById('searchModal').classList.remove('active');
}

function clearSearch() {
    // مسح جميع حقول البحث
    const inputs = ['searchGeneralModal', 'searchFirstNameModal', 'searchLastNameModal', 'searchBirthYearModal', 'searchDeathYearModal'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    // إعادة عرض جميع البطاقات
    renderCards(allDeceased);
    updateCounter(allDeceased.length);
}

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'he' : 'ar';
    localStorage.setItem('language', currentLang);
    updateLanguage();
}

function updateLanguage() {
    const html = document.documentElement;
    const langButton = document.getElementById('langToggle');
    
    if (currentLang === 'ar') {
        html.setAttribute('lang', 'ar');
        html.setAttribute('dir', 'rtl');
        langButton.textContent = 'עברית';
    } else {
        html.setAttribute('lang', 'he');
        html.setAttribute('dir', 'rtl');
        langButton.textContent = 'العربية';
    }
    
    // עדכון כל האלמנטים עם data-ar ו-data-he
    document.querySelectorAll('[data-ar][data-he]').forEach(el => {
        if (el.tagName === 'INPUT') {
            el.placeholder = el.getAttribute('data-' + currentLang);
        } else {
            el.textContent = el.getAttribute('data-' + currentLang);
        }
    });
    
    // עדכון הכרטיסים
    if (allDeceased.length > 0) {
        renderCards(allDeceased);
    }
}

// הפעלה ברגע שהדף נטען
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded fired - script.js loaded successfully');
    
    // שחזור שפה שמורה
    const savedLang = localStorage.getItem('language');
    if (savedLang) currentLang = savedLang;
    
    // הגדרת כפתור החלפת שפה
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);
    
    // Search modal - only if elements exist
    const searchBtn = document.getElementById('searchBtn');
    const closeSearch = document.getElementById('closeSearch');
    const clearSearchBtn = document.getElementById('clearSearch');
    const searchModal = document.getElementById('searchModal');
    
    if (searchBtn) searchBtn.addEventListener('click', openSearchModal);
    if (closeSearch) closeSearch.addEventListener('click', closeSearchModal);
    if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);
    if (searchModal) {
        searchModal.addEventListener('click', (e) => {
            if (e.target.id === 'searchModal') closeSearchModal();
        });
    }
    
    // Bottom Navigation - Mobile Search Button
    const navSearchBtn = document.getElementById('navSearch');
    if (navSearchBtn) {
        navSearchBtn.addEventListener('click', openSearchModal);
    }
    
    updateLanguage();
    
    // Check if we need to force refresh (cache was cleared from admin)
    const needsRefresh = localStorage.getItem('needs_refresh') === 'true';
    if (needsRefresh) {
        localStorage.removeItem('needs_refresh');
        console.log('🔄 Admin made changes, forcing refresh...');
        loadData(true);
    } else {
        loadData(false);
    }
    
    setupSearch();
    
    console.log('📱 About to setup pull-to-refresh...');
    try {
        setupPullToRefresh();
    } catch (error) {
        console.error('❌ Error setting up pull-to-refresh:', error);
    }
});

// Auto-refresh when returning to page
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('👁️ Page became visible');
        
        // Reinitialize pull-to-refresh
        setupPullToRefresh();
        
        // Page became visible - check if needs refresh
        const needsRefresh = localStorage.getItem('needs_refresh') === 'true';
        if (needsRefresh) {
            localStorage.removeItem('needs_refresh');
            console.log('🔄 Returning to page, refreshing data...');
            loadData(true);
        }
    }
});

// Handle page restore from bfcache (back-forward cache)
window.addEventListener('pageshow', (event) => {
    console.log('📄 pageshow event fired, persisted:', event.persisted);
    if (event.persisted) {
        // Page was restored from bfcache - reinitialize
        console.log('🔄 Page restored from cache, reinitializing pull-to-refresh...');
        setupPullToRefresh();
        
        // Check if data needs refresh
        const needsRefresh = localStorage.getItem('needs_refresh') === 'true';
        if (needsRefresh) {
            localStorage.removeItem('needs_refresh');
            console.log('🔄 Auto-refreshing after admin changes...');
            loadData(true);
        }
    }
});

// Additional handler for window focus
window.addEventListener('focus', () => {
    console.log('🎯 Window gained focus, reinitializing pull-to-refresh...');
    setupPullToRefresh();
});

// Pull-to-Refresh functionality
let pullToRefreshInitialized = false;
let pullIndicator = null;
let pullToRefreshController = null; // AbortController to manage listeners

function setupPullToRefresh() {
    console.log('🔧 [START] Setting up pull-to-refresh... controller exists:', !!pullToRefreshController);
    console.log('📊 State: pullStartY=' + pullStartY + ', isPulling=' + isPulling + ', pullDistance=' + pullDistance);
    
    // Abort old listeners if they exist
    if (pullToRefreshController) {
        try {
            pullToRefreshController.abort();
            console.log('🧹 Aborted old pull-to-refresh listeners');
        } catch (e) {
            console.warn('⚠️ Error aborting controller:', e);
        }
    }
    
    // Reset all pull-to-refresh state variables
    pullStartY = 0;
    isPulling = false;
    pullDistance = 0;
    
    // Remove any existing pull indicator
    const existingIndicator = document.getElementById('pull-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
        console.log('🗑️ Removed existing pull indicator');
    }
    pullIndicator = null;
    
    // Create new controller
    pullToRefreshController = new AbortController();
    const signal = pullToRefreshController.signal;
    
    // Define handlers
    const touchStartHandler = (e) => {
        console.log('👆 touchstart fired! scrollY=' + window.scrollY);
        if (window.scrollY === 0) {
            pullStartY = e.touches[0].pageY;
            isPulling = true;
            console.log('✅ Pull started at Y=' + pullStartY);
        } else {
            console.log('⚠️ Not at top, scrollY=' + window.scrollY);
        }
    };
    
    const touchMoveHandler = (e) => {
        if (!isPulling || window.scrollY > 0) return;
        
        const currentY = e.touches[0].pageY;
        pullDistance = Math.min(currentY - pullStartY, 120);
        
        if (pullDistance > 0) {
            // Create pull indicator if it doesn't exist
            if (!pullIndicator) {
                pullIndicator = document.createElement('div');
                pullIndicator.id = 'pull-indicator';
                pullIndicator.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: ${pullDistance}px;
                    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    z-index: 9999;
                    transition: height 0.1s ease;
                `;
                
                if (pullDistance >= pullThreshold) {
                    pullIndicator.innerHTML = `
                        <div class="flex items-center gap-2">
                            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>اترك لتحديث...</span>
                        </div>
                    `;
                } else {
                    pullIndicator.innerHTML = `
                        <div class="flex items-center gap-2">
                            <span>⬇️</span>
                            <span>اسحب للتحديث...</span>
                        </div>
                    `;
                }
                
                document.body.prepend(pullIndicator);
            } else {
                pullIndicator.style.height = pullDistance + 'px';
                
                if (pullDistance >= pullThreshold) {
                    pullIndicator.innerHTML = `
                        <div class="flex items-center gap-2">
                            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>اترك لتحديث...</span>
                        </div>
                    `;
                } else {
                    pullIndicator.innerHTML = `
                        <div class="flex items-center gap-2">
                            <span>⬇️</span>
                            <span>اسحب للتحديث...</span>
                        </div>
                    `;
                }
            }
        }
    };
    
    const touchEndHandler = async () => {
        if (!isPulling) return;
        
        if (pullDistance >= pullThreshold) {
            // Trigger refresh
            if (pullIndicator) {
                pullIndicator.innerHTML = `
                    <div class="flex items-center gap-2">
                        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>جاري التحديث...</span>
                    </div>
                `;
            }
            
            // Force refresh
            await loadData(true);
            
            // Show success message
            if (pullIndicator) {
                pullIndicator.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span>✅</span>
                        <span>تم التحديث!</span>
                    </div>
                `;
                
                setTimeout(() => {
                    if (pullIndicator && pullIndicator.parentNode) {
                        pullIndicator.style.transition = 'all 0.3s ease';
                        pullIndicator.style.height = '0px';
                        pullIndicator.style.opacity = '0';
                        setTimeout(() => {
                            if (pullIndicator && pullIndicator.parentNode) {
                                pullIndicator.remove();
                            }
                            pullIndicator = null;
                        }, 300);
                    }
                }, 500);
            }
        } else {
            // Remove indicator
            if (pullIndicator) {
                pullIndicator.style.transition = 'all 0.2s ease';
                pullIndicator.style.height = '0px';
                pullIndicator.style.opacity = '0';
                setTimeout(() => {
                    if (pullIndicator && pullIndicator.parentNode) {
                        pullIndicator.remove();
                    }
                    pullIndicator = null;
                }, 200);
            }
        }
        
        isPulling = false;
        pullDistance = 0;
        pullStartY = 0;
    };
    
    // Add listeners with AbortController signal
    console.log('🎧 Adding touch event listeners...');
    document.addEventListener('touchstart', touchStartHandler, { passive: true, signal });
    console.log('  ✓ touchstart added');
    document.addEventListener('touchmove', touchMoveHandler, { passive: true, signal });
    console.log('  ✓ touchmove added');
    document.addEventListener('touchend', touchEndHandler, { passive: true, signal });
    console.log('  ✓ touchend added');
    
    pullToRefreshInitialized = true;
    console.log('✅ [DONE] Pull-to-refresh initialized with AbortController');
}