// הגדרות חיבור - Supabase Settings
const SUPABASE_URL = 'https://acjxhufnotvweoeoccvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjanhodWZub3R2d2VvZW9jY3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE2MjQsImV4cCI6MjA4NTc1NzYyNH0.TF79yXwg9T8sThhfw4P9vvb9iWY9qkzUVh6t-_v38iA';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentLang = 'ar';
let currentPerson = null;
let deathId = null;

// Get death_id from URL
function getDeathId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Load person data
async function loadPersonData() {
    deathId = getDeathId();
    if (!deathId) {
        window.location.href = 'index.html';
        return;
    }

    const { data, error } = await supabaseClient
        .from('death')
        .select(`
            *,
            images(url, cover, display, description)
        `)
        .eq('death_id', deathId)
        .single();

    if (error || !data) {
        console.error('Error loading person:', error);
        return;
    }

    currentPerson = data;
    renderPersonInfo();
    renderPhotos();
    loadComments();
    loadFamilyTree();
}

// Render person information
function renderPersonInfo() {
    const title = currentPerson.title || '';
    const firstName = currentPerson.first_name || '';
    const middleName = currentPerson.middle_name || '';
    const lastName = currentPerson.last_name || '';
    const nickname = currentPerson.nickname || '';
    const fullName = `${title} ${firstName} ${middleName} ${lastName}`.trim();
    
    const formatDate = (dateStr) => {
        if (!dateStr) return '---';
        const date = new Date(dateStr);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };
    
    const calculateAge = (birthDate, deathDate) => {
        if (!birthDate || !deathDate) return null;
        const birth = new Date(birthDate);
        const death = new Date(deathDate);
        const age = death.getFullYear() - birth.getFullYear();
        return age;
    };
    
    // Calculate time since death (Facebook style)
    const getTimeSinceDeath = (deathDate) => {
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
    };
    
    const timeSinceDeath = getTimeSinceDeath(currentPerson.death_date);
    const age = calculateAge(currentPerson.birth_date, currentPerson.death_date);
    const nameColor = currentPerson.gender === 'female' ? 'text-pink-600' : 'text-blue-600';
    
    const html = `
        <div class="flex items-start gap-4 mb-6">
            <div class="flex-grow text-right">
                <h1 class="text-2xl font-bold ${nameColor} mb-2">
                    <span class="inline-block">${fullName}</span>${nickname ? ` <span class="text-gray-600 text-lg inline-block">(${nickname})</span>` : ''}
                </h1>
                ${currentPerson.city ? `<p class="text-gray-600 mb-2">${currentPerson.city}</p>` : ''}
            </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="text-right">
                <div class="text-sm text-gray-500 mb-1">${currentLang === 'ar' ? 'تاريخ الولادة' : 'תאריך לידה'}</div>
                <div class="font-semibold text-gray-900">${formatDate(currentPerson.birth_date)}</div>
            </div>
            <div class="text-right">
                <div class="text-sm text-gray-500 mb-1">${currentLang === 'ar' ? 'تاريخ الوفاة' : 'תאריך פטירה'}</div>
                <div class="font-semibold text-gray-900">${formatDate(currentPerson.death_date)}</div>
            </div>
        </div>
        
        ${age ? `
        <div class="mb-4 text-right">
            <div class="flex items-baseline gap-2">
                <span class="text-sm text-gray-500">${currentLang === 'ar' ? 'العمر' : 'גיל'}:</span>
                <span class="text-4xl font-bold text-gray-900">${age}</span>
                <span class="text-lg font-semibold text-gray-600">${currentLang === 'ar' ? 'سنة' : 'שנה'}</span>
            </div>
        </div>
        ` : ''}
        
        ${timeSinceDeath ? `
        <div class="mb-6">
            <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-400 rounded-lg p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${timeSinceDeath.icon}</span>
                    <div class="flex-grow text-right">
                        <div class="text-xs text-gray-500 mb-1">${currentLang === 'ar' ? 'مضى على رحيله' : 'עברו מאז פטירתו'}</div>
                        <div class="text-2xl font-bold text-purple-700">${timeSinceDeath.text}</div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
        
        ${currentPerson.death_reason ? `
            <div class="bg-gray-50 p-4 rounded-lg text-right">
                <div class="text-sm text-gray-500 mb-1">${currentLang === 'ar' ? 'سبب الوفاة' : 'סיבת הפטירה'}</div>
                <div class="text-gray-900">${currentPerson.death_reason}</div>
            </div>
        ` : ''}
        
        ${currentPerson.cv ? `
            <div class="mt-4 bg-blue-50 p-4 rounded-lg text-right">
                <div class="text-sm text-gray-600 mb-2">${currentLang === 'ar' ? 'السيرة الذاتية' : 'קורות חיים'}</div>
                <div class="text-gray-900 whitespace-pre-wrap">${currentPerson.cv}</div>
            </div>
        ` : ''}
        
        ${currentPerson.remarks ? `
            <div class="mt-4 p-4 border border-gray-200 rounded-lg text-right">
                <div class="text-sm text-gray-500 mb-2">${currentLang === 'ar' ? 'ملاحظات' : 'הערות'}</div>
                <div class="text-gray-700">${currentPerson.remarks}</div>
            </div>
        ` : ''}
    `;
    
    document.getElementById('personInfo').innerHTML = html;
}

// Render photos gallery
function renderPhotos() {
    const baseImagePath = 'https://acjxhufnotvweoeoccvt.supabase.co/storage/v1/object/public/photos/';
    const images = currentPerson.images?.filter(img => img.display === true) || [];
    
    if (images.length === 0) {
        document.getElementById('photosGallery').innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-8">
                ${currentLang === 'ar' ? 'لا توجد صور متاحة' : 'אין תמונות זמינות'}
            </div>
        `;
        return;
    }
    
    const html = images.map(img => `
        <div class="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div class="aspect-square bg-gray-50 overflow-hidden flex items-center justify-center">
                <img src="${baseImagePath + img.url}" 
                     alt="${img.description || ''}" 
                     class="w-full h-full object-contain gallery-img"
                     loading="lazy"
                     decoding="async"
                     onclick="window.open('${baseImagePath + img.url}', '_blank')"
                     style="cursor: pointer; -webkit-tap-highlight-color: transparent;">
            </div>
            ${img.description ? `
                <div class="p-2 text-right">
                    <p class="text-sm text-gray-600">${img.description}</p>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    document.getElementById('photosGallery').innerHTML = html;
}

