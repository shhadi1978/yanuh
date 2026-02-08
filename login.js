// Supabase Settings
const SUPABASE_URL = 'https://acjxhufnotvweoeoccvt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Rcssx9MNIREdHWq27nOkWQ_ZvK5JPQV';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Check if already logged in
if (sessionStorage.getItem('adminUser')) {
    window.location.href = 'admin.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    
    errorMsg.classList.add('hidden');
    
    try {
        // Call RPC function (secure server-side check)
        const { data, error } = await supabaseClient
            .rpc('login_admin', {
                p_username: username,
                p_password: password
            });
        
        if (error) {
            console.error('RPC Error:', error);
            showError('حدث خطأ في تسجيل الدخول');
            return;
        }
        
        if (!data.success) {
            showError('اسم المستخدم أو كلمة المرور غير صحيحة');
            return;
        }
        
        // Store user info (password never sent to client)
        sessionStorage.setItem('adminUser', JSON.stringify(data.user));
        window.location.href = 'admin.html';
        
    } catch (err) {
        console.error('Login error:', err);
        showError('حدث خطأ في تسجيل الدخول');
    }
});

function showError(message) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
}
