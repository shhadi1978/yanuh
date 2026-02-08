// Supabase Settings
const SUPABASE_URL = 'https://acjxhufnotvweoeoccvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjanhodWZub3R2d2VvZW9jY3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE2MjQsImV4cCI6MjA4NTc1NzYyNH0.TF79yXwg9T8sThhfw4P9vvb9iWY9qkzUVh6t-_v38iA';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjanhodWZub3R2d2VvZW9jY3Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE4MTYyNCwiZXhwIjoyMDg1NzU3NjI0fQ.HvmNoVpUHmMxWiRK_DvtlJQ0gglx4LOk7l2Xzq1TpvQ'; // Service Role Key - FULL ACCESS

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY); // Admin client with full permissions

let currentUser = null;

// Auto-logout configuration
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before logout
let inactivityTimer = null;
let warningTimer = null;
let lastActivity = Date.now();

// Check authentication
function checkAuth() {
    const userStr = sessionStorage.getItem('adminUser');
    if (!userStr) {
        window.location.href = 'login.html';
        return false;
    }
    
    currentUser = JSON.parse(userStr);
    document.getElementById('adminName').textContent = `مرحباً ${currentUser.username}`;
    
    // Initialize inactivity monitoring
    setupInactivityMonitoring();
    
    return true;
}

// Reset inactivity timers
function resetInactivityTimer() {
    lastActivity = Date.now();
    
    // Clear existing timers
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    
    // Set warning timer (13 minutes)
    warningTimer = setTimeout(() => {
        showInactivityWarning();
    }, INACTIVITY_TIMEOUT - WARNING_TIME);
    
    // Set logout timer (15 minutes)
    inactivityTimer = setTimeout(() => {
        autoLogout();
    }, INACTIVITY_TIMEOUT);
}

// Setup inactivity monitoring
function setupInactivityMonitoring() {
    console.log('🔐 Inactivity monitoring started (15 min timeout)');
    
    // Monitor user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    // Start initial timer
    resetInactivityTimer();
}

// Show warning before auto-logout
function showInactivityWarning() {
    const timeLeft = Math.floor((INACTIVITY_TIMEOUT - (Date.now() - lastActivity)) / 1000);
    
    if (timeLeft > 0 && timeLeft <= 120) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        const confirmStay = confirm(
            `⚠️ تحذير: عدم نشاط\n\n` +
            `ستتم تسجيل خروجك تلقائياً خلال ${minutes}:${seconds.toString().padStart(2, '0')}\n\n` +
            `هل تريد البقاء متصلاً؟`
        );
        
        if (confirmStay) {
            // User wants to stay - just reset the timers
            console.log('✅ User chose to stay connected');
            resetInactivityTimer();
        }
    }
}

// Auto logout due to inactivity
function autoLogout() {
    console.log('⏰ Auto-logout due to inactivity');
    alert('تم تسجيل الخروج تلقائياً بسبب عدم النشاط.\n\nالرجاء تسجيل الدخول مرة أخرى.');
    logout();
}

// Logout
function logout() {
    sessionStorage.removeItem('adminUser');
    
    // Clear timers
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    
    window.location.href = 'login.html';
}

// Global variable to store all records
let allRecords = [];
let currentAdminData = []; // The currently filtered/displayed dataset
let adminDisplayedCount = 0;
const ADMIN_ITEMS_PER_PAGE = 20;
let adminIsLoading = false;
let adminHasMore = true;

// Tab switching
function switchTab(tabName) {
    console.log('📑 switchTab:', tabName);
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Load data
    if (tabName === 'records') loadRecords();
    if (tabName === 'images') loadImagesStats();
    if (tabName === 'comments') loadComments();
}