// Load comments
async function loadComments() {
    const { data, error } = await supabaseClient
        .from('comments')
        .select('*')
        .eq('death_id', deathId)
        .eq('display_comment', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading comments:', error);
        return;
    }

    if (!data || data.length === 0) {
        document.getElementById('commentsList').innerHTML = `
            <div class="text-center text-gray-500 py-8">
                ${currentLang === 'ar' ? 'لا توجد تعليقات بعد. كن أول من يشارك ذكرى!' : 'אין תגובות עדיין. היה הראשון לשתף זיכרון!'}
            </div>
        `;
        return;
    }

    const html = data.map(comment => {
        const date = new Date(comment.created_at);
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        return `
            <div class="comment-card">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-gray-500">
                        <div>${dateStr}</div>
                        <div class="text-xs">${timeStr}</div>
                    </div>
                    <span class="font-semibold text-gray-900">${comment.author || 'مجهول'}</span>
                </div>
                <p class="text-gray-700 text-right">${comment.comment_text}</p>
            </div>
        `;
    }).join('');

    document.getElementById('commentsList').innerHTML = html;
}

// Load family tree
async function loadFamilyTree() {
    const fatherId = currentPerson.father_id_death;
    const motherId = currentPerson.mother_id_death;
    
    // Fetch father data
    let father = null;
    if (fatherId && fatherId > 0) {
        const { data } = await supabaseClient
            .from('death')
            .select('death_id, title, first_name, middle_name, last_name, nickname, gender')
            .eq('death_id', fatherId)
            .single();
        father = data;
    }
    
    // Fetch mother data
    let mother = null;
    if (motherId && motherId > 0) {
        const { data } = await supabaseClient
            .from('death')
            .select('death_id, title, first_name, middle_name, last_name, nickname, gender')
            .eq('death_id', motherId)
            .single();
        mother = data;
    }
    
    // Fetch children (people who have this person as father or mother)
    const { data: children } = await supabaseClient
        .from('death')
        .select('death_id, title, first_name, middle_name, last_name, nickname, gender')
        .or(`father_id_death.eq.${deathId},mother_id_death.eq.${deathId}`)
        .order('birth_date', { ascending: true });
    
    // Fetch siblings (people who share the same father or mother)
    let siblings = [];
    if ((fatherId && fatherId > 0) || (motherId && motherId > 0)) {
        const { data } = await supabaseClient
            .from('death')
            .select('death_id, title, first_name, middle_name, last_name, nickname, gender, birth_date, father_id_death, mother_id_death')
            .neq('death_id', deathId); // Exclude current person
        
        if (data) {
            // Filter siblings who share at least one parent
            siblings = data.filter(person => {
                const sharesFather = fatherId && fatherId > 0 && person.father_id_death === fatherId;
                const sharesMother = motherId && motherId > 0 && person.mother_id_death === motherId;
                return sharesFather || sharesMother;
            }).sort((a, b) => {
                const dateA = a.birth_date ? new Date(a.birth_date) : new Date(0);
                const dateB = b.birth_date ? new Date(b.birth_date) : new Date(0);
                return dateA - dateB;
            });
        }
    }
    
    renderFamilyTree(father, mother, children || [], siblings || []);
}

