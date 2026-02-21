// Supabase Settings
const SUPABASE_URL = 'https://acjxhufnotvweoeoccvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjanhodWZub3R2d2VvZW9jY3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE2MjQsImV4cCI6MjA4NTc1NzYyNH0.TF79yXwg9T8sThhfw4P9vvb9iWY9qkzUVh6t-_v38iA';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Clear login form fields on page load
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('errorMsg').classList.add('hidden');
});

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
        // Hash password using same method as registration
        const hashedPassword = btoa(password + 'salt_yanuh_2026');
        
        // Query users table directly with hashed password
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', hashedPassword)
            .single();
        
        if (error || !data) {
            showError('اسم المستخدم أو كلمة المرور غير صحيحة');
            return;
        }
        
        // Store user info
        sessionStorage.setItem('adminUser', JSON.stringify({
            user_id: data.user_id,
            username: data.username,
            is_admin: data.is_admin
        }));
        
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
