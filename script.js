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
        
        // Restore scroll position after initial render from cache
        setTimeout(() => {
            restoreScrollPosition();
        }, 150);
        
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
    
    // Restore scroll position after initial render
    setTimeout(() => {
        restoreScrollPosition();
    }, 150);
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

// Get correct plural form for Arabic and Hebrew
function getPluralForm(number, lang, unit) {
    if (lang === 'ar') {
        const forms = {
            minute: ['دقيقة', 'دقيقتان', 'دقائق', 'دقيقة'],
            hour: ['ساعة', 'ساعتان', 'ساعات', 'ساعة'],
            day: ['يوم', 'يومان', 'أيام', 'يوم'],
            week: ['أسبوع', 'أسبوعان', 'أسابيع', 'أسبوع'],
            month: ['شهر', 'شهران', 'أشهر', 'شهر'],
            year: ['سنة', 'سنتان', 'سنوات', 'سنة']
        };
        
        const unitForms = forms[unit];
        if (!unitForms) return unit;
        
        if (number === 1) return unitForms[0]; // مفرد
        if (number === 2) return unitForms[1]; // مثنى
        if (number >= 3 && number <= 10) return unitForms[2]; // جمع
        return unitForms[3]; // 11+
    } else if (lang === 'he') {
        const forms = {
            minute: ['דקה', 'דקות'],
            hour: ['שעה', 'שעות'],
            day: ['יום', 'ימים'],
            week: ['שבוע', 'שבועות'],
            month: ['חודש', 'חודשים'],
            year: ['שנה', 'שנים']
        };
        
        const unitForms = forms[unit];
        if (!unitForms) return unit;
        
        return number === 1 ? unitForms[0] : unitForms[1];
    }
    return unit;
}