function renderFamilyTree(father, mother, children, siblings) {
    const buildPersonCard = (person, relationship) => {
        if (!person) return '';
        
        const fullName = `${person.title || ''} ${person.first_name || ''} ${person.middle_name || ''} ${person.last_name || ''}`.trim();
        const nickname = person.nickname ? `(${person.nickname})` : '';
        const nameColor = person.gender === 'female' ? 'text-pink-600' : 'text-blue-600';
        
        return `
            <div class="family-card cursor-pointer hover:shadow-lg transition-all" onclick="window.location.href='person.html?id=${person.death_id}'">
                <div class="text-xs text-gray-500 mb-2">
                    ${relationship === 'father' ? (currentLang === 'ar' ? 'الأب' : 'האב') : 
                      relationship === 'mother' ? (currentLang === 'ar' ? 'الأم' : 'האם') : 
                      relationship === 'sibling' ? (currentLang === 'ar' ? 'أخ/أخت' : 'אח/אחות') :
                      (currentLang === 'ar' ? 'ابن/ابنة' : 'בן/בת')}
                </div>
                <div class="font-semibold ${nameColor} text-sm text-center leading-tight">
                    ${fullName}
                    ${nickname ? `<br><span class="text-xs text-gray-600">${nickname}</span>` : ''}
                </div>
            </div>
        `;
    };
    
    let html = '';
    
    // Parents section
    if (father || mother) {
        html += `
            <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4 text-right">
                    ${currentLang === 'ar' ? '👫 الوالدين' : '👫 הורים'}
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    ${father ? buildPersonCard(father, 'father') : `<div class="family-card opacity-50"><div class="text-3xl mb-2">👨</div><div class="text-sm text-gray-500">${currentLang === 'ar' ? 'غير معروف' : 'לא ידוע'}</div></div>`}
                    ${mother ? buildPersonCard(mother, 'mother') : `<div class="family-card opacity-50"><div class="text-3xl mb-2">👩</div><div class="text-sm text-gray-500">${currentLang === 'ar' ? 'غير معروفة' : 'לא ידועה'}</div></div>`}
                </div>
            </div>
        `;
    }
    
    // Siblings section
    if (siblings && siblings.length > 0) {
        html += `
            <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4 text-right">
                    ${currentLang === 'ar' ? '👥 الإخوة والأخوات' : '👥 אחים ואחיות'} (${siblings.length})
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${siblings.map(sibling => buildPersonCard(sibling, 'sibling')).join('')}
                </div>
            </div>
        `;
    }
    
    // Children section
    if (children && children.length > 0) {
        html += `
            <div>
                <h3 class="text-lg font-bold text-gray-900 mb-4 text-right">
                    ${currentLang === 'ar' ? '👶 الأبناء' : '👶 ילדים'} (${children.length})
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${children.map(child => buildPersonCard(child, 'child')).join('')}
                </div>
            </div>
        `;
    }
    
    if (!html) {
        html = `
            <div class="text-center text-gray-500 py-8">
                ${currentLang === 'ar' ? 'لا توجد معلومات عن العائلة' : 'אין מידע על המשפחה'}
            </div>
        `;
    }
    
    document.getElementById('familyTree').innerHTML = html;
}

