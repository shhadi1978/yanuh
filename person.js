// הגדרות חיבור - Supabase Settings
const SUPABASE_URL = 'https://acjxhufnotvweoeoccvt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Rcssx9MNIREdHWq27nOkWQ_ZvK5JPQV';

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
        <div class="bg-white rounded-lg overflow-hidden shadow-sm">
            <div class="aspect-square bg-gray-50 overflow-hidden flex items-center justify-center">
                <img src="${baseImagePath + img.url}" 
                     alt="${img.description || ''}" 
                     class="w-full h-full object-contain gallery-img"
                     onclick="window.open('${baseImagePath + img.url}', '_blank')">
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
        
        return `
            <div class="comment-card">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-500">${dateStr}</span>
                    <span class="font-semibold text-gray-900">${comment.author || 'مجهول'}</span>
                </div>
                <p class="text-gray-700 text-right">${comment.comment_text}</p>
            </div>
        `;
    }).join('');

    document.getElementById('commentsList').innerHTML = html;
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