// Search records function
function searchRecords() {
    const searchTerm = document.getElementById('adminSearchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderRecords(allRecords);
        return;
    }
    
    const filtered = allRecords.filter(person => {
        const fullName = `${person.title || ''} ${person.first_name || ''} ${person.middle_name || ''} ${person.last_name || ''}`.toLowerCase();
        const nickname = (person.nickname || '').toLowerCase();
        const city = (person.city || '').toLowerCase();
        const deathReason = (person.death_reason || '').toLowerCase();
        
        return fullName.includes(searchTerm) || 
               nickname.includes(searchTerm) || 
               city.includes(searchTerm) ||
               deathReason.includes(searchTerm);
    });
    
    renderRecords(filtered);
}

// Render records (extracted from loadRecords)
function renderRecords(data, append = false) {
    console.log('🎨 renderRecords called:', { dataLength: data?.length, append });
    const container = document.getElementById('recordsList');
    
    if (!append) {
        currentAdminData = data; // Save current dataset
        container.innerHTML = '';
        adminDisplayedCount = 0;
        adminHasMore = true;
    }
    
    // Determine how many items to render
    const startIdx = append ? adminDisplayedCount : 0;
    const endIdx = Math.min(startIdx + ADMIN_ITEMS_PER_PAGE, data.length);
    const itemsToRender = data.slice(startIdx, endIdx);
    
    console.log('renderRecords:', { append, startIdx, endIdx, itemsToRender: itemsToRender.length, total: data.length });
    
    if (itemsToRender.length === 0) {
        if (!append) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">لا توجد نتائج</div>';
        }
        adminHasMore = false;
        updateAdminLoadMoreButton(data);
        return;
    }
    
    const html = itemsToRender.map(person => {
        const fullName = `${person.title || ''} ${person.first_name || ''} ${person.middle_name || ''} ${person.last_name || ''}`.trim();
        const nickname = person.nickname ? `(${person.nickname})` : '';
        const birthYear = person.birth_date ? new Date(person.birth_date).getFullYear() : '---';
        const deathYear = person.death_date ? new Date(person.death_date).getFullYear() : '---';
        const nameColor = person.gender === 'female' ? 'text-pink-600' : 'text-blue-600';
        
        return `
            <div class="admin-card">
                <!-- معلومات الشخص -->
                <div class="text-right mb-4">
                    <h3 class="text-xl font-bold ${nameColor} mb-2">
                        <span class="inline-block">${fullName}</span>${nickname ? ` <span class="text-gray-500 font-normal text-lg inline-block">${nickname}</span>` : ''}
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            ${birthYear} - ${deathYear}
                        </span>
                        ${person.city ? `<span class="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">📍 ${person.city}</span>` : ''}
                    </div>
                </div>
                
                <!-- أزرار التحكم - محسّنة للجوال -->
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <button onclick="manageImages(${person.death_id})" class="flex flex-col items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white py-4 px-3 rounded-xl font-bold text-sm transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>الصور</span>
                    </button>
                    <button onclick="manageComments(${person.death_id})" class="flex flex-col items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white py-4 px-3 rounded-xl font-bold text-sm transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span>التعليقات</span>
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="editRecord(${person.death_id})" class="flex flex-col items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white py-4 px-3 rounded-xl font-bold text-sm transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>تعديل</span>
                    </button>
                    <button onclick="deleteRecord(${person.death_id})" class="flex flex-col items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white py-4 px-3 rounded-xl font-bold text-sm transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>حذف</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    if (!append) {
        container.innerHTML = html || '<div class="text-center py-16"><div class="text-6xl mb-4">📋</div><p class="text-gray-500 text-lg">لا توجد رشومات</p></div>';
    } else {
        container.insertAdjacentHTML('beforeend', html);
    }
    
    // Update displayed count
    adminDisplayedCount = endIdx;
    adminHasMore = endIdx < data.length;
    
    // Update count
    const countEl = document.getElementById('recordsCount');
    if (countEl) {
        countEl.textContent = `إجمالي: ${data.length} وفاة (عرض ${adminDisplayedCount})`;
    }
    
    // Show/hide "Load More" button
    updateAdminLoadMoreButton(data);
}

function updateAdminLoadMoreButton(data) {
    let loadMoreBtn = document.getElementById('adminLoadMoreBtn');
    const recordsList = document.getElementById('recordsList');
    
    if (!recordsList) {
        console.error('recordsList not found');
        return;
    }
    
    if (!loadMoreBtn) {
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'adminLoadMoreBtn';
        loadMoreBtn.className = 'w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all active:scale-95';
        loadMoreBtn.innerHTML = '⬇️ تحميل المزيد...';
        loadMoreBtn.onclick = () => {
            if (!adminIsLoading && adminHasMore) {
                adminIsLoading = true;
                loadMoreBtn.innerHTML = '<div class="inline-block h-6 w-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>';
                
                setTimeout(() => {
                    renderRecords(currentAdminData, true);
                    loadMoreBtn.innerHTML = '⬇️ تحميل المزيد...';
                    adminIsLoading = false;
                }, 300);
            }
        };
        
        // הוספה אחרי recordsList
        recordsList.parentNode.insertBefore(loadMoreBtn, recordsList.nextSibling);
        console.log('Load More button created');
    }
    
    const shouldShow = adminHasMore && currentAdminData.length > ADMIN_ITEMS_PER_PAGE;
    loadMoreBtn.style.display = shouldShow ? 'block' : 'none';
    console.log('Load More button:', shouldShow ? 'visible' : 'hidden', 'hasMore:', adminHasMore, 'total:', currentAdminData.length, 'displayed:', adminDisplayedCount);
}

// ==================== IMAGES MANAGEMENT ====================

let currentPersonImages = [];
let currentPersonData = null;

// Load images statistics for tab
async function loadImagesStats() {
    const { count, error } = await supabaseClient
        .from('images')
        .select('*', { count: 'exact', head: true });
    
    if (!error && count !== null) {
        document.getElementById('totalImagesCount').textContent = count;
    }
}

// Manage images for specific person
async function manageImages(deathId) {
    console.log('📸 Managing images for person:', deathId);
    
    // טעינת נתוני האדם
    const { data: person, error: personError } = await supabaseClient
        .from('death')
        .select('*')
        .eq('death_id', deathId)
        .single();
    
    if (personError || !person) {
        alert('خطأ في تحميل بيانات المتوفى');
        return;
    }
    
    currentPersonData = person;
    
    // טעינת תמונות האדם
    const { data: images, error: imgError } = await supabaseClient
        .from('images')
        .select('*')
        .eq('id_death', deathId)
        .order('cover', { ascending: false });
    
    if (imgError) {
        console.error('Error loading images:', imgError);
        currentPersonImages = [];
    } else {
        currentPersonImages = images || [];
    }
    
    showImageManagementModal(person);
}

// Show modal with image management
function showImageManagementModal(person) {
    const fullName = `${person.title || ''} ${person.first_name || ''} ${person.middle_name || ''} ${person.last_name || ''}`.trim();
    
    const imagesHTML = currentPersonImages.length > 0 ? currentPersonImages.map(img => {
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${img.url}`;
        const isCover = img.cover;
        
        return `
            <div class="relative bg-white rounded-xl overflow-hidden shadow-lg border-2 ${isCover ? 'border-yellow-400' : 'border-gray-200'}">
                ${isCover ? '<div class="absolute top-0 left-0 right-0 bg-gradient-to-b from-yellow-400 to-transparent h-12 z-10"></div>' : ''}
                ${isCover ? '<span class="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-20">⭐ صورة الغلاف</span>' : ''}
                
                <div class="relative" style="height: 200px;">
                    <img src="${imageUrl}" alt="" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300?text=صورة'">
                </div>
                
                <div class="p-3">
                    <p class="text-xs text-gray-600 mb-2 truncate" title="${img.description || ''}">${img.description || 'لا يوجد وصف'}</p>
                    
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="setCoverImage(${img.id})" class="${isCover ? 'bg-yellow-100 text-yellow-700 border border-yellow-400' : 'bg-gray-100 text-gray-700'} hover:bg-yellow-200 py-2 px-2 rounded-lg text-xs font-bold transition">
                            ${isCover ? '⭐ غلاف' : '⭐ تعيين غلاف'}
                        </button>
                        <button onclick="deletePersonImage(${img.id}, '${img.url}')" class="bg-red-500 hover:bg-red-600 text-white py-2 px-2 rounded-lg text-xs font-bold transition">
                            🗑️ حذف
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('') : '<div class="col-span-full text-center py-8 text-gray-500">لا توجد صور لهذا المتوفى</div>';
    
    const modal = document.getElementById('modal');
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onclick="event.stopPropagation()">
            <!-- Header -->
            <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 sticky top-0 z-30">
                <div class="flex items-center justify-between">
                    <button onclick="closeModal()" class="bg-white/20 hover:bg-white/30 w-10 h-10 rounded-full flex items-center justify-center transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div class="text-right">
                        <h2 class="text-2xl font-bold">🖼️ إدارة صور</h2>
                        <p class="text-sm opacity-90">${fullName}</p>
                    </div>
                </div>
            </div>
            
            <!-- Content -->
            <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 180px);">
                <!-- Upload Section -->
                <div class="mb-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-dashed border-green-300 rounded-xl p-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-3 text-right">📤 رفع صورة جديدة</h3>
                    <div class="flex flex-col gap-3">
                        <input type="file" id="imageFileInput" accept="image/*" multiple class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none p-3" />
                        <input type="text" id="imageDescInput" placeholder="وصف الصورة (اختياري)" class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-right focus:border-blue-500 focus:outline-none" />
                        <button onclick="uploadImages()" class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95 text-lg">
                            ⬆️ رفع الصور
                        </button>
                    </div>
                </div>
                
                <!-- Images Grid -->
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 text-right">الصور الحالية (${currentPersonImages.length})</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="personImagesGrid">
                        ${imagesHTML}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    modal.onclick = closeModal;
}

// Upload images for current person
async function uploadImages() {
    const fileInput = document.getElementById('imageFileInput');
    const description = document.getElementById('imageDescInput').value.trim();
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('الرجاء اختيار صورة واحدة على الأقل');
        return;
    }
    
    const files = Array.from(fileInput.files);
    let successCount = 0;
    
    console.log(`📤 Starting upload of ${files.length} files for person ${currentPersonData.death_id}`);
    
    for (const file of files) {
        console.log(`🖼️ Processing file: ${file.name} (${file.size} bytes)`);
        
        // יצירת שם קובץ ייחודי
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = file.name.split('.').pop();
        const fileName = `${currentPersonData.death_id}_${timestamp}_${random}.${extension}`;
        
        console.log(`📝 Generated filename: ${fileName}`);
        
        // העלאה לStorage (משתמש ב-service role key)
        const { error: uploadError } = await supabaseAdmin.storage
            .from('photos')
            .upload(fileName, file);
        
        if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            alert(`שגיאת העלאה עבור ${file.name}: ${uploadError.message}`);
            continue;
        }
        
        console.log(`✅ File uploaded to storage: ${fileName}`);
        
        // שמירה בטבלה (משתמש ב-service role key)
        const { error: dbError } = await supabaseAdmin
            .from('images')
            .insert({
                id_death: currentPersonData.death_id,
                url: fileName,
                description: description || null,
                cover: currentPersonImages.length === 0 && successCount === 0, // אם אין תמונות, הראשונה תהיה cover
                display: true
            });
        
        if (dbError) {
            console.error('❌ DB insert error:', dbError);
            alert(`שגיאת שמירה בDB עבור ${file.name}: ${dbError.message}`);
            // מחיקת הקובץ מהStorage אם נכשל הDB
            await supabaseAdmin.storage.from('photos').remove([fileName]);
            continue;
        }
        
        console.log(`✅ Database record created for: ${fileName}`);
        successCount++;
    }
    
    if (successCount > 0) {
        alert(`تم رفع ${successCount} صورة بنجاح!`);
        // רענון המודל
        manageImages(currentPersonData.death_id);
    } else {
        alert('فشل رفع الصور. الرجاء المحاولة مرة أخرى.');
    }
}

// Set cover image
async function setCoverImage(imageId) {
    // ביטול cover מכל התמונות של האדם (משתמש ב-service role key)
    await supabaseAdmin
        .from('images')
        .update({ cover: false })
        .eq('id_death', currentPersonData.death_id);
    
    // הגדרת cover לתמונה הנבחרת (משתמש ב-service role key)
    const { error } = await supabaseAdmin
        .from('images')
        .update({ cover: true })
        .eq('id', imageId);
    
    if (error) {
        alert('خطأ في تعيين صورة الغلاف: ' + error.message);
        return;
    }
    
    // רענון המודל
    manageImages(currentPersonData.death_id);
}

// Delete image from person
async function deletePersonImage(imageId, fileName) {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
        return;
    }
    
    // מחיקה מהStorage (משתמש ב-service role key)
    const { error: storageError } = await supabaseAdmin.storage
        .from('photos')
        .remove([fileName]);
    
    if (storageError) {
        console.warn('Storage delete warning:', storageError);
    }
    
    // מחיקה מהDB (משתמש ב-service role key)
    const { error: dbError } = await supabaseAdmin
        .from('images')
        .delete()
        .eq('id', imageId);
    
    if (dbError) {
        alert('خطأ في الحذف: ' + dbError.message);
        return;
    }
    
    alert('تم الحذف بنجاح!');
    // רענון המודל
    manageImages(currentPersonData.death_id);
}

// ==================== END IMAGES MANAGEMENT ====================

// ==================== COMMENTS MANAGEMENT ====================

let currentPersonComments = [];
let currentCommentPersonData = null;

// Manage comments for specific person
async function manageComments(deathId) {
    console.log('💬 Managing comments for person:', deathId);
    
    // Load person data
    const { data: person, error: personError } = await supabaseClient
        .from('death')
        .select('*')
        .eq('death_id', deathId)
        .single();
    
    if (personError || !person) {
        alert('خطأ في تحميل بيانات المتوفى');
        return;
    }
    
    currentCommentPersonData = person;
    
    // Load person's comments
    const { data: comments, error: commentsError } = await supabaseClient
        .from('comments')
        .select('*')
        .eq('id_death', deathId)
        .order('created_at', { ascending: false });
    
    if (commentsError) {
        console.error('Error loading comments:', commentsError);
        currentPersonComments = [];
    } else {
        currentPersonComments = comments || [];
    }
    
    showCommentsManagementModal(person);
}

// Show modal with comments management
function showCommentsManagementModal(person) {
    const fullName = `${person.title || ''} ${person.first_name || ''} ${person.middle_name || ''} ${person.last_name || ''}`.trim();
    
    const pendingComments = currentPersonComments.filter(c => !c.display_comment);
    const approvedComments = currentPersonComments.filter(c => c.display_comment);
    
    const commentsHTML = currentPersonComments.length > 0 ? currentPersonComments.map(comment => {
        const date = new Date(comment.created_at).toLocaleDateString('ar');
        const isApproved = comment.display_comment;
        
        // Build buttons based on comment status
        let buttonsHtml = '';
        if (isApproved) {
            // For approved comments: only delete button
            buttonsHtml = `
                <button onclick="deletePersonComment(${comment.comment_id})" class="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold text-sm transition">
                    🗑️ حذف التعليق
                </button>
            `;
        } else {
            // For pending comments: approve and delete buttons
            buttonsHtml = `
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="approvePersonComment(${comment.comment_id})" class="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold text-sm transition">
                        ✓ موافقة
                    </button>
                    <button onclick="deletePersonComment(${comment.comment_id})" class="bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold text-sm transition">
                        🗑️ حذف
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="bg-white rounded-xl border-2 ${isApproved ? 'border-green-200' : 'border-yellow-200'} p-4 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 font-medium">${date}</span>
                        ${isApproved ? 
                            '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">✓ معتمد</span>' : 
                            '<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">⏳ معلق</span>'
                        }
                    </div>
                    <div class="font-bold text-gray-900">${comment.author}</div>
                </div>
                <p class="text-gray-700 bg-gray-50 p-3 rounded-lg text-right leading-relaxed mb-3 text-sm">${comment.comment_text}</p>
                ${buttonsHtml}
            </div>
        `;
    }).join('') : '<div class="col-span-full text-center py-8 text-gray-500">لا توجد تعليقات لهذا المتوفى</div>';
    
    const modal = document.getElementById('modal');
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onclick="event.stopPropagation()">
            <!-- Header -->
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 sticky top-0 z-30">
                <div class="flex items-center justify-between">
                    <button onclick="closeModal()" class="bg-white/20 hover:bg-white/30 w-10 h-10 rounded-full flex items-center justify-center transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div class="text-right">
                        <h2 class="text-2xl font-bold">💬 إدارة التعليقات</h2>
                        <p class="text-sm opacity-90">${fullName}</p>
                    </div>
                </div>
            </div>
            
            <!-- Content -->
            <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 180px);">
                <!-- Statistics -->
                <div class="grid grid-cols-3 gap-3 mb-6">
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
                        <div class="text-2xl font-bold text-indigo-600">${currentPersonComments.length}</div>
                        <div class="text-xs text-gray-600">إجمالي</div>
                    </div>
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center">
                        <div class="text-2xl font-bold text-green-600">${approvedComments.length}</div>
                        <div class="text-xs text-gray-600">معتمدة</div>
                    </div>
                    <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 text-center">
                        <div class="text-2xl font-bold text-yellow-600">${pendingComments.length}</div>
                        <div class="text-xs text-gray-600">معلقة</div>
                    </div>
                </div>
                
                <!-- Comments List -->
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 text-right">التعليقات (${currentPersonComments.length})</h3>
                    <div class="space-y-3" id="personCommentsGrid">
                        ${commentsHTML}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    modal.onclick = closeModal;
}

// Approve comment for person
async function approvePersonComment(commentId) {
    const { error } = await supabaseClient
        .from('comments')
        .update({ display_comment: true })
        .eq('comment_id', commentId);
    
    if (error) {
        alert('حدث خطأ في الموافقة');
        console.error(error);
        return;
    }
    
    // Refresh modal
    manageComments(currentCommentPersonData.death_id);
}

// Delete comment for person
async function deletePersonComment(commentId) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا التعليق نهائياً؟\n\nلا يمكن التراجع عن هذا الإجراء!')) return;
    
    const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('comment_id', commentId);
    
    if (error) {
        alert('حدث خطأ في الحذف');
        console.error(error);
        return;
    }
    
    // Refresh modal
    manageComments(currentCommentPersonData.death_id);
}

// ==================== END COMMENTS MANAGEMENT ====================

async function loadRecords() {
    console.log('🔄 loadRecords called');
    const { data, error } = await supabaseClient
        .from('death')
        .select('*')
        .order('death_date', { ascending: false });
    
    if (error) {
        console.error('Error loading records:', error);
        return;
    }
    
    console.log('✅ Records loaded:', data.length);
    allRecords = data;
    renderRecords(allRecords);
    
    // Clear search input
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput) searchInput.value = '';
}

// Load pending comments
async function loadComments() {
    const { data, error } = await supabaseClient
        .from('comments')
        .select(`
            *,
            death(first_name, middle_name, last_name)
        `)
        .eq('display_comment', false)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading comments:', error);
        return;
    }
    
    if (!data || data.length === 0) {
        document.getElementById('commentsList').innerHTML = '<p class="text-center text-gray-500 py-8">لا توجد تعليقات بانتظار الموافقة</p>';
        return;
    }
    
    const html = data.map(comment => {
        const personName = `${comment.death.first_name || ''} ${comment.death.middle_name || ''} ${comment.death.last_name || ''}`.trim();
        const date = new Date(comment.created_at).toLocaleDateString('ar');
        
        return `
            <div class="admin-card">
                <div class="mb-4">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm text-gray-500 font-medium">${date}</span>
                        <div class="text-right">
                            <div class="font-bold text-gray-900 text-lg">${comment.author}</div>
                            <div class="text-gray-500 text-sm">على صفحة ${personName}</div>
                        </div>
                    </div>
                    <p class="text-gray-700 bg-gray-50 p-4 rounded-xl text-right leading-relaxed">${comment.comment_text}</p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="approveComment(${comment.comment_id})" class="bg-green-500 active:bg-green-600 text-white py-4 rounded-xl font-bold text-base shadow-lg active:shadow-md transition-all active:scale-95 touch-manipulation">
                        ✓ موافقة
                    </button>
                    <button onclick="rejectComment(${comment.comment_id})" class="bg-red-500 active:bg-red-600 text-white py-4 rounded-xl font-bold text-base shadow-lg active:shadow-md transition-all active:scale-95 touch-manipulation">
                        ✕ رفض
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('commentsList').innerHTML = html;
}

// Approve comment
async function approveComment(commentId) {
    const { error } = await supabaseClient
        .from('comments')
        .update({ display_comment: true })
        .eq('comment_id', commentId);
    
    if (error) {
        alert('حدث خطأ');
        return;
    }
    
    loadComments();
}

// Reject/Delete comment
async function rejectComment(commentId) {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    
    const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('comment_id', commentId);
    
    if (error) {
        alert('حدث خطأ');
        return;
    }
    
    loadComments();
}

// Delete record
async function deleteRecord(deathId) {
    if (!confirm('هل أنت متأكد من حذف هذه الوفاة؟ سيتم حذف جميع الصور والتعليقات المرتبطة بها.')) return;
    
    const { error } = await supabaseClient
        .from('death')
        .delete()
        .eq('death_id', deathId);
    
    if (error) {
        alert('حدث خطأ في الحذف');
        console.error(error);
        return;
    }
    
    loadRecords();
}

// Edit record
async function editRecord(deathId) {
    // Load person data
    const { data, error } = await supabaseClient
        .from('death')
        .select('*')
        .eq('death_id', deathId)
        .single();
    
    if (error || !data) {
        alert('حدث خطأ في تحميل البيانات');
        return;
    }
    
    showRecordModal(data);
}

// Show add record form (placeholder)
function showAddRecordForm() {
    showRecordModal(null);
}

// Show record modal (add or edit)
function showRecordModal(person) {
    const isEdit = person !== null;
    const title = isEdit ? 'تعديل وفاة' : 'إضافة متوفى جديد';
    
    const modalHTML = `
        <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                <h2 class="text-2xl font-bold text-gray-900">${title}</h2>
            </div>
            
            <form id="recordForm" class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Title -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">اللقب</label>
                        <input type="text" id="title" value="${person?.title || ''}" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
                            placeholder="السيد، السيدة، الشيخ...">
                    </div>
                    
                    <!-- First Name -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">الاسم الأول *</label>
                        <input type="text" id="first_name" value="${person?.first_name || ''}" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
                            placeholder="الاسم الأول">
                    </div>
                    
                    <!-- Middle Name -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">اسم الأب</label>
                        <input type="text" id="middle_name" value="${person?.middle_name || ''}"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
                            placeholder="اسم الأب">
                    </div>
                    
                    <!-- Last Name -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">اسم العائلة *</label>
                        <input type="text" id="last_name" value="${person?.last_name || ''}" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
                            placeholder="اسم العائلة">
                    </div>
                    
                    <!-- Nickname -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">الكنية</label>
                        <input type="text" id="nickname" value="${person?.nickname || ''}"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
                            placeholder="أبو أحمد، أم علي...">
                    </div>
                    
                    <!-- Gender -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">الجنس *</label>
                        <select id="gender" required class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right">
                            <option value="">اختر...</option>
                            <option value="male" ${person?.gender === 'male' ? 'selected' : ''}>ذكر</option>
                            <option value="female" ${person?.gender === 'female' ? 'selected' : ''}>أنثى</option>
                        </select>
                    </div>
                    
                    <!-- Birth Date -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">تاريخ الولادة</label>
                        <input type="date" id="birth_date" value="${person?.birth_date || new Date().toISOString().split('T')[0]}"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right">
                    </div>
                    
                    <!-- Death Date -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">تاريخ الوفاة</label>
                        <input type="date" id="death_date" value="${person?.death_date || ''}"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right">
                    </div>
                    
                    <!-- City -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">المدينة</label>
                        <input type="text" id="city" value="${person?.city || 'يانوح'}"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
                            placeholder="يانوح">
                    </div>
                    
                    <!-- Author -->
                    <div class="text-right">
                        <label class="block text-sm font-bold text-gray-700 mb-2">المحرر</label>
                        <input type="text" id="author" value="${person?.author || 'س.ش'}"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right">
                    </div>
                </div>
                
                <!-- Death Reason -->
                <div class="mt-4 text-right">
                    <label class="block text-sm font-bold text-gray-700 mb-2">سبب الوفاة</label>
                    <input type="text" id="death_reason" value="${person?.death_reason || ''}"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right">
                </div>
                
                <!-- CV -->
                <div class="mt-4 text-right">
                    <label class="block text-sm font-bold text-gray-700 mb-2">السيرة الذاتية</label>
                    <textarea id="cv" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right resize-none"
                        placeholder="اكتب السيرة الذاتية هنا...">${person?.cv || ''}</textarea>
                </div>
                
                <!-- Remarks -->
                <div class="mt-4 text-right">
                    <label class="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
                    <textarea id="remarks" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg text-right resize-none"
                        placeholder="ملاحظات إضافية...">${person?.remarks || ''}</textarea>
                </div>
                
                <!-- Buttons -->
                <div class="mt-6 flex gap-3">
                    <button type="button" onclick="closeModal()" 
                        class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-bold">
                        إلغاء
                    </button>
                    <button type="submit" 
                        class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold">
                        ${isEdit ? 'حفظ التعديلات' : 'إضافة'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    const modal = document.getElementById('modal');
    modal.innerHTML = modalHTML;
    modal.classList.remove('hidden');
    
    // Handle form submission
    document.getElementById('recordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('title').value.trim(),
            first_name: document.getElementById('first_name').value.trim(),
            middle_name: document.getElementById('middle_name').value.trim(),
            last_name: document.getElementById('last_name').value.trim(),
            nickname: document.getElementById('nickname').value.trim(),
            gender: document.getElementById('gender').value,
            birth_date: document.getElementById('birth_date').value || null,
            death_date: document.getElementById('death_date').value || null,
            city: document.getElementById('city').value.trim(),
            author: document.getElementById('author').value.trim(),
            death_reason: document.getElementById('death_reason').value.trim(),
            cv: document.getElementById('cv').value.trim(),
            remarks: document.getElementById('remarks').value.trim()
        };
        
        if (isEdit) {
            await updateRecord(person.death_id, formData);
        } else {
            await addRecord(formData);
        }
    });
}

// Add new record
async function addRecord(data) {
    const { error } = await supabaseClient
        .from('death')
        .insert([data]);
    
    if (error) {
        alert('حدث خطأ في الإضافة: ' + error.message);
        console.error(error);
        return;
    }
    
    alert('تمت الإضافة بنجاح!');
    closeModal();
    loadRecords();
}

// Update record
async function updateRecord(deathId, data) {
    const { error } = await supabaseClient
        .from('death')
        .update(data)
        .eq('death_id', deathId);
    
    if (error) {
        alert('حدث خطأ في التعديل: ' + error.message);
        console.error(error);
        return;
    }
    
    alert('تم التعديل بنجاح!');
    closeModal();
    loadRecords();
}

// Close modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').innerHTML = '';
}

// Initialize
if (checkAuth()) {
    loadRecords();
}