// Submit comment
async function submitComment() {
    const author = document.getElementById('authorName').value.trim();
    const text = document.getElementById('commentText').value.trim();

    if (!text) {
        alert(currentLang === 'ar' ? 'الرجاء كتابة تعليق' : 'נא לכתוב תגובה');
        return;
    }

    const { data, error } = await supabaseClient
        .from('comments')
        .insert([
            {
                death_id: deathId,
                author: author || (currentLang === 'ar' ? 'مجهول' : 'אנונימי'),
                comment_text: text,
                display_comment: false, // Will be reviewed by admin
                created_at: new Date().toISOString()
            }
        ]);

    if (error) {
        console.error('Error submitting comment:', error);
        alert(currentLang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'אירעה שגיאה. נסה שוב.');
        return;
    }

    alert(currentLang === 'ar' ? 'شكراً! سيتم عرض تعليقك بعد المراجعة.' : 'תודה! התגובה תוצג לאחר אישור.');
    
    // Clear form
    document.getElementById('authorName').value = '';
    document.getElementById('commentText').value = '';
}

// Language toggle
function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'he' : 'ar';
    localStorage.setItem('language', currentLang);
    updateLanguage();
}

function updateLanguage() {
    const html = document.documentElement;
    const langButton = document.getElementById('langToggle');
    
    if (currentLang === 'he') {
        html.setAttribute('lang', 'he');
        html.setAttribute('dir', 'ltr');
        langButton.textContent = 'عربي';
    } else {
        html.setAttribute('lang', 'ar');
        html.setAttribute('dir', 'rtl');
        langButton.textContent = 'עברית';
    }
    
    // Update placeholders and text
    document.querySelectorAll('[data-ar][data-he]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = el.getAttribute('data-' + currentLang + '-placeholder');
        } else {
            el.textContent = el.getAttribute('data-' + currentLang);
        }
    });
    
    if (currentPerson) {
        renderPersonInfo();
        loadComments();
    }
}

// ==================== VISIT TRACKING ====================

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