// Calculate time since death (Facebook style)
function getTimeSinceDeath(deathDate) {
    if (!deathDate) return null;
    
    const death = new Date(deathDate);
    const now = new Date();
    const diffMs = now - death;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30.44);
    const diffYears = Math.floor(diffDays / 365.25);
    
    let timeText = '';
    let icon = '⏳';
    
    if (diffSecs < 60) {
        timeText = currentLang === 'ar' ? 'الآن' : 'עכשיו';
        icon = '⏰';
    } else if (diffMins < 60) {
        const minWord = getPluralForm(diffMins, currentLang, 'minute');
        timeText = currentLang === 'ar' ? `منذ ${diffMins} ${minWord}` : `לפני ${diffMins} ${minWord}`;
        icon = '⏰';
    } else if (diffHours < 24) {
        const hourWord = getPluralForm(diffHours, currentLang, 'hour');
        timeText = currentLang === 'ar' ? `منذ ${diffHours} ${hourWord}` : `לפני ${diffHours} ${hourWord}`;
        icon = '⏰';
    } else if (diffDays < 7) {
        const dayWord = getPluralForm(diffDays, currentLang, 'day');
        timeText = currentLang === 'ar' ? `منذ ${diffDays} ${dayWord}` : `לפני ${diffDays} ${dayWord}`;
        icon = '📅';
    } else if (diffWeeks < 4) {
        const weekWord = getPluralForm(diffWeeks, currentLang, 'week');
        timeText = currentLang === 'ar' ? `منذ ${diffWeeks} ${weekWord}` : `לפני ${diffWeeks} ${weekWord}`;
        icon = '📆';
    } else if (diffMonths < 12) {
        const monthWord = getPluralForm(diffMonths, currentLang, 'month');
        const remainingDays = diffDays - Math.floor(diffMonths * 30);
        if (remainingDays > 7) {
            const dayWord = getPluralForm(remainingDays, currentLang, 'day');
            timeText = currentLang === 'ar' ? 
                `منذ ${diffMonths} ${monthWord} و ${remainingDays} ${dayWord}` : 
                `לפני ${diffMonths} ${monthWord} ו-${remainingDays} ${dayWord}`;
        } else {
            timeText = currentLang === 'ar' ? `منذ ${diffMonths} ${monthWord}` : `לפני ${diffMonths} ${monthWord}`;
        }
        icon = '🗓️';
    } else {
        const yearWord = getPluralForm(diffYears, currentLang, 'year');
        const remainingMonths = diffMonths - (diffYears * 12);
        if (remainingMonths > 0) {
            const monthWord = getPluralForm(remainingMonths, currentLang, 'month');
            timeText = currentLang === 'ar' ? 
                `منذ ${diffYears} ${yearWord} و ${remainingMonths} ${monthWord}` : 
                `לפני ${diffYears} ${yearWord} ו-${remainingMonths} ${monthWord}`;
        } else {
            timeText = currentLang === 'ar' ? `منذ ${diffYears} ${yearWord}` : `לפני ${diffYears} ${yearWord}`;
        }
        icon = '🕰️';
    }
    
    return { text: timeText, icon: icon };
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
        
        // Get time since death
        const timeSinceDeath = getTimeSinceDeath(person.death_date);
        
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
                <div class="w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-gradient-to-br from-gray-100 via-gray-50 to-white relative overflow-hidden flex items-center justify-center group">
                    <img src="${fullImageUrl}" 
                         alt="${fullName}" 
                         class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                         loading="lazy"
                         decoding="async"
                         fetchpriority="low"
                         onerror="this.parentElement.style.cssText='background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 50%, #ffffff 100%);'; this.src='${defaultAvatar}'; this.className='w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105';">
                    ${ageDisplay ? `
                    <div class="absolute bottom-3 right-3 backdrop-blur-xl bg-white/90 px-4 py-2.5 rounded-2xl shadow-xl border border-white/50 transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">${age}</span>
                            <span class="text-xs font-semibold text-gray-700">سنة</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            imageSection = `
                <div class="w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-gradient-to-br from-gray-100 via-gray-50 to-white relative overflow-hidden flex items-center justify-center group">
                    <img src="${defaultAvatar}" 
                         alt="${fullName}" 
                         class="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 opacity-60"
                         loading="lazy"
                         decoding="async">
                    ${ageDisplay ? `
                    <div class="absolute bottom-3 right-3 backdrop-blur-xl bg-white/90 px-4 py-2.5 rounded-2xl shadow-xl border border-white/50 transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">${age}</span>
                            <span class="text-xs font-semibold text-gray-700">سنة</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        
        const card = `
            <div class="memorial-card bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 border border-gray-100 hover:border-purple-200" 
                 onclick="saveScrollAndNavigate('person.html?id=${person.death_id}')" 
                 style="-webkit-tap-highlight-color: transparent;">
                <!-- Name Section - First -->
                <div class="p-5 pb-4 bg-gradient-to-b from-gray-50 via-white to-white border-b-2 border-gray-100">
                    <h2 class="text-lg font-bold ${nameColor} leading-snug text-right drop-shadow-sm">
                        <span class="inline-block">${fullName}</span>${nickname ? ` <span class="text-gray-500 text-base font-normal inline-block">${nickname}</span>` : ''}
                    </h2>
                </div>
                
                <!-- Prominent Image Section -->
                ${imageSection}
                
                <!-- Info Section -->
                <div class="p-4 bg-gradient-to-b from-white to-gray-50">
                    <!-- Birth Date - Icon first, then text -->
                    <div class="mb-3 text-right bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <div class="flex flex-row-reverse items-center justify-end gap-2 mb-1">
                            <span class="text-xs text-gray-500 font-medium">
                                ${currentLang === 'ar' ? 'تاريخ الولادة' : 'תאריך לידה'}
                            </span>
                            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="text-sm font-bold text-gray-900" data-birth-year="${person.birth_date ? new Date(person.birth_date).getFullYear() : ''}">
                            ${birthDate}
                        </div>
                    </div>
                    
                    <!-- Death Date - Icon first, then text -->
                    <div class="mb-3 text-right bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <div class="flex flex-row-reverse items-center justify-end gap-2 mb-1">
                            <span class="text-xs text-gray-500 font-medium">
                                ${currentLang === 'ar' ? 'تاريخ الوفاة' : 'תאריך פטירה'}
                            </span>
                            <svg class="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                            </svg>
                        </div>
                        <div class="text-sm font-bold text-gray-900" data-death-year="${person.death_date ? new Date(person.death_date).getFullYear() : ''}">
                            ${deathDate}
                        </div>
                    </div>
                    
                    ${timeSinceDeath ? `
                    <!-- Time Since Death - Icon first, then text -->
                    <div class="mt-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200 rounded-xl p-3 shadow-md">
                        <div class="flex flex-row-reverse items-center justify-end gap-2">
                            <div class="text-right flex-grow">
                                <div class="text-xs font-bold text-purple-900">${timeSinceDeath.text}</div>
                            </div>
                            <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    ` : ''}
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

// Save scroll position before navigation
function saveScrollAndNavigate(url) {
    sessionStorage.setItem('memorial_scroll_position', window.scrollY);
    window.location.href = url;
}

// Restore scroll position on page load
function restoreScrollPosition() {
    const savedPosition = sessionStorage.getItem('memorial_scroll_position');
    if (savedPosition) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            window.scrollTo({
                top: parseInt(savedPosition),
                behavior: 'instant'
            });
        });
        // Clear after restore
        sessionStorage.removeItem('memorial_scroll_position');
    }
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
    
    // Track home page visit
    trackHomePageVisit();
});

// Check if user is admin
function isAdmin() {
    const adminUser = sessionStorage.getItem('adminUser');
    if (adminUser) {
        try {
            const user = JSON.parse(adminUser);
            return user.is_admin === 1 || user.is_admin === true;
        } catch (e) {
            return false;
        }
    }
    return false;
}

// Track home page visit (once per unique visitor)
async function trackHomePageVisit() {
    // Don't track admin visits
    if (isAdmin()) {
        console.log('ℹ️ Admin visit - not tracked');
        return;
    }
    
    try {
        const userAgent = navigator.userAgent.substring(0, 255);
        const ipHash = await createSimpleHash(navigator.userAgent + navigator.language + screen.width + screen.height);
        
        // Check if this visitor already visited the home page
        const { data: existingVisit } = await supabaseClient
            .from('page_visits')
            .select('visit_id')
            .eq('page_type', 'home')
            .eq('ip_hash', ipHash)
            .limit(1);
        
        if (existingVisit && existingVisit.length > 0) {
            console.log('✅ Home visit already tracked for this visitor');
            return;
        }
        
        const { error } = await supabaseClient
            .from('page_visits')
            .insert([{
                page_type: 'home',
                death_id: null,
                visit_date: new Date().toISOString(),
                ip_hash: ipHash,
                user_agent: userAgent
            }]);
        
        if (error) {
            console.warn('Failed to track home visit:', error);
        } else {
            console.log('✅ Home visit tracked successfully');
        }
    } catch (e) {
        console.warn('Failed to track home visit:', e);
    }
}

// Create simple hash for privacy
async function createSimpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
}

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