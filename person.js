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
        <div class="mb-6 text-right">
            <div class="flex items-baseline gap-2">
                <span class="text-sm text-gray-500">${currentLang === 'ar' ? 'العمر' : 'גיל'}:</span>
                <span class="text-4xl font-bold text-gray-900">${age}</span>
                <span class="text-lg font-semibold text-gray-600">${currentLang === 'ar' ? 'سنة' : 'שנה'}</span>
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
    
    renderFamilyTree(father, mother, children || []);
}

function renderFamilyTree(father, mother, children) {
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language');
    if (savedLang) currentLang = savedLang;
    
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);
    document.getElementById('submitComment').addEventListener('click', submitComment);
    
    updateLanguage();
    loadPersonData();
});