// Track page visit (once per unique visitor)
async function trackPageVisit() {
    if (!deathId) return;
    
    // Don't track admin visits
    if (isAdmin()) {
        console.log('ℹ️ Admin visit - not tracked');
        return;
    }
    
    try {
        // Get user agent and create stable IP hash
        const userAgent = navigator.userAgent.substring(0, 255);
        const ipHash = await createSimpleHash(navigator.userAgent + navigator.language + screen.width + screen.height);
        
        // Check if this visitor already visited this page
        const { data: existingVisit } = await supabaseClient
            .from('page_visits')
            .select('visit_id')
            .eq('page_type', 'person')
            .eq('death_id', parseInt(deathId))
            .eq('ip_hash', ipHash)
            .limit(1);
        
        if (existingVisit && existingVisit.length > 0) {
            console.log('✅ Visit already tracked for this visitor');
            return;
        }
        
        const { error } = await supabaseClient
            .from('page_visits')
            .insert([{
                page_type: 'person',
                death_id: parseInt(deathId),
                visit_date: new Date().toISOString(),
                ip_hash: ipHash,
                user_agent: userAgent
            }]);
        
        if (error) {
            console.warn('Failed to track visit:', error);
        } else {
            console.log('✅ Visit tracked successfully');
        }
    } catch (e) {
        console.warn('Visit tracking error:', e);
    }
}

// Create simple hash for IP privacy
async function createSimpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
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

// Get visit statistics
async function getVisitStats() {
    if (!deathId || !isAdmin()) return null;
    
    try {
        // Total visits
        const { count: totalVisits } = await supabaseClient
            .from('page_visits')
            .select('*', { count: 'exact', head: true })
            .eq('death_id', deathId);
        
        // Last visit
        const { data: lastVisit } = await supabaseClient
            .from('page_visits')
            .select('visit_date')
            .eq('death_id', deathId)
            .order('visit_date', { ascending: false })
            .limit(1)
            .single();
        
        // Visits this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: monthVisits } = await supabaseClient
            .from('page_visits')
            .select('*', { count: 'exact', head: true })
            .eq('death_id', deathId)
            .gte('visit_date', startOfMonth.toISOString());
        
        return {
            totalVisits: totalVisits || 0,
            lastVisit: lastVisit?.visit_date || null,
            monthVisits: monthVisits || 0
        };
    } catch (e) {
        console.error('Failed to get visit stats:', e);
        return null;
    }
}

// Display visit statistics (admin only)
async function displayVisitStats() {
    if (!isAdmin()) return;
    
    const stats = await getVisitStats();
    if (!stats) return;
    
    // Format last visit time
    let lastVisitText = 'غير متاح';
    if (stats.lastVisit) {
        const lastDate = new Date(stats.lastVisit);
        const now = new Date();
        const diffMs = now - lastDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            lastVisitText = 'الآن';
        } else if (diffMins < 60) {
            lastVisitText = `قبل ${diffMins} دقيقة`;
        } else if (diffHours < 24) {
            lastVisitText = `قبل ${diffHours} ساعة`;
        } else {
            lastVisitText = `قبل ${diffDays} يوم`;
        }
    }
    
    // Create stats content
    const statsHTML = `
        <h3 class="text-xl font-bold mb-4 text-gray-900">📊 إحصائيات الزيارات (للمدير فقط)</h3>
        <div class="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl shadow-sm">
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="bg-white rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-blue-600">${stats.totalVisits}</div>
                        <div class="text-sm text-gray-600 mt-2">👁️ إجمالي الزيارات</div>
                    </div>
                    <div class="bg-white rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-green-600">${stats.monthVisits}</div>
                        <div class="text-sm text-gray-600 mt-2">📈 هذا الشهر</div>
                    </div>
                    <div class="bg-white rounded-lg p-4 text-center">
                        <div class="text-lg font-bold text-orange-600">${lastVisitText}</div>
                        <div class="text-sm text-gray-600 mt-2">📅 آخر زيارة</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert into visitStatsSection
    const statsSection = document.getElementById('visitStatsSection');
    if (statsSection) {
        statsSection.innerHTML = statsHTML;
        statsSection.style.display = 'block';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language');
    if (savedLang) currentLang = savedLang;
    
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);
    document.getElementById('submitComment').addEventListener('click', submitComment);
    
    updateLanguage();
    loadPersonData().then(() => {
        // Track visit after page loads
        trackPageVisit();
        
        // Display stats if admin
        if (isAdmin()) {
            displayVisitStats();
        }
    });
});
