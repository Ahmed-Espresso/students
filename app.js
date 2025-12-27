// ============================================
// الجزء الأول: التهيئة والإعدادات
// ============================================

// تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCYKp5mi2gDJGg4l5sOURJXGiQQOPDWU3s",
  authDomain: "students-59f43.firebaseapp.com",
  databaseURL: "https://students-59f43-default-rtdb.firebaseio.com/",
  projectId: "students-59f43",
  storageBucket: "students-59f43.firebasestorage.app",
  messagingSenderId: "248717629262",
  appId: "1:248717629262:web:a7ee2ad69da4bc6f38f01f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = firebase.auth();
const database = firebase.database();

// المتغيرات العامة
let currentStudentPage = 1;
const studentsPerPage = 10;
let allStudents = [];
let allUsers = [];
let myStudents = [];
let allEvaluations = [];

// ============================================
// الجزء الثاني: الوظائف العامة والمشتركة
// ============================================

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMe = document.getElementById('rememberMe');
const messageContainer = document.getElementById('messageContainer');
const roleInfoModal = document.getElementById('roleInfoModal');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading overlay initially for login page
    if (loadingOverlay) {
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 500);
    }
    
    // Check if user is already logged in (for dashboard pages only)
    if (window.location.pathname.includes('dashboard')) {
        checkAuthState();
    }
    
    // Add event listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Check for saved credentials
    if (emailInput && passwordInput && rememberMe) {
        const savedEmail = localStorage.getItem('savedEmail');
        const savedPassword = localStorage.getItem('savedPassword');
        
        if (savedEmail && savedPassword) {
            emailInput.value = savedEmail;
            passwordInput.value = atob(savedPassword);
            rememberMe.checked = true;
        }
    }
    
    // Close modal when clicking outside
    if (roleInfoModal) {
        window.onclick = function(event) {
            if (event.target === roleInfoModal) {
                closeRoleInfo();
            }
        }
    }
    
    // Initialize dashboard based on current page
    if (window.location.pathname.includes('dashboard')) {
        initDashboard();
    }
});

// Initialize dashboard based on current page
function initDashboard() {
    // First check if user is logged in
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId || !userRole) {
        window.location.href = 'index.html';
        return;
    }
    
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('dashboard-admin')) {
        if (userRole !== 'admin') {
            showMessage('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
            setTimeout(() => {
                logout();
            }, 2000);
            return;
        }
        initAdminDashboard();
    } else if (currentPage.includes('dashboard-specialist')) {
        if (userRole !== 'specialist') {
            showMessage('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
            setTimeout(() => {
                logout();
            }, 2000);
            return;
        }
        initSpecialistDashboard();
    } else if (currentPage.includes('dashboard-parent')) {
        if (userRole !== 'parent') {
            showMessage('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
            setTimeout(() => {
                logout();
            }, 2000);
            return;
        }
        initParentDashboard();
    } else if (currentPage.includes('dashboard-student')) {
        if (userRole !== 'student') {
            showMessage('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
            setTimeout(() => {
                logout();
            }, 2000);
            return;
        }
        initStudentDashboard();
    }
}

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in, get user data from database
            database.ref('users/' + user.uid).once('value')
                .then((snapshot) => {
                    const userData = snapshot.val();
                    
                    if (userData) {
                        // Store user data in localStorage
                        localStorage.setItem('userId', snapshot.key);
                        localStorage.setItem('userEmail', userData.email);
                        localStorage.setItem('userName', userData.name || userData.fullName);
                        localStorage.setItem('userRole', userData.role);
                        localStorage.setItem('loginTime', new Date().toISOString());
                        
                        // Check if we're already on the correct dashboard
                        const currentPage = window.location.pathname;
                        const correctPage = getDashboardPageForRole(userData.role);
                        
                        if (!currentPage.includes(correctPage)) {
                            // Redirect to correct dashboard
                            window.location.href = correctPage;
                        } else {
                            // We're on the correct page, hide loading overlay
                            if (loadingOverlay) {
                                loadingOverlay.style.display = 'none';
                            }
                        }
                    } else {
                        // User data not found in database
                        showMessage('خطأ في بيانات المستخدم', 'error');
                        auth.signOut();
                        localStorage.clear();
                        window.location.href = 'index.html';
                    }
                })
                .catch((error) => {
                    console.error('Error getting user data:', error);
                    showMessage('خطأ في جلب بيانات المستخدم', 'error');
                    if (loadingOverlay) {
                        loadingOverlay.style.display = 'none';
                    }
                });
        } else {
            // User is not signed in, redirect to login
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
}

// Helper function to get dashboard page for role
function getDashboardPageForRole(role) {
    switch (role) {
        case 'admin': return 'dashboard-admin.html';
        case 'specialist': return 'dashboard-specialist.html';
        case 'student': return 'dashboard-student.html';
        case 'parent': return 'dashboard-parent.html';
        default: return 'index.html';
    }
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validate inputs
    if (!validateEmail(email)) {
        showMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
    submitBtn.disabled = true;
    
    // Sign in with Firebase
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Save credentials if remember me is checked
            if (rememberMe.checked) {
                localStorage.setItem('savedEmail', email);
                localStorage.setItem('savedPassword', btoa(password));
            } else {
                localStorage.removeItem('savedEmail');
                localStorage.removeItem('savedPassword');
            }
            
            // Get user data from database
            return database.ref('users/' + userCredential.user.uid).once('value');
        })
        .then((snapshot) => {
            const userData = snapshot.val();
            
            if (userData) {
                // Store user data in localStorage
                localStorage.setItem('userId', snapshot.key);
                localStorage.setItem('userEmail', userData.email);
                localStorage.setItem('userName', userData.name || userData.fullName);
                localStorage.setItem('userRole', userData.role);
                localStorage.setItem('loginTime', new Date().toISOString());
                
                // Add success animation
                loginForm.classList.add('login-success');
                
                // Show success message
                showMessage('تم تسجيل الدخول بنجاح!', 'success');
                
                // Redirect based on role with slight delay
                setTimeout(() => {
                    redirectBasedOnRole(userData.role);
                }, 1500);
            } else {
                showMessage('خطأ في جلب بيانات المستخدم', 'error');
                resetLoginButton(submitBtn, originalText);
            }
        })
        .catch((error) => {
            // Handle errors
            let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'المستخدم غير موجود';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'كلمة المرور غير صحيحة';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'تم محاولة تسجيل الدخول عدة مرات، حاول لاحقاً';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'هذا الحساب معطل';
                    break;
            }
            
            showMessage(errorMessage, 'error');
            resetLoginButton(submitBtn, originalText);
        });
}

// Reset login button state
function resetLoginButton(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
}

// Redirect based on user role
function redirectBasedOnRole(role) {
    switch (role) {
        case 'admin':
            window.location.href = 'dashboard-admin.html';
            break;
        case 'specialist':
            window.location.href = 'dashboard-specialist.html';
            break;
        case 'student':
            window.location.href = 'dashboard-student.html';
            break;
        case 'parent':
            window.location.href = 'dashboard-parent.html';
            break;
        default:
            showMessage('دور المستخدم غير معروف', 'error');
            auth.signOut();
    }
}

// Redirect to dashboard
function redirectToDashboard(userId) {
    database.ref('users/' + userId).once('value')
        .then((snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                redirectBasedOnRole(userData.role);
            }
        });
}

// Toggle password visibility
function togglePassword() {
    const passwordField = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleBtn.classList.remove('fa-eye');
        toggleBtn.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        toggleBtn.classList.remove('fa-eye-slash');
        toggleBtn.classList.add('fa-eye');
    }
}

// Show role info modal
function showRoleInfo() {
    if (roleInfoModal) {
        roleInfoModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Close role info modal
function closeRoleInfo() {
    if (roleInfoModal) {
        roleInfoModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Logout function
function logout() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    
    showMessage('جاري تسجيل الخروج...', 'info');
    
    auth.signOut()
        .then(() => {
            // Clear localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('userRole');
            localStorage.removeItem('loginTime');
            localStorage.removeItem('childId');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        })
        .catch((error) => {
            showMessage('حدث خطأ أثناء تسجيل الخروج', 'error');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        });
}

// Validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show message function
function showMessage(message, type = 'info') {
    // إنشاء عنصر الرسالة
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${getMessageIcon(type)}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="margin-right: auto; background: none; border: none; color: inherit; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // الحصول على حاوية الرسائل أو إنشائها
    let container = document.getElementById('messageContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(messageDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

// Get icon based on message type
function getMessageIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Forgot password function
function sendPasswordReset(email) {
    return auth.sendPasswordResetEmail(email)
        .then(() => {
            showMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
        })
        .catch((error) => {
            let errorMessage = 'حدث خطأ أثناء إرسال رابط إعادة التعيين';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صحيح';
                    break;
            }
            
            showMessage(errorMessage, 'error');
        });
}

// Check if user has permission
function checkPermission(requiredRole) {
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId || !userRole) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (requiredRole === 'admin' && userRole !== 'admin') {
        showMessage('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
        setTimeout(() => {
            redirectBasedOnRole(userRole);
        }, 2000);
        return false;
    }
    
    return true;
}

// ============================================
// الجزء الثالث: وظائف المساعدة (Utilities)
// ============================================

// Format date to Arabic
function formatDate(dateString, includeTime = false) {
    if (!dateString) return 'غير محدد';
    
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Riyadh'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('ar-SA', options);
}

// Calculate age from birth date
function calculateAge(birthDate) {
    if (!birthDate) return 'غير محدد';
    
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// Generate student ID
function generateStudentId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `STU${timestamp}${random}`;
}

// Format phone number
function formatPhoneNumber(phone) {
    if (!phone) return 'غير محدد';
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format Saudi numbers
    if (cleaned.length === 9) {
        return `0${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 10) {
        return `0${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    
    return phone;
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Validate Saudi ID
function validateSaudiId(id) {
    if (!id) return false;
    
    // Check if it's 10 digits
    if (!/^\d{10}$/.test(id)) return false;
    
    // Validate using Saudi ID algorithm
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let digit = parseInt(id.charAt(i));
        if (i % 2 === 0) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    
    return sum % 10 === 0;
}

// Get current semester
function getCurrentSemester() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    if (month >= 9 || month <= 1) {
        return `الفصل الأول ${year}/${year + 1}`;
    } else if (month >= 2 && month <= 6) {
        return `الفصل الثاني ${year - 1}/${year}`;
    } else {
        return `الفصل الصيفي ${year - 1}/${year}`;
    }
}

// Get disability type text
function getDisabilityTypeText(type) {
    const types = {
        'hearing': 'سمعية',
        'partial': 'سمعية جزئية',
        'complete': 'سمعية كلية',
        'other': 'أخرى'
    };
    
    return types[type] || type;
}

// Get evaluation level text
function getEvaluationText(level) {
    const levels = {
        'A+': 'ممتاز',
        'A': 'جيد جداً',
        'B+': 'جيد',
        'B': 'مقبول',
        'C': 'ضعيف',
        'D': 'غير مقبول'
    };
    
    return levels[level] || level;
}

// Get evaluation color
function getEvaluationColor(level) {
    const colors = {
        'A+': '#27ae60',
        'A': '#2ecc71',
        'B+': '#f39c12',
        'B': '#e67e22',
        'C': '#e74c3c',
        'D': '#c0392b'
    };
    
    return colors[level] || '#7f8c8d';
}

// Export data to CSV
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showMessage('لا توجد بيانات للتصدير', 'warning');
        return;
    }
    
    const csvRows = [];
    const headers = Object.keys(data[0]);
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    
    // Create and download file
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Print element
function printElement(elementId) {
    const printContent = document.getElementById(elementId);
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
}

// Load JSON data
async function loadJSON(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Error loading JSON:', error);
        return null;
    }
}

// Save data to localStorage
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

// Load data from localStorage
function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
    }
}

// Clear all application data
function clearAppData() {
    const keys = [
        'studentsData',
        'usersData',
        'resultsData',
        'reportsData'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
}

// Get user initials
function getUserInitials(name) {
    if (!name) return '??';
    
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    
    return name.substring(0, 2).toUpperCase();
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 بايت';
    
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Check if file is image
function isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(ext);
}

// Generate random color
function getRandomColor() {
    const colors = [
        '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
        '#9b59b6', '#1abc9c', '#d35400', '#c0392b'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR'
    }).format(amount);
}

// Truncate text
function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Check if running on mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showMessage('تم النسخ إلى الحافظة', 'success');
        })
        .catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showMessage('تم النسخ إلى الحافظة', 'success');
        });
}

// Get subject text
function getSubjectText(subject) {
    const subjects = {
        'arabic': 'اللغة العربية',
        'math': 'الرياضيات',
        'science': 'العلوم',
        'social': 'الدراسات الاجتماعية',
        'hearing': 'تدريب السمع',
        'speech': 'تدريب النطق',
        'communication': 'مهارات التواصل',
        'behavior': 'السلوك والتكيف'
    };
    return subjects[subject] || subject;
}

// Get medical type text
function getMedicalTypeText(type) {
    const types = {
        'checkup': 'فحص دوري',
        'treatment': 'علاج',
        'vaccination': 'تطعيم',
        'test': 'تحليل',
        'emergency': 'طوارئ',
        'other': 'أخرى'
    };
    return types[type] || type;
}

// Get evaluation type text
function getEvaluationTypeText(type) {
    const types = {
        'diagnostic': 'تشخيصي',
        'formative': 'تكويني',
        'summative': 'ختامي',
        'monthly': 'شهري',
        'quarterly': 'ربع سنوي'
    };
    return types[type] || type;
}

// ============================================
// الجزء الرابع: وظائف لوحة تحكم المشرف
// ============================================

// Initialize admin dashboard
function initAdminDashboard() {
    if (!checkPermission('admin')) {
        return;
    }
    
    // Load user data
    const userName = localStorage.getItem('userName') || 'المشرف';
    document.getElementById('adminName').textContent = userName;
    document.getElementById('userMenuName').textContent = userName;
    
    // Initialize date display
    updateCurrentDate();
    
    // Load initial data
    loadDashboardStats();
    loadRecentActivities();
    loadStudents();
    loadUsers();
    loadNotifications();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize forms
    initAddStudentForm();
    initAddUserForm();
    
    // Initialize DataTables if available
    if (typeof $ !== 'undefined' && $.fn.dataTable) {
        $('#studentsTable').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/ar.json'
            }
        });
    }
    
    // Hide loading overlay
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }, 1000);
}

// Load dashboard statistics
function loadDashboardStats() {
    // Load students count
    database.ref('students').once('value')
        .then(snapshot => {
            const count = snapshot.numChildren();
            const totalStudents = document.getElementById('totalStudents');
            if (totalStudents) totalStudents.textContent = count;
            allStudents = [];
            snapshot.forEach(child => {
                allStudents.push({
                    id: child.key,
                    ...child.val()
                });
            });
        })
        .catch(error => {
            showMessage('خطأ في تحميل إحصائيات الطلاب: ' + error.message, 'error');
        });
    
    // Load specialists count
    database.ref('users').orderByChild('role').equalTo('specialist').once('value')
        .then(snapshot => {
            const count = snapshot.numChildren();
            const totalSpecialists = document.getElementById('totalSpecialists');
            if (totalSpecialists) totalSpecialists.textContent = count;
        })
        .catch(error => {
            showMessage('خطأ في تحميل إحصائيات الأخصائيين: ' + error.message, 'error');
        });
    
    // Load parents count
    database.ref('users').orderByChild('role').equalTo('parent').once('value')
        .then(snapshot => {
            const count = snapshot.numChildren();
            const totalParents = document.getElementById('totalParents');
            if (totalParents) totalParents.textContent = count;
        })
        .catch(error => {
            showMessage('خطأ في تحميل إحصائيات أولياء الأمور: ' + error.message, 'error');
        });
    
    // Load reports count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    database.ref('results').once('value')
        .then(snapshot => {
            let count = 0;
            snapshot.forEach(child => {
                const results = child.val();
                if (results.date && new Date(results.date) > thirtyDaysAgo) {
                    count++;
                }
            });
            const totalReports = document.getElementById('totalReports');
            if (totalReports) totalReports.textContent = count;
        })
        .catch(error => {
            showMessage('خطأ في تحميل إحصائيات التقارير: ' + error.message, 'error');
        });
}

// Load recent activities
function loadRecentActivities() {
    const activitiesRef = database.ref('activities').orderByChild('timestamp').limitToLast(10);
    
    activitiesRef.once('value')
        .then(snapshot => {
            const activityList = document.getElementById('recentActivity');
            if (!activityList) return;
            
            activityList.innerHTML = '';
            
            const activities = [];
            snapshot.forEach(child => {
                activities.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Sort by timestamp (newest first)
            activities.sort((a, b) => b.timestamp - a.timestamp);
            
            activities.forEach(activity => {
                const activityItem = createActivityItem(activity);
                activityList.appendChild(activityItem);
            });
        })
        .catch(error => {
            console.error('Error loading activities:', error);
        });
}

// Create activity item element
function createActivityItem(activity) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    
    const iconClass = getActivityIconClass(activity.type);
    const icon = getActivityIcon(activity.type);
    const time = formatDate(activity.timestamp, true);
    
    div.innerHTML = `
        <div class="activity-icon ${iconClass}">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="activity-content">
            <div class="activity-title">${activity.title}</div>
            <div class="activity-desc">${activity.description}</div>
            <div class="activity-time">${time}</div>
        </div>
    `;
    
    return div;
}

// Get activity icon class
function getActivityIconClass(type) {
    const types = {
        'add': 'add',
        'edit': 'edit',
        'delete': 'delete',
        'login': 'login',
        'logout': 'login',
        'report': 'add'
    };
    return types[type] || 'add';
}

// Get activity icon
function getActivityIcon(type) {
    const icons = {
        'add': 'plus-circle',
        'edit': 'edit',
        'delete': 'trash-alt',
        'login': 'sign-in-alt',
        'logout': 'sign-out-alt',
        'report': 'file-alt'
    };
    return icons[type] || 'info-circle';
}

// Load students with pagination
function loadStudents(page = 1) {
    const startIndex = (page - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    
    database.ref('students').once('value')
        .then(snapshot => {
            const studentsTableBody = document.getElementById('studentsTableBody');
            if (!studentsTableBody) return;
            
            studentsTableBody.innerHTML = '';
            allStudents = [];
            
            snapshot.forEach((child, index) => {
                if (index >= startIndex && index < endIndex) {
                    const student = child.val();
                    const row = createStudentRow(child.key, student, index + 1);
                    studentsTableBody.appendChild(row);
                }
                allStudents.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Update pagination
            updatePagination(page, Math.ceil(snapshot.numChildren() / studentsPerPage));
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات الطلاب: ' + error.message, 'error');
        });
}

// Create student table row
function createStudentRow(studentId, student, index) {
    const tr = document.createElement('tr');
    
    const age = calculateAge(student.birthDate);
    const disabilityText = getDisabilityTypeText(student.disabilityType);
    const status = student.status || 'active';
    
    tr.innerHTML = `
        <td>${index}</td>
        <td>
            <strong>${student.fullName || 'غير محدد'}</strong>
            <br>
            <small class="text-muted">العمر: ${age} سنوات</small>
        </td>
        <td>${student.nationalId || 'غير محدد'}</td>
        <td>${formatDate(student.birthDate)}</td>
        <td>
            <span class="badge disability-badge">${disabilityText}</span>
        </td>
        <td>${student.guardianName || 'غير محدد'}</td>
        <td>
            <span class="status-badge status-${status}">
                ${status === 'active' ? 'نشط' : 'غير نشط'}
            </span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="action-btn-icon view" onclick="viewStudent('${studentId}')" title="عرض">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn-icon edit" onclick="editStudent('${studentId}')" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn-icon delete" onclick="deleteStudent('${studentId}')" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return tr;
}

// Update pagination controls
function updatePagination(currentPage, totalPages) {
    const paginationDiv = document.getElementById('studentsPagination');
    if (!paginationDiv || totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    if (currentPage > 1) {
        html += `<button onclick="loadStudents(${currentPage - 1})">&laquo; السابق</button>`;
    }
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<button class="active">${i}</button>`;
        } else {
            html += `<button onclick="loadStudents(${i})">${i}</button>`;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<button onclick="loadStudents(${currentPage + 1})">التالي &raquo;</button>`;
    }
    
    paginationDiv.innerHTML = html;
}

// Search students
function searchStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const studentsTableBody = document.getElementById('studentsTableBody');
    
    if (!studentsTableBody || searchTerm.length < 2) {
        if (searchTerm.length === 0) {
            loadStudents(currentStudentPage);
        }
        return;
    }
    
    studentsTableBody.innerHTML = '';
    
    const filteredStudents = allStudents.filter(student => {
        return (
            (student.fullName && student.fullName.toLowerCase().includes(searchTerm)) ||
            (student.nationalId && student.nationalId.includes(searchTerm)) ||
            (student.guardianName && student.guardianName.toLowerCase().includes(searchTerm))
        );
    });
    
    filteredStudents.forEach((student, index) => {
        const row = createStudentRow(student.id, student, index + 1);
        studentsTableBody.appendChild(row);
    });
    
    // Update pagination for search results
    const paginationDiv = document.getElementById('studentsPagination');
    if (paginationDiv) {
        paginationDiv.innerHTML = `<span>تم العثور على ${filteredStudents.length} نتيجة</span>`;
    }
}

// View student details
function viewStudent(studentId) {
    database.ref(`students/${studentId}`).once('value')
        .then(snapshot => {
            const student = snapshot.val();
            if (!student) {
                showMessage('الطالب غير موجود', 'error');
                return;
            }
            
            const modalContent = document.getElementById('studentModalContent');
            if (!modalContent) return;
            
            const age = calculateAge(student.birthDate);
            const disabilityText = getDisabilityTypeText(student.disabilityType);
            
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>${student.fullName || 'غير محدد'}</h2>
                    <p>معلومات الطالب الكاملة</p>
                </div>
                <div class="modal-body">
                    <div class="student-profile">
                        <div class="profile-header">
                            <div class="avatar large student">
                                <i class="fas fa-user-graduate"></i>
                            </div>
                            <div class="profile-info">
                                <h3>${student.fullName || 'غير محدد'}</h3>
                                <p>رقم الهوية: ${student.nationalId || 'غير محدد'}</p>
                                <div class="profile-tags">
                                    <span class="tag disability">${disabilityText}</span>
                                    <span class="tag age">العمر: ${age} سنوات</span>
                                    <span class="tag status ${student.status || 'active'}">
                                        ${student.status === 'active' ? 'نشط' : 'غير نشط'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="profile-details">
                            <div class="detail-section">
                                <h4><i class="fas fa-info-circle"></i> المعلومات الأساسية</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>تاريخ الميلاد:</label>
                                        <span>${formatDate(student.birthDate)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>الجنس:</label>
                                        <span>${student.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>نوع الإعاقة:</label>
                                        <span>${disabilityText}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>تاريخ الإصابة:</label>
                                        <span>${formatDate(student.disabilityDate)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class="fas fa-home"></i> معلومات التواصل</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>العنوان:</label>
                                        <span>${student.address || 'غير محدد'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>الهاتف:</label>
                                        <span>${student.phone || 'غير محدد'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>البريد الإلكتروني:</label>
                                        <span>${student.email || 'غير محدد'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${student.medicalHistory ? `
                            <div class="detail-section">
                                <h4><i class="fas fa-file-medical"></i> التاريخ المرضي</h4>
                                <div class="medical-history">
                                    ${student.medicalHistory}
                                </div>
                            </div>
                            ` : ''}
                            
                            ${student.guardianName ? `
                            <div class="detail-section">
                                <h4><i class="fas fa-user-friends"></i> ولي الأمر</h4>
                                <div class="guardian-info">
                                    <div class="detail-grid">
                                        <div class="detail-item">
                                            <label>اسم ولي الأمر:</label>
                                            <span>${student.guardianName}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>صلة القرابة:</label>
                                            <span>${student.guardianRelation || 'غير محدد'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>هاتف ولي الأمر:</label>
                                            <span>${student.guardianPhone || 'غير محدد'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>البريد الإلكتروني:</label>
                                            <span>${student.guardianEmail || 'غير محدد'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="detail-section">
                                <h4><i class="fas fa-sticky-note"></i> ملاحظات إضافية</h4>
                                <div class="notes">
                                    ${student.notes || 'لا توجد ملاحظات'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('studentModal')">إغلاق</button>
                    <button class="btn btn-primary" onclick="editStudent('${studentId}')">
                        <i class="fas fa-edit"></i> تعديل البيانات
                    </button>
                    <button class="btn btn-success" onclick="printStudentReport('${studentId}')">
                        <i class="fas fa-print"></i> طباعة التقرير
                    </button>
                </div>
            `;
            
            document.getElementById('studentModal').style.display = 'block';
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات الطالب: ' + error.message, 'error');
        });
}

// Edit student
function editStudent(studentId) {
    closeModal('studentModal');
    
    database.ref(`students/${studentId}`).once('value')
        .then(snapshot => {
            const student = snapshot.val();
            if (!student) {
                showMessage('الطالب غير موجود', 'error');
                return;
            }
            
            const modalContent = document.getElementById('editStudentContent');
            if (!modalContent) return;
            
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>تعديل بيانات الطالب</h2>
                    <p>${student.fullName || 'غير محدد'}</p>
                </div>
                <div class="modal-body">
                    <form id="editStudentForm" onsubmit="updateStudent('${studentId}'); return false;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="editFullName">الاسم الكامل *</label>
                                <input type="text" id="editFullName" value="${student.fullName || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editNationalId">رقم الهوية *</label>
                                <input type="text" id="editNationalId" value="${student.nationalId || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editBirthDate">تاريخ الميلاد *</label>
                                <input type="date" id="editBirthDate" value="${student.birthDate || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editGender">الجنس *</label>
                                <select id="editGender" required>
                                    <option value="male" ${student.gender === 'male' ? 'selected' : ''}>ذكر</option>
                                    <option value="female" ${student.gender === 'female' ? 'selected' : ''}>أنثى</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="editDisabilityType">نوع الإعاقة *</label>
                                <select id="editDisabilityType" required>
                                    <option value="hearing" ${student.disabilityType === 'hearing' ? 'selected' : ''}>سمعية</option>
                                    <option value="partial" ${student.disabilityType === 'partial' ? 'selected' : ''}>سمعية جزئية</option>
                                    <option value="complete" ${student.disabilityType === 'complete' ? 'selected' : ''}>سمعية كلية</option>
                                    <option value="other" ${student.disabilityType === 'other' ? 'selected' : ''}>أخرى</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="editDisabilityDate">تاريخ الإصابة</label>
                                <input type="date" id="editDisabilityDate" value="${student.disabilityDate || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editAddress">العنوان</label>
                                <input type="text" id="editAddress" value="${student.address || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editPhone">الهاتف</label>
                                <input type="tel" id="editPhone" value="${student.phone || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editEmail">البريد الإلكتروني</label>
                                <input type="email" id="editEmail" value="${student.email || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editGuardianName">اسم ولي الأمر *</label>
                                <input type="text" id="editGuardianName" value="${student.guardianName || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editGuardianRelation">صلة القرابة</label>
                                <input type="text" id="editGuardianRelation" value="${student.guardianRelation || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editGuardianPhone">هاتف ولي الأمر *</label>
                                <input type="tel" id="editGuardianPhone" value="${student.guardianPhone || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editGuardianEmail">بريد ولي الأمر</label>
                                <input type="email" id="editGuardianEmail" value="${student.guardianEmail || ''}">
                            </div>
                            
                            <div class="form-group full-width">
                                <label for="editMedicalHistory">التاريخ المرضي</label>
                                <textarea id="editMedicalHistory" rows="4">${student.medicalHistory || ''}</textarea>
                            </div>
                            
                            <div class="form-group full-width">
                                <label for="editNotes">ملاحظات إضافية</label>
                                <textarea id="editNotes" rows="3">${student.notes || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="editStatus">حالة الطالب</label>
                                <select id="editStatus">
                                    <option value="active" ${student.status === 'active' ? 'selected' : ''}>نشط</option>
                                    <option value="inactive" ${student.status === 'inactive' ? 'selected' : ''}>غير نشط</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('editStudentModal')">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                        </div>
                    </form>
                </div>
            `;
            
            document.getElementById('editStudentModal').style.display = 'block';
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات الطالب: ' + error.message, 'error');
        });
}

// Update student data
function updateStudent(studentId) {
    const studentData = {
        fullName: document.getElementById('editFullName').value,
        nationalId: document.getElementById('editNationalId').value,
        birthDate: document.getElementById('editBirthDate').value,
        gender: document.getElementById('editGender').value,
        disabilityType: document.getElementById('editDisabilityType').value,
        disabilityDate: document.getElementById('editDisabilityDate').value,
        address: document.getElementById('editAddress').value,
        phone: document.getElementById('editPhone').value,
        email: document.getElementById('editEmail').value,
        guardianName: document.getElementById('editGuardianName').value,
        guardianRelation: document.getElementById('editGuardianRelation').value,
        guardianPhone: document.getElementById('editGuardianPhone').value,
        guardianEmail: document.getElementById('editGuardianEmail').value,
        medicalHistory: document.getElementById('editMedicalHistory').value,
        notes: document.getElementById('editNotes').value,
        status: document.getElementById('editStatus').value,
        updatedAt: new Date().toISOString(),
        updatedBy: localStorage.getItem('userId')
    };
    
    // Validate required fields
    if (!studentData.fullName || !studentData.nationalId || !studentData.birthDate || 
        !studentData.guardianName || !studentData.guardianPhone) {
        showMessage('يرجى ملء جميع الحقول الإلزامية', 'error');
        return;
    }
    
    database.ref(`students/${studentId}`).update(studentData)
        .then(() => {
            showMessage('تم تحديث بيانات الطالب بنجاح', 'success');
            closeModal('editStudentModal');
            loadStudents(currentStudentPage);
            
            // Log activity
            logActivity('edit', `تم تعديل بيانات الطالب ${studentData.fullName}`);
        })
        .catch(error => {
            showMessage('خطأ في تحديث بيانات الطالب: ' + error.message, 'error');
        });
}

// Delete student
function deleteStudent(studentId) {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    database.ref(`students/${studentId}`).once('value')
        .then(snapshot => {
            const studentName = snapshot.val().fullName || 'طالب';
            
            database.ref(`students/${studentId}`).remove()
                .then(() => {
                    showMessage('تم حذف الطالب بنجاح', 'success');
                    loadStudents(currentStudentPage);
                    
                    // Log activity
                    logActivity('delete', `تم حذف الطالب ${studentName}`);
                })
                .catch(error => {
                    showMessage('خطأ في حذف الطالب: ' + error.message, 'error');
                });
        })
        .catch(error => {
            showMessage('خطأ في جلب بيانات الطالب: ' + error.message, 'error');
        });
}

// Initialize add student form
function initAddStudentForm() {
    const formContainer = document.getElementById('addStudentForm');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
        <div class="step-indicator">
            <div class="step active" data-step="1">
                <div class="step-number">1</div>
                <div class="step-label">المعلومات الأساسية</div>
            </div>
            <div class="step" data-step="2">
                <div class="step-number">2</div>
                <div class="step-label">معلومات الإعاقة</div>
            </div>
            <div class="step" data-step="3">
                <div class="step-number">3</div>
                <div class="step-label">معلومات ولي الأمر</div>
            </div>
            <div class="step" data-step="4">
                <div class="step-number">4</div>
                <div class="step-label">التأكيد</div>
            </div>
        </div>
        
        <form id="studentForm" onsubmit="submitStudentForm(); return false;">
            <div class="form-steps">
                <!-- Steps will be loaded by JavaScript -->
            </div>
        </form>
    `;
    
    loadFormStep(1);
}

// Load form step
function loadFormStep(step) {
    const formSteps = document.querySelector('.form-steps');
    if (!formSteps) return;
    
    formSteps.innerHTML = '';
    
    switch(step) {
        case 1:
            formSteps.innerHTML = `
                <div class="form-step active" data-step="1">
                    <div class="form-step-header">
                        <h3>المعلومات الأساسية للطالب</h3>
                        <p>يرجى إدخال المعلومات الشخصية الأساسية للطالب</p>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="fullName">الاسم الكامل *</label>
                            <input type="text" id="fullName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="nationalId">رقم الهوية *</label>
                            <input type="text" id="nationalId" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="birthDate">تاريخ الميلاد *</label>
                            <input type="date" id="birthDate" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="gender">الجنس *</label>
                            <select id="gender" required>
                                <option value="">اختر الجنس</option>
                                <option value="male">ذكر</option>
                                <option value="female">أنثى</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="address">العنوان</label>
                            <input type="text" id="address">
                        </div>
                        
                        <div class="form-group">
                            <label for="phone">الهاتف</label>
                            <input type="tel" id="phone">
                        </div>
                        
                        <div class="form-group">
                            <label for="email">البريد الإلكتروني</label>
                            <input type="email" id="email">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="showSection('students')">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="nextStep()">التالي</button>
                    </div>
                </div>
            `;
            break;
            
        case 2:
            formSteps.innerHTML = `
                <div class="form-step active" data-step="2">
                    <div class="form-step-header">
                        <h3>معلومات الإعاقة</h3>
                        <p>يرجى إدخال معلومات الإعاقة السمعية للطالب</p>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="disabilityType">نوع الإعاقة *</label>
                            <select id="disabilityType" required>
                                <option value="">اختر نوع الإعاقة</option>
                                <option value="hearing">سمعية</option>
                                <option value="partial">سمعية جزئية</option>
                                <option value="complete">سمعية كلية</option>
                                <option value="other">أخرى</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="disabilityDate">تاريخ الإصابة</label>
                            <input type="date" id="disabilityDate">
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="medicalHistory">التاريخ المرضي</label>
                            <textarea id="medicalHistory" rows="4" placeholder="أدخل التاريخ المرضي للطالب..."></textarea>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="initialNotes">ملاحظات أولية</label>
                            <textarea id="initialNotes" rows="3" placeholder="ملاحظات أولية عن حالة الطالب..."></textarea>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="prevStep()">السابق</button>
                        <button type="button" class="btn btn-primary" onclick="nextStep()">التالي</button>
                    </div>
                </div>
            `;
            break;
            
        case 3:
            formSteps.innerHTML = `
                <div class="form-step active" data-step="3">
                    <div class="form-step-header">
                        <h3>معلومات ولي الأمر</h3>
                        <p>يرجى إدخال معلومات ولي أمر الطالب</p>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="guardianName">اسم ولي الأمر *</label>
                            <input type="text" id="guardianName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="guardianRelation">صلة القرابة</label>
                            <input type="text" id="guardianRelation" placeholder="الأب / الأم / الوصي...">
                        </div>
                        
                        <div class="form-group">
                            <label for="guardianId">رقم هوية ولي الأمر</label>
                            <input type="text" id="guardianId">
                        </div>
                        
                        <div class="form-group">
                            <label for="guardianPhone">هاتف ولي الأمر *</label>
                            <input type="tel" id="guardianPhone" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="guardianEmail">بريد ولي الأمر</label>
                            <input type="email" id="guardianEmail">
                        </div>
                        
                        <div class="form-group">
                            <label for="guardianAddress">عنوان ولي الأمر</label>
                            <input type="text" id="guardianAddress">
                        </div>
                        
                        <div class="form-group">
                            <label for="guardianWork">جهة عمل ولي الأمر</label>
                            <input type="text" id="guardianWork">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="prevStep()">السابق</button>
                        <button type="button" class="btn btn-primary" onclick="nextStep()">التالي</button>
                    </div>
                </div>
            `;
            break;
            
        case 4:
            // Collect all form data for review
            const formData = collectFormData();
            formSteps.innerHTML = `
                <div class="form-step active" data-step="4">
                    <div class="form-step-header">
                        <h3>مراجعة المعلومات</h3>
                        <p>يرجى مراجعة المعلومات قبل الحفظ</p>
                    </div>
                    
                    <div class="review-data">
                        <h4>المعلومات الأساسية</h4>
                        <div class="review-grid">
                            <div class="review-item">
                                <strong>الاسم الكامل:</strong>
                                <span>${formData.fullName}</span>
                            </div>
                            <div class="review-item">
                                <strong>رقم الهوية:</strong>
                                <span>${formData.nationalId}</span>
                            </div>
                            <div class="review-item">
                                <strong>تاريخ الميلاد:</strong>
                                <span>${formatDate(formData.birthDate)}</span>
                            </div>
                            <div class="review-item">
                                <strong>الجنس:</strong>
                                <span>${formData.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                            </div>
                        </div>
                        
                        <h4>معلومات الإعاقة</h4>
                        <div class="review-grid">
                            <div class="review-item">
                                <strong>نوع الإعاقة:</strong>
                                <span>${getDisabilityTypeText(formData.disabilityType)}</span>
                            </div>
                            <div class="review-item">
                                <strong>تاريخ الإصابة:</strong>
                                <span>${formData.disabilityDate ? formatDate(formData.disabilityDate) : 'غير محدد'}</span>
                            </div>
                        </div>
                        
                        <h4>معلومات ولي الأمر</h4>
                        <div class="review-grid">
                            <div class="review-item">
                                <strong>اسم ولي الأمر:</strong>
                                <span>${formData.guardianName}</span>
                            </div>
                            <div class="review-item">
                                <strong>صلة القرابة:</strong>
                                <span>${formData.guardianRelation || 'غير محدد'}</span>
                            </div>
                            <div class="review-item">
                                <strong>هاتف ولي الأمر:</strong>
                                <span>${formData.guardianPhone}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="prevStep()">السابق</button>
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-save"></i> حفظ الطالب
                        </button>
                    </div>
                </div>
            `;
            break;
    }
    
    // Update step indicators
    updateStepIndicators(step);
}

// Update step indicators
function updateStepIndicators(currentStep) {
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber < currentStep) {
            step.classList.remove('active');
            step.classList.add('completed');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

// Collect form data
function collectFormData() {
    return {
        fullName: document.getElementById('fullName')?.value || '',
        nationalId: document.getElementById('nationalId')?.value || '',
        birthDate: document.getElementById('birthDate')?.value || '',
        gender: document.getElementById('gender')?.value || '',
        address: document.getElementById('address')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        email: document.getElementById('email')?.value || '',
        disabilityType: document.getElementById('disabilityType')?.value || '',
        disabilityDate: document.getElementById('disabilityDate')?.value || '',
        medicalHistory: document.getElementById('medicalHistory')?.value || '',
        initialNotes: document.getElementById('initialNotes')?.value || '',
        guardianName: document.getElementById('guardianName')?.value || '',
        guardianRelation: document.getElementById('guardianRelation')?.value || '',
        guardianId: document.getElementById('guardianId')?.value || '',
        guardianPhone: document.getElementById('guardianPhone')?.value || '',
        guardianEmail: document.getElementById('guardianEmail')?.value || '',
        guardianAddress: document.getElementById('guardianAddress')?.value || '',
        guardianWork: document.getElementById('guardianWork')?.value || ''
    };
}

// Navigate to next step
function nextStep() {
    const currentStep = getCurrentStep();
    if (!validateStep(currentStep)) {
        return;
    }
    
    loadFormStep(currentStep + 1);
}

// Navigate to previous step
function prevStep() {
    const currentStep = getCurrentStep();
    loadFormStep(currentStep - 1);
}

// Get current step
function getCurrentStep() {
    const activeStep = document.querySelector('.form-step.active');
    return activeStep ? parseInt(activeStep.dataset.step) : 1;
}

// Validate step
function validateStep(step) {
    switch(step) {
        case 1:
            const requiredFields1 = ['fullName', 'nationalId', 'birthDate', 'gender'];
            for (const fieldId of requiredFields1) {
                const field = document.getElementById(fieldId);
                if (!field.value.trim()) {
                    showMessage(`يرجى ملء حقل ${field.previousElementSibling.textContent}`, 'error');
                    field.focus();
                    return false;
                }
            }
            return true;
            
        case 2:
            const disabilityType = document.getElementById('disabilityType');
            if (!disabilityType.value) {
                showMessage('يرجى اختيار نوع الإعاقة', 'error');
                disabilityType.focus();
                return false;
            }
            return true;
            
        case 3:
            const requiredFields3 = ['guardianName', 'guardianPhone'];
            for (const fieldId of requiredFields3) {
                const field = document.getElementById(fieldId);
                if (!field.value.trim()) {
                    showMessage(`يرجى ملء حقل ${field.previousElementSibling.textContent}`, 'error');
                    field.focus();
                    return false;
                }
            }
            return true;
            
        default:
            return true;
    }
}

// Submit student form
function submitStudentForm() {
    const formData = collectFormData();
    
    // Final validation
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
        showMessage('يرجى التأكد من صحة جميع البيانات', 'error');
        return;
    }
    
    const studentData = {
        ...formData,
        status: 'active',
        studentId: generateStudentId(),
        createdAt: new Date().toISOString(),
        createdBy: localStorage.getItem('userId'),
        schoolId: 'school_001' // Fixed for single school
    };
    
    // Show loading
    const submitBtn = document.querySelector('#studentForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    submitBtn.disabled = true;
    
    database.ref('students').push(studentData)
        .then(() => {
            showMessage('تم إضافة الطالب بنجاح', 'success');
            
            // Reset form
            document.getElementById('studentForm').reset();
            loadFormStep(1);
            
            // Log activity
            logActivity('add', `تم إضافة طالب جديد: ${studentData.fullName}`);
            
            // Navigate to students list
            setTimeout(() => {
                showSection('students');
                loadStudents(1);
            }, 1500);
        })
        .catch(error => {
            showMessage('خطأ في إضافة الطالب: ' + error.message, 'error');
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

// Initialize add user form
function initAddUserForm() {
    const formContainer = document.getElementById('addUserForm');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
        <form id="userForm" onsubmit="submitUserForm(); return false;">
            <div class="form-step-header">
                <h3>إضافة مستخدم جديد</h3>
                <p>يرجى إدخال معلومات المستخدم الجديد</p>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label for="userFullName">الاسم الكامل *</label>
                    <input type="text" id="userFullName" required>
                </div>
                
                <div class="form-group">
                    <label for="userEmail">البريد الإلكتروني *</label>
                    <input type="email" id="userEmail" required>
                </div>
                
                <div class="form-group">
                    <label for="userRole">دور المستخدم *</label>
                                <select id="userRole" required onchange="toggleRoleFields()">
                        <option value="">اختر الدور</option>
                        <option value="admin">مشرف</option>
                        <option value="specialist">أخصائي / معلم</option>
                        <option value="parent">ولي أمر</option>
                    </select>
                </div>
                
                <div class="form-group" id="studentField" style="display: none;">
                    <label for="studentSelect">الطالب المرتبط *</label>
                    <select id="studentSelect">
                        <option value="">اختر الطالب</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="userPhone">رقم الهاتف</label>
                    <input type="tel" id="userPhone">
                </div>
                
                <div class="form-group full-width">
                    <label for="userNotes">ملاحظات</label>
                    <textarea id="userNotes" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="tempPassword">كلمة المرور المؤقتة</label>
                    <div class="password-generator">
                        <input type="text" id="tempPassword" readonly>
                        <button type="button" class="btn btn-sm" onclick="generatePassword()">
                            <i class="fas fa-sync"></i> توليد
                        </button>
                    </div>
                    <small class="text-muted">سيتم مطالبة المستخدم بتغيير كلمة المرور عند أول دخول</small>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="showSection('users')">إلغاء</button>
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-user-plus"></i> إضافة المستخدم
                </button>
            </div>
        </form>
    `;
    
    // Load students for parent role
    loadStudentsForSelect();
}

// Toggle role-specific fields
function toggleRoleFields() {
    const role = document.getElementById('userRole').value;
    const studentField = document.getElementById('studentField');
    
    if (role === 'parent') {
        studentField.style.display = 'block';
    } else {
        studentField.style.display = 'none';
    }
}

// Load students for select dropdown
function loadStudentsForSelect() {
    database.ref('students').once('value')
        .then(snapshot => {
            const select = document.getElementById('studentSelect');
            if (!select) return;
            
            select.innerHTML = '<option value="">اختر الطالب</option>';
            
            snapshot.forEach(child => {
                const student = child.val();
                if (student.status !== 'inactive') {
                    const option = document.createElement('option');
                    option.value = child.key;
                    option.textContent = student.fullName;
                    select.appendChild(option);
                }
            });
        })
        .catch(error => {
            console.error('Error loading students for select:', error);
        });
}

// Generate random password
function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tempPassword = document.getElementById('tempPassword');
    if (tempPassword) tempPassword.value = password;
}

// Submit user form
function submitUserForm() {
    const userData = {
        fullName: document.getElementById('userFullName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        phone: document.getElementById('userPhone').value,
        notes: document.getElementById('userNotes').value,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: localStorage.getItem('userId')
    };
    
    // Validate required fields
    if (!userData.fullName || !userData.email || !userData.role) {
        showMessage('يرجى ملء جميع الحقول الإلزامية', 'error');
        return;
    }
    
    // Validate email
    if (!validateEmail(userData.email)) {
        showMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
        return;
    }
    
    // For parent role, validate student selection
    if (userData.role === 'parent') {
        const studentId = document.getElementById('studentSelect').value;
        if (!studentId) {
            showMessage('يرجى اختيار الطالب المرتبط', 'error');
            return;
        }
        userData.studentId = studentId;
    }
    
    const tempPassword = document.getElementById('tempPassword').value || 'School@123';
    
    // Show loading
    const submitBtn = document.querySelector('#userForm button[type="submit"]');
    if (!submitBtn) {
        showMessage('عنصر الزر غير موجود', 'error');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';
    submitBtn.disabled = true;
    
    // Create user in Firebase Authentication
    auth.createUserWithEmailAndPassword(userData.email, tempPassword)
        .then((userCredential) => {
            const userId = userCredential.user.uid;
            
            // Save user data to database
            return database.ref(`users/${userId}`).set(userData);
        })
        .then(() => {
            showMessage('تم إنشاء المستخدم بنجاح', 'success');
            
            // Log activity
            logActivity('add', `تم إضافة مستخدم جديد: ${userData.fullName} (${userData.role})`);
            
            // Reset form
            document.getElementById('userForm').reset();
            
            // Navigate to users list
            setTimeout(() => {
                showSection('users');
                loadUsers();
            }, 1500);
        })
        .catch(error => {
            let errorMessage = 'حدث خطأ أثناء إنشاء المستخدم';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'كلمة المرور ضعيفة';
                    break;
            }
            
            showMessage(errorMessage, 'error');
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

// Load users
function loadUsers() {
    database.ref('users').once('value')
        .then(snapshot => {
            const usersTableBody = document.getElementById('usersTableBody');
            if (!usersTableBody) return;
            
            usersTableBody.innerHTML = '';
            allUsers = [];
            
            snapshot.forEach((child, index) => {
                const user = child.val();
                const row = createUserRow(child.key, user, index + 1);
                usersTableBody.appendChild(row);
                allUsers.push({
                    id: child.key,
                    ...user
                });
            });
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات المستخدمين: ' + error.message, 'error');
        });
}

// Create user table row
function createUserRow(userId, user, index) {
    const tr = document.createElement('tr');
    
    const roleText = {
        'admin': 'مشرف',
        'specialist': 'أخصائي',
        'parent': 'ولي أمر',
        'student': 'طالب'
    }[user.role] || user.role;
    
    const roleColor = {
        'admin': 'admin',
        'specialist': 'specialist',
        'parent': 'parent',
        'student': 'student'
    }[user.role] || 'secondary';
    
    tr.innerHTML = `
        <td>${index}</td>
        <td>
            <strong>${user.fullName || 'غير محدد'}</strong>
            <br>
            <small class="text-muted">${user.email || ''}</small>
        </td>
        <td>
            <span class="role-badge ${roleColor}">${roleText}</span>
        </td>
        <td>${user.phone || 'غير محدد'}</td>
        <td>
            <span class="status-badge status-${user.status || 'active'}">
                ${user.status === 'active' ? 'نشط' : 'غير نشط'}
            </span>
        </td>
        <td>${formatDate(user.createdAt)}</td>
        <td>
            <div class="action-buttons">
                <button class="action-btn-icon edit" onclick="editUser('${userId}')" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn-icon delete" onclick="deleteUser('${userId}')" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
                ${user.role !== 'admin' ? `
                <button class="action-btn-icon reset" onclick="resetUserPassword('${userId}')" title="إعادة تعيين كلمة المرور">
                    <i class="fas fa-key"></i>
                </button>
                ` : ''}
            </div>
        </td>
    `;
    
    return tr;
}

// Load notifications
function loadNotifications() {
    // This is a simplified version - in production, you would load from database
    const notifications = [
        {
            id: 1,
            title: 'تقرير شهري جديد',
            message: 'تم إضافة التقرير الشهري لشهر ديسمبر',
            time: 'منذ 2 ساعة',
            read: false
        },
        {
            id: 2,
            title: 'طالب جديد',
            message: 'تم إضافة طالب جديد: محمد أحمد',
            time: 'منذ 5 ساعات',
            read: false
        },
        {
            id: 3,
            title: 'تذكير اجتماع',
            message: 'اجتماع المدرسين غداً الساعة 10 صباحاً',
            time: 'منذ يوم',
            read: true
        }
    ];
    
    const notificationList = document.getElementById('notificationList');
    const notificationCount = document.getElementById('notificationCount');
    
    if (!notificationList || !notificationCount) return;
    
    notificationList.innerHTML = '';
    const unreadCount = notifications.filter(n => !n.read).length;
    notificationCount.textContent = unreadCount;
    
    notifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? '' : 'unread'}`;
        item.innerHTML = `
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${notification.time}</div>
        `;
        notificationList.appendChild(item);
    });
}

// Mark all notifications as read
function markAllAsRead() {
    // In production, update in database
    document.querySelectorAll('.notification-item').forEach(item => {
        item.classList.remove('unread');
    });
    const notificationCount = document.getElementById('notificationCount');
    if (notificationCount) notificationCount.textContent = '0';
}

// Log activity
function logActivity(type, description) {
    const activity = {
        type: type,
        title: getActivityTitle(type),
        description: description,
        userId: localStorage.getItem('userId'),
        userName: localStorage.getItem('userName'),
        timestamp: Date.now(),
        date: new Date().toISOString()
    };
    
    database.ref('activities').push(activity)
        .catch(error => {
            console.error('Error logging activity:', error);
        });
}

// Get activity title
function getActivityTitle(type) {
    const titles = {
        'add': 'إضافة جديدة',
        'edit': 'تعديل بيانات',
        'delete': 'حذف',
        'login': 'تسجيل دخول',
        'logout': 'تسجيل خروج',
        'report': 'تقرير'
    };
    return titles[type] || 'نشاط';
}

// Setup event listeners
function setupEventListeners() {
    // Prevent form submission on Enter key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
    
    // Close modals on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Export students to CSV
function exportStudents() {
    if (allStudents.length === 0) {
        showMessage('لا توجد بيانات للتصدير', 'warning');
        return;
    }
    
    exportToCSV(allStudents, 'students');
}

// Print student report
function printStudentReport(studentId) {
    // Implementation would generate a PDF report
    showMessage('جاري إنشاء التقرير...', 'info');
    // In production, use a PDF generation library
}

// Generate monthly report
function generateMonthlyReport() {
    showMessage('جاري إنشاء التقرير الشهري...', 'info');
    // Implementation would generate a comprehensive monthly report
}

// Reset user password
function resetUserPassword(userId) {
    if (!confirm('هل تريد إعادة تعيين كلمة مرور هذا المستخدم؟')) {
        return;
    }
    
    database.ref(`users/${userId}`).once('value')
        .then(snapshot => {
            const user = snapshot.val();
            if (!user) {
                showMessage('المستخدم غير موجود', 'error');
                return;
            }
            
            // In production, you would send a password reset email
            showMessage(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${user.email}`, 'success');
            
            // Log activity
            logActivity('edit', `تم إعادة تعيين كلمة مرور المستخدم: ${user.fullName}`);
        })
        .catch(error => {
            showMessage('خطأ في إعادة تعيين كلمة المرور: ' + error.message, 'error');
        });
}

// ============================================
// الجزء الخامس: وظائف لوحة تحكم الأخصائي
// ============================================

// Initialize specialist dashboard
function initSpecialistDashboard() {
    if (!checkPermission('specialist')) {
        return;
    }
    
    // Load user data
    const userName = localStorage.getItem('userName') || 'الأخصائي';
    document.getElementById('specialistName').textContent = userName;
    document.getElementById('userMenuName').textContent = userName;
    document.getElementById('specialistWelcomeName').textContent = userName;
    
    // Initialize date display
    updateCurrentDate();
    
    // Load initial data
    loadSpecialistDashboard();
    
    // Set up event listeners
    setupSpecialistEventListeners();
    
    // Hide loading overlay
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }, 1000);
}

// Load specialist dashboard data
function loadSpecialistDashboard() {
    const specialistId = localStorage.getItem('userId');
    
    // Load assigned students
    loadMyStudents();
    
    // Load recent evaluations
    loadRecentEvaluations();
    
    // Load dashboard stats
    loadSpecialistStats();
}

// Load my students
function loadMyStudents() {
    const specialistId = localStorage.getItem('userId');
    
    database.ref('students').once('value')
        .then(snapshot => {
            const studentsTable = document.getElementById('myStudentsTable');
            const myStudentsCount = document.getElementById('myStudentsCount');
            
            if (!studentsTable) return;
            
            studentsTable.innerHTML = '';
            myStudents = [];
            
            snapshot.forEach(child => {
                const student = child.val();
                // In a real system, you would filter by assigned specialist
                // For now, show all active students
                if (student.status !== 'inactive') {
                    myStudents.push({
                        id: child.key,
                        ...student
                    });
                    
                    const row = createSpecialistStudentRow(child.key, student, myStudents.length);
                    studentsTable.appendChild(row);
                }
            });
            
            if (myStudentsCount) {
                myStudentsCount.textContent = myStudents.length;
            }
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات الطلاب: ' + error.message, 'error');
        });
}

// Create student row for specialist
function createSpecialistStudentRow(studentId, student, index) {
    const tr = document.createElement('tr');
    
    const age = calculateAge(student.birthDate);
    const disabilityText = getDisabilityTypeText(student.disabilityType);
    
    // Get latest evaluation
    const latestEval = getLatestEvaluation(studentId);
    
    tr.innerHTML = `
        <td>${index}</td>
        <td>
            <strong>${student.fullName || 'غير محدد'}</strong>
            <br>
            <small class="text-muted">${student.nationalId || ''}</small>
        </td>
        <td>${age} سنوات</td>
        <td>${disabilityText}</td>
        <td>
            ${latestEval ? `
                <span>${formatDate(latestEval.date)}</span>
                <br>
                <small>${latestEval.subject || ''}</small>
            ` : 'لا يوجد'}
        </td>
        <td>
            ${latestEval ? `
                <div class="progress-level">
                    <span class="level-badge" style="background: ${getEvaluationColor(latestEval.level)}">
                        ${getEvaluationText(latestEval.level)}
                    </span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${getProgressPercentage(latestEval.level)}%"></div>
                    </div>
                </div>
            ` : 'غير محدد'}
        </td>
        <td>
            <div class="action-buttons">
                <button class="action-btn-icon view" onclick="viewStudentDetails('${studentId}')" title="عرض">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn-icon eval" onclick="addEvaluationForStudent('${studentId}')" title="إضافة تقييم">
                    <i class="fas fa-clipboard-check"></i>
                </button>
                <button class="action-btn-icon medical" onclick="addMedicalRecord('${studentId}')" title="سجل طبي">
                    <i class="fas fa-file-medical"></i>
                </button>
            </div>
        </td>
    `;
    
    return tr;
}

// Get latest evaluation for a student
function getLatestEvaluation(studentId) {
    // This would normally query the database
    // For now, return mock data
    return null;
}

// Get progress percentage based on evaluation level
function getProgressPercentage(level) {
    const percentages = {
        'A+': 95,
        'A': 85,
        'B+': 75,
        'B': 65,
        'C': 50,
        'D': 30
    };
    return percentages[level] || 50;
}

// Load evaluation form
function loadEvaluationForm(studentId = null) {
    const formContainer = document.getElementById('addEvaluationForm');
    if (!formContainer) return;
    
    let studentSelectOptions = '<option value="">اختر الطالب</option>';
    
    // Populate student select
    myStudents.forEach(student => {
        studentSelectOptions += `<option value="${student.id}" ${studentId === student.id ? 'selected' : ''}>
            ${student.fullName} (${student.nationalId || ''})
        </option>`;
    });
    
    formContainer.innerHTML = `
        <div class="form-step-header">
            <h3>إضافة تقييم جديد</h3>
            <p>يرجى إدخال تفاصيل التقييم للطالب</p>
        </div>
        
        <div class="form-grid">
            <div class="form-group">
                <label for="evalStudent">الطالب *</label>
                <select id="evalStudent" required>
                    ${studentSelectOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label for="evalSemester">الفصل الدراسي *</label>
                <select id="evalSemester" required>
                    <option value="">اختر الفصل</option>
                    <option value="first_2024">الفصل الأول 2024</option>
                    <option value="second_2024">الفصل الثاني 2024</option>
                    <option value="summer_2024">الفصل الصيفي 2024</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="evalSubject">المادة / المجال *</label>
                <select id="evalSubject" required>
                    <option value="">اختر المادة</option>
                    <option value="arabic">اللغة العربية</option>
                    <option value="math">الرياضيات</option>
                    <option value="science">العلوم</option>
                    <option value="social">الدراسات الاجتماعية</option>
                    <option value="hearing">تدريب السمع</option>
                    <option value="speech">تدريب النطق</option>
                    <option value="communication">مهارات التواصل</option>
                    <option value="behavior">السلوك والتكيف</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="evalDate">تاريخ التقييم *</label>
                <input type="date" id="evalDate" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            
            <div class="form-group">
                <label for="evalType">نوع التقييم *</label>
                <select id="evalType" required>
                    <option value="">اختر النوع</option>
                    <option value="diagnostic">تشخيصي</option>
                    <option value="formative">تكويني</option>
                    <option value="summative">ختامي</option>
                    <option value="monthly">شهري</option>
                    <option value="quarterly">ربع سنوي</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="evalLevel">المستوى *</label>
                <select id="evalLevel" required onchange="updateEvaluationScore()">
                    <option value="">اختر المستوى</option>
                    <option value="A+">ممتاز (A+)</option>
                    <option value="A">جيد جداً (A)</option>
                    <option value="B+">جيد (B+)</option>
                    <option value="B">مقبول (B)</option>
                    <option value="C">ضعيف (C)</option>
                    <option value="D">غير مقبول (D)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="evalScore">الدرجة (من 100)</label>
                <input type="number" id="evalScore" min="0" max="100" step="1" value="0">
            </div>
            
            <div class="form-group full-width">
                <label for="evalSkills">المهارات المقيمة</label>
                <div class="skills-checklist">
                    <label class="checkbox">
                        <input type="checkbox" name="skills" value="hearing">
                        <span>التمييز السمعي</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" name="skills" value="speech">
                        <span>وضوح النطق</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" name="skills" value="vocabulary">
                        <span>المفردات اللغوية</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" name="skills" value="comprehension">
                        <span>الفهم اللغوي</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" name="skills" value="expression">
                        <span>التعبير اللغوي</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" name="skills" value="social">
                        <span>المهارات الاجتماعية</span>
                    </label>
                </div>
            </div>
            
            <div class="form-group full-width">
                <label for="evalStrengths">نقاط القوة</label>
                <textarea id="evalStrengths" rows="3" placeholder="ما الذي يجيده الطالب؟"></textarea>
            </div>
            
            <div class="form-group full-width">
                <label for="evalWeaknesses">نقاط الضعف</label>
                <textarea id="evalWeaknesses" rows="3" placeholder="ما الذي يحتاج الطالب إلى تحسينه؟"></textarea>
            </div>
            
            <div class="form-group full-width">
                <label for="evalRecommendations">التوصيات</label>
                <textarea id="evalRecommendations" rows="3" placeholder="ما الذي يجب فعله لمساعدة الطالب؟"></textarea>
            </div>
            
            <div class="form-group full-width">
                <label for="evalNotes">ملاحظات إضافية</label>
                <textarea id="evalNotes" rows="4" placeholder="ملاحظات أخرى عن التقييم..."></textarea>
            </div>
        </div>
        
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="showSection('my-students')">إلغاء</button>
            <button type="button" class="btn btn-success" onclick="submitEvaluation()">
                <i class="fas fa-save"></i> حفظ التقييم
            </button>
        </div>
    `;
}

// Update evaluation score based on level
function updateEvaluationScore() {
    const level = document.getElementById('evalLevel').value;
    const scoreInput = document.getElementById('evalScore');
    
    const scores = {
        'A+': 95,
        'A': 85,
        'B+': 75,
        'B': 65,
        'C': 50,
        'D': 30
    };
    
    if (level in scores) {
        scoreInput.value = scores[level];
    }
}

// Submit evaluation
function submitEvaluation() {
    const evaluationData = {
        studentId: document.getElementById('evalStudent').value,
        semester: document.getElementById('evalSemester').value,
        subject: document.getElementById('evalSubject').value,
        date: document.getElementById('evalDate').value,
        type: document.getElementById('evalType').value,
        level: document.getElementById('evalLevel').value,
        score: document.getElementById('evalScore').value || 0,
        strengths: document.getElementById('evalStrengths').value,
        weaknesses: document.getElementById('evalWeaknesses').value,
        recommendations: document.getElementById('evalRecommendations').value,
        notes: document.getElementById('evalNotes').value,
        specialistId: localStorage.getItem('userId'),
        specialistName: localStorage.getItem('userName'),
        createdAt: new Date().toISOString()
    };
    
    // Get selected skills
    const skills = [];
    document.querySelectorAll('input[name="skills"]:checked').forEach(checkbox => {
        skills.push(checkbox.value);
    });
    evaluationData.skills = skills;
    
    // Validate required fields
    if (!evaluationData.studentId || !evaluationData.semester || !evaluationData.subject || 
        !evaluationData.date || !evaluationData.type || !evaluationData.level) {
        showMessage('يرجى ملء جميع الحقول الإلزامية', 'error');
        return;
    }
    
    // Show loading
    const submitBtn = document.querySelector('#addEvaluationForm button.btn-success');
    if (!submitBtn) {
        showMessage('زر الحفظ غير موجود', 'error');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    submitBtn.disabled = true;
    
    database.ref('evaluations').push(evaluationData)
        .then(() => {
            showMessage('تم حفظ التقييم بنجاح', 'success');
            
            // Log activity
            logActivity('add', 'تم إضافة تقييم جديد');
            
            // Reset form
            loadEvaluationForm();
            
            // Navigate back to students list
            setTimeout(() => {
                showSection('my-students');
            }, 1500);
        })
        .catch(error => {
            showMessage('خطأ في حفظ التقييم: ' + error.message, 'error');
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

// Add evaluation for specific student
function addEvaluationForStudent(studentId) {
    showSection('add-evaluation');
    setTimeout(() => {
        loadEvaluationForm(studentId);
    }, 100);
}

// View student details
function viewStudentDetails(studentId) {
    database.ref(`students/${studentId}`).once('value')
        .then(snapshot => {
            const student = snapshot.val();
            if (!student) {
                showMessage('الطالب غير موجود', 'error');
                return;
            }
            
            const modalContent = document.getElementById('studentDetailsContent');
            if (!modalContent) return;
            
            const age = calculateAge(student.birthDate);
            const disabilityText = getDisabilityTypeText(student.disabilityType);
            
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>${student.fullName || 'غير محدد'}</h2>
                    <p>معلومات الطالب والتقييمات</p>
                </div>
                <div class="modal-body">
                    <div class="student-profile-overview">
                        <div class="profile-summary">
                            <div class="avatar large student">
                                <i class="fas fa-user-graduate"></i>
                            </div>
                            <div class="summary-details">
                                <h3>${student.fullName || 'غير محدد'}</h3>
                                <p>العمر: ${age} سنوات | نوع الإعاقة: ${disabilityText}</p>
                                <p>رقم الهوية: ${student.nationalId || 'غير محدد'}</p>
                            </div>
                        </div>
                        
                        <div class="tabs">
                            <button class="tab-btn active" onclick="showStudentTab('info')">المعلومات</button>
                            <button class="tab-btn" onclick="showStudentTab('evaluations')">التقييمات</button>
                            <button class="tab-btn" onclick="showStudentTab('medical')">السجل الطبي</button>
                            <button class="tab-btn" onclick="showStudentTab('progress')">التقدم</button>
                        </div>
                        
                        <div class="tab-content">
                            <div id="student-info-tab" class="tab-pane active">
                                <!-- Student info will be loaded here -->
                            </div>
                            <div id="student-evaluations-tab" class="tab-pane">
                                <!-- Evaluations will be loaded here -->
                            </div>
                            <div id="student-medical-tab" class="tab-pane">
                                <!-- Medical records will be loaded here -->
                            </div>
                            <div id="student-progress-tab" class="tab-pane">
                                <!-- Progress chart will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('studentDetailsModal')">إغلاق</button>
                    <button class="btn btn-primary" onclick="addEvaluationForStudent('${studentId}')">
                        <i class="fas fa-clipboard-check"></i> إضافة تقييم
                    </button>
                </div>
            `;
            
            // Load initial tab
            showStudentTab('info', studentId, student);
            document.getElementById('studentDetailsModal').style.display = 'block';
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات الطالب: ' + error.message, 'error');
        });
}

// Show student tab content
function showStudentTab(tabName, studentId, student) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Use event if available, otherwise find the button
    if (event) {
        event.target.classList.add('active');
    } else {
        // Find the button and activate it
        const buttons = document.querySelectorAll('.tab-btn');
        for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent.includes(getTabNameArabic(tabName))) {
                buttons[i].classList.add('active');
                break;
            }
        }
    }
    
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Show selected tab
    const tabPane = document.getElementById(`student-${tabName}-tab`);
    if (tabPane) {
        tabPane.classList.add('active');
        
        // Load tab content
        switch(tabName) {
            case 'info':
                loadStudentInfoTab(studentId, student);
                break;
            case 'evaluations':
                loadStudentEvaluationsTab(studentId);
                break;
            case 'medical':
                loadStudentMedicalTab(studentId);
                break;
            case 'progress':
                loadStudentProgressTab(studentId);
                break;
        }
    }
}

// Helper function to get Arabic tab name
function getTabNameArabic(tabName) {
    const names = {
        'info': 'المعلومات',
        'evaluations': 'التقييمات',
        'medical': 'السجل الطبي',
        'progress': 'التقدم'
    };
    return names[tabName] || tabName;
}

// Load student info tab
function loadStudentInfoTab(studentId, student) {
    const tabPane = document.getElementById('student-info-tab');
    if (!tabPane) return;
    
    const age = calculateAge(student.birthDate);
    const disabilityText = getDisabilityTypeText(student.disabilityType);
    
    tabPane.innerHTML = `
        <div class="info-grid">
            <div class="info-section">
                <h4><i class="fas fa-info-circle"></i> المعلومات الشخصية</h4>
                <div class="info-list">
                    <div class="info-item">
                        <label>الاسم الكامل:</label>
                        <span>${student.fullName || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>رقم الهوية:</label>
                        <span>${student.nationalId || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>تاريخ الميلاد:</label>
                        <span>${formatDate(student.birthDate)}</span>
                    </div>
                    <div class="info-item">
                        <label>العمر:</label>
                        <span>${age} سنوات</span>
                    </div>
                    <div class="info-item">
                        <label>الجنس:</label>
                        <span>${student.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-hearing-impaired"></i> معلومات الإعاقة</h4>
                <div class="info-list">
                    <div class="info-item">
                        <label>نوع الإعاقة:</label>
                        <span>${disabilityText}</span>
                    </div>
                    <div class="info-item">
                        <label>تاريخ الإصابة:</label>
                        <span>${student.disabilityDate ? formatDate(student.disabilityDate) : 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>درجة السمع:</label>
                        <span>${student.hearingLevel || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>السماعة الطبية:</label>
                        <span>${student.hearingAid ? 'نعم' : 'لا'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-home"></i> معلومات التواصل</h4>
                <div class="info-list">
                    <div class="info-item">
                        <label>العنوان:</label>
                        <span>${student.address || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>الهاتف:</label>
                        <span>${student.phone || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>البريد الإلكتروني:</label>
                        <span>${student.email || 'غير محدد'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-user-friends"></i> ولي الأمر</h4>
                <div class="info-list">
                    <div class="info-item">
                        <label>اسم ولي الأمر:</label>
                        <span>${student.guardianName || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>صلة القرابة:</label>
                        <span>${student.guardianRelation || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>هاتف ولي الأمر:</label>
                        <span>${student.guardianPhone || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>البريد الإلكتروني:</label>
                        <span>${student.guardianEmail || 'غير محدد'}</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${student.medicalHistory ? `
        <div class="info-section full-width">
            <h4><i class="fas fa-file-medical"></i> التاريخ المرضي</h4>
            <div class="medical-history-content">
                ${student.medicalHistory}
            </div>
        </div>
        ` : ''}
        
        ${student.notes ? `
        <div class="info-section full-width">
            <h4><i class="fas fa-sticky-note"></i> ملاحظات</h4>
            <div class="notes-content">
                ${student.notes}
            </div>
        </div>
        ` : ''}
    `;
}

// Load student evaluations tab
function loadStudentEvaluationsTab(studentId) {
    const tabPane = document.getElementById('student-evaluations-tab');
    if (!tabPane) return;
    
    tabPane.innerHTML = '<div class="loading">جاري تحميل التقييمات...</div>';
    
    database.ref('evaluations').orderByChild('studentId').equalTo(studentId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                tabPane.innerHTML = '<div class="empty-state">لا توجد تقييمات لهذا الطالب</div>';
                return;
            }
            
            let evaluationsHTML = `
                <div class="evaluations-header">
                    <h4>التقييمات</h4>
                    <button class="btn btn-sm btn-primary" onclick="addEvaluationForStudent('${studentId}')">
                        <i class="fas fa-plus"></i> إضافة تقييم
                    </button>
                </div>
                <div class="evaluations-list">
            `;
            
            const evaluations = [];
            snapshot.forEach(child => {
                evaluations.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Sort by date (newest first)
            evaluations.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            evaluations.forEach(eval => {
                const subjectText = getSubjectText(eval.subject);
                const levelText = getEvaluationText(eval.level);
                const levelColor = getEvaluationColor(eval.level);
                
                evaluationsHTML += `
                    <div class="evaluation-card">
                        <div class="evaluation-header">
                            <div class="eval-subject">${subjectText}</div>
                            <div class="eval-level" style="background: ${levelColor}">${levelText}</div>
                        </div>
                        <div class="evaluation-details">
                            <div class="eval-info">
                                <span><i class="far fa-calendar"></i> ${formatDate(eval.date)}</span>
                                <span><i class="fas fa-user-md"></i> ${eval.specialistName || 'أخصائي'}</span>
                                <span><i class="fas fa-chart-line"></i> ${eval.type === 'diagnostic' ? 'تشخيصي' : 
                                    eval.type === 'formative' ? 'تكويني' : 
                                    eval.type === 'summative' ? 'ختامي' : eval.type}</span>
                            </div>
                            ${eval.notes ? `
                            <div class="eval-notes">
                                <strong>ملاحظات:</strong> ${eval.notes}
                            </div>
                            ` : ''}
                            ${eval.recommendations ? `
                            <div class="eval-recommendations">
                                <strong>توصيات:</strong> ${eval.recommendations}
                            </div>
                            ` : ''}
                        </div>
                        <div class="evaluation-actions">
                            <button class="btn btn-sm" onclick="viewEvaluationDetails('${eval.id}')">عرض التفاصيل</button>
                        </div>
                    </div>
                `;
            });
            
            evaluationsHTML += '</div>';
            tabPane.innerHTML = evaluationsHTML;
        })
        .catch(error => {
            tabPane.innerHTML = '<div class="error">حدث خطأ في تحميل التقييمات</div>';
        });
}

// View evaluation details
function viewEvaluationDetails(evaluationId) {
    database.ref(`evaluations/${evaluationId}`).once('value')
        .then(snapshot => {
            const evaluation = snapshot.val();
            if (!evaluation) {
                showMessage('التقييم غير موجود', 'error');
                return;
            }
            
            const modalContent = document.getElementById('evaluationModalContent');
            if (!modalContent) return;
            
            const subjectText = getSubjectText(evaluation.subject);
            const levelText = getEvaluationText(evaluation.level);
            const levelColor = getEvaluationColor(evaluation.level);
            
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>تفاصيل التقييم</h2>
                    <p>${subjectText}</p>
                </div>
                <div class="modal-body">
                    <div class="evaluation-details-full">
                        <div class="eval-summary">
                            <div class="summary-item">
                                <label>الطالب:</label>
                                <span>${evaluation.studentName || 'غير محدد'}</span>
                            </div>
                            <div class="summary-item">
                                <label>التاريخ:</label>
                                <span>${formatDate(evaluation.date)}</span>
                            </div>
                            <div class="summary-item">
                                <label>الأخصائي:</label>
                                <span>${evaluation.specialistName || 'غير محدد'}</span>
                            </div>
                            <div class="summary-item">
                                <label>نوع التقييم:</label>
                                <span>${evaluation.type === 'diagnostic' ? 'تشخيصي' : 
                                    evaluation.type === 'formative' ? 'تكويني' : 
                                    evaluation.type === 'summative' ? 'ختامي' : evaluation.type}</span>
                            </div>
                            <div class="summary-item">
                                <label>المستوى:</label>
                                <span class="level-badge" style="background: ${levelColor}">${levelText}</span>
                            </div>
                            <div class="summary-item">
                                <label>الدرجة:</label>
                                <span>${evaluation.score || 0}/100</span>
                            </div>
                        </div>
                        
                        ${evaluation.strengths ? `
                        <div class="eval-section">
                            <h4><i class="fas fa-thumbs-up"></i> نقاط القوة</h4>
                            <div class="section-content">${evaluation.strengths}</div>
                        </div>
                        ` : ''}
                        
                        ${evaluation.weaknesses ? `
                        <div class="eval-section">
                            <h4><i class="fas fa-thumbs-down"></i> نقاط الضعف</h4>
                            <div class="section-content">${evaluation.weaknesses}</div>
                        </div>
                        ` : ''}
                        
                        ${evaluation.recommendations ? `
                        <div class="eval-section">
                            <h4><i class="fas fa-lightbulb"></i> التوصيات</h4>
                            <div class="section-content">${evaluation.recommendations}</div>
                        </div>
                        ` : ''}
                        
                        ${evaluation.skills && evaluation.skills.length > 0 ? `
                        <div class="eval-section">
                            <h4><i class="fas fa-tasks"></i> المهارات المقيمة</h4>
                            <div class="skills-list">
                                ${evaluation.skills.map(skill => {
                                    const skillNames = {
                                        'hearing': 'التمييز السمعي',
                                        'speech': 'وضوح النطق',
                                        'vocabulary': 'المفردات اللغوية',
                                        'comprehension': 'الفهم اللغوي',
                                        'expression': 'التعبير اللغوي',
                                        'social': 'المهارات الاجتماعية'
                                    };
                                    return `<span class="skill-tag">${skillNames[skill] || skill}</span>`;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${evaluation.notes ? `
                        <div class="eval-section">
                            <h4><i class="fas fa-sticky-note"></i> ملاحظات إضافية</h4>
                            <div class="section-content">${evaluation.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('evaluationModal')">إغلاق</button>
                    <button class="btn btn-primary" onclick="printEvaluation('${evaluationId}')">
                        <i class="fas fa-print"></i> طباعة التقرير
                    </button>
                </div>
            `;
            
            // Load student name
            if (evaluation.studentId) {
                database.ref(`students/${evaluation.studentId}`).once('value')
                    .then(studentSnapshot => {
                        const student = studentSnapshot.val();
                        if (student) {
                            const studentNameSpan = modalContent.querySelector('.summary-item:nth-child(1) span');
                            if (studentNameSpan) {
                                studentNameSpan.textContent = student.fullName;
                            }
                        }
                    });
            }
            
            document.getElementById('evaluationModal').style.display = 'block';
        })
        .catch(error => {
            showMessage('خطأ في تحميل تفاصيل التقييم: ' + error.message, 'error');
        });
}

// Load student medical tab
function loadStudentMedicalTab(studentId) {
    const tabPane = document.getElementById('student-medical-tab');
    if (!tabPane) return;
    
    tabPane.innerHTML = `
        <div class="medical-tab">
            <div class="medical-actions">
                <button class="btn btn-primary" onclick="addMedicalRecord('${studentId}')">
                    <i class="fas fa-plus"></i> إضافة سجل طبي
                </button>
            </div>
            <div class="medical-records" id="medicalRecordsList">
                جاري تحميل السجلات الطبية...
            </div>
        </div>
    `;
    
    loadMedicalRecords(studentId);
}

// Add medical record
function addMedicalRecord(studentId) {
    const modalContent = document.getElementById('evaluationModalContent');
    if (!modalContent) return;
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>إضافة سجل طبي</h2>
            <p>إضافة معلومات طبية جديدة للطالب</p>
        </div>
        <div class="modal-body">
            <form id="medicalForm" onsubmit="submitMedicalRecord('${studentId}'); return false;">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="medicalDate">التاريخ *</label>
                        <input type="date" id="medicalDate" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="medicalType">نوع السجل *</label>
                        <select id="medicalType" required>
                            <option value="">اختر النوع</option>
                            <option value="checkup">فحص دوري</option>
                            <option value="treatment">علاج</option>
                            <option value="vaccination">تطعيم</option>
                            <option value="test">تحليل</option>
                            <option value="emergency">طوارئ</option>
                            <option value="other">أخرى</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="medicalDoctor">اسم الطبيب</label>
                        <input type="text" id="medicalDoctor">
                    </div>
                    
                    <div class="form-group">
                        <label for="medicalClinic">العيادة / المستشفى</label>
                        <input type="text" id="medicalClinic">
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="medicalDescription">التشخيص / الوصف *</label>
                        <textarea id="medicalDescription" rows="4" required></textarea>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="medicalTreatment">العلاج الموصوف</label>
                        <textarea id="medicalTreatment" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="medicalNotes">ملاحظات</label>
                        <textarea id="medicalNotes" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="medicalFollowup">موعد المتابعة</label>
                        <input type="date" id="medicalFollowup">
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('evaluationModal')">إلغاء</button>
                    <button type="submit" class="btn btn-success">حفظ السجل</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('evaluationModal').style.display = 'block';
}

// Submit medical record
function submitMedicalRecord(studentId) {
    const medicalData = {
        studentId: studentId,
        date: document.getElementById('medicalDate').value,
        type: document.getElementById('medicalType').value,
        doctor: document.getElementById('medicalDoctor').value,
        clinic: document.getElementById('medicalClinic').value,
        description: document.getElementById('medicalDescription').value,
        treatment: document.getElementById('medicalTreatment').value,
        notes: document.getElementById('medicalNotes').value,
        followupDate: document.getElementById('medicalFollowup').value,
        specialistId: localStorage.getItem('userId'),
        specialistName: localStorage.getItem('userName'),
        createdAt: new Date().toISOString()
    };
    
    // Validate required fields
    if (!medicalData.date || !medicalData.type || !medicalData.description) {
        showMessage('يرجى ملء جميع الحقول الإلزامية', 'error');
        return;
    }
    
    database.ref('medicalRecords').push(medicalData)
        .then(() => {
            showMessage('تم حفظ السجل الطبي بنجاح', 'success');
            closeModal('evaluationModal');
            
            // Reload medical records
            loadMedicalRecords(studentId);
            
            // Log activity
            logActivity('add', 'تم إضافة سجل طبي جديد');
        })
        .catch(error => {
            showMessage('خطأ في حفظ السجل الطبي: ' + error.message, 'error');
        });
}

// Load medical records
function loadMedicalRecords(studentId) {
    const recordsList = document.getElementById('medicalRecordsList');
    if (!recordsList) return;
    
    database.ref('medicalRecords').orderByChild('studentId').equalTo(studentId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                recordsList.innerHTML = '<div class="empty-state">لا توجد سجلات طبية</div>';
                return;
            }
            
            let recordsHTML = '';
            const records = [];
            
            snapshot.forEach(child => {
                records.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Sort by date (newest first)
            records.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            records.forEach(record => {
                const typeText = getMedicalTypeText(record.type);
                
                recordsHTML += `
                    <div class="medical-record-card">
                        <div class="record-header">
                            <div class="record-type">${typeText}</div>
                            <div class="record-date">${formatDate(record.date)}</div>
                        </div>
                        <div class="record-details">
                            <div class="record-info">
                                ${record.doctor ? `<span><i class="fas fa-user-md"></i> ${record.doctor}</span>` : ''}
                                ${record.clinic ? `<span><i class="fas fa-hospital"></i> ${record.clinic}</span>` : ''}
                            </div>
                            <div class="record-description">
                                <strong>التشخيص:</strong> ${record.description}
                            </div>
                            ${record.treatment ? `
                            <div class="record-treatment">
                                <strong>العلاج:</strong> ${record.treatment}
                            </div>
                            ` : ''}
                            ${record.followupDate ? `
                            <div class="record-followup">
                                <strong>موعد المتابعة:</strong> ${formatDate(record.followupDate)}
                            </div>
                            ` : ''}
                            ${record.notes ? `
                            <div class="record-notes">
                                <strong>ملاحظات:</strong> ${record.notes}
                            </div>
                            ` : ''}
                        </div>
                        <div class="record-footer">
                            <span>أضيف بواسطة: ${record.specialistName || 'أخصائي'}</span>
                        </div>
                    </div>
                `;
            });
            
            recordsList.innerHTML = recordsHTML;
        })
        .catch(error => {
            recordsList.innerHTML = '<div class="error">حدث خطأ في تحميل السجلات الطبية</div>';
        });
}

// Load student progress tab
function loadStudentProgressTab(studentId) {
    const tabPane = document.getElementById('student-progress-tab');
    if (!tabPane) return;
    
    tabPane.innerHTML = `
        <div class="progress-tab">
            <div class="progress-filters">
                <select id="progressSubject" onchange="updateProgressChart('${studentId}')">
                    <option value="all">جميع المواد</option>
                    <option value="arabic">اللغة العربية</option>
                    <option value="math">الرياضيات</option>
                    <option value="science">العلوم</option>
                    <option value="hearing">تدريب السمع</option>
                    <option value="speech">تدريب النطق</option>
                </select>
                <select id="progressPeriod" onchange="updateProgressChart('${studentId}')">
                    <option value="6m">آخر 6 أشهر</option>
                    <option value="1y">آخر سنة</option>
                    <option value="all">جميع الفترات</option>
                </select>
            </div>
            <div class="progress-chart">
                <canvas id="progressChart"></canvas>
            </div>
        </div>
    `;
    
    // Load progress data and initialize chart
    setTimeout(() => {
        updateProgressChart(studentId);
    }, 100);
}

// Update progress chart
function updateProgressChart(studentId) {
    const subject = document.getElementById('progressSubject').value;
    const period = document.getElementById('progressPeriod').value;
    
    // This would normally fetch data from database
    // For now, show sample chart
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;
    
    // Sample data
    const labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    const scores = [65, 70, 75, 80, 85, 88];
    
    // Check if Chart is available
    if (typeof Chart === 'undefined') {
        ctx.innerHTML = '<div class="error">مكتبة الرسوم البيانية غير متوفرة</div>';
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'درجات التقييم',
                data: scores,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Tahoma',
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'تقدم الطالب',
                    font: {
                        size: 16,
                        family: 'Tahoma'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'الدرجة'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'الشهر'
                    }
                }
            }
        }
    });
}

// Load recent evaluations
function loadRecentEvaluations() {
    const specialistId = localStorage.getItem('userId');
    const evaluationsList = document.getElementById('recentEvaluations');
    
    if (!evaluationsList) return;
    
    database.ref('evaluations').orderByChild('specialistId').equalTo(specialistId).limitToLast(5).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                evaluationsList.innerHTML = '<div class="empty-state">لا توجد تقييمات حديثة</div>';
                return;
            }
            
            let evaluationsHTML = '';
            const evaluations = [];
            
            snapshot.forEach(child => {
                evaluations.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Sort by date (newest first)
            evaluations.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            evaluations.forEach(eval => {
                const subjectText = getSubjectText(eval.subject);
                const levelText = getEvaluationText(eval.level);
                const levelColor = getEvaluationColor(eval.level);
                
                evaluationsHTML += `
                    <div class="recent-evaluation-item">
                        <div class="eval-header">
                            <div class="eval-student">${eval.studentName || 'طالب'}</div>
                            <div class="eval-level" style="background: ${levelColor}">${levelText}</div>
                        </div>
                        <div class="eval-details">
                            <span>${subjectText}</span>
                            <span>${formatDate(eval.date)}</span>
                        </div>
                        <div class="eval-actions">
                            <button class="btn btn-sm" onclick="viewEvaluationDetails('${eval.id}')">عرض</button>
                        </div>
                    </div>
                `;
            });
            
            evaluationsList.innerHTML = evaluationsHTML;
        })
        .catch(error => {
            evaluationsList.innerHTML = '<div class="error">حدث خطأ في تحميل التقييمات</div>';
        });
}

// Load specialist stats
function loadSpecialistStats() {
    const specialistId = localStorage.getItem('userId');
    
    // Load monthly evaluations count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    database.ref('evaluations')
        .orderByChild('specialistId')
        .equalTo(specialistId)
        .once('value')
        .then(snapshot => {
            let count = 0;
            snapshot.forEach(child => {
                const evalDate = new Date(child.val().date);
                if (evalDate >= startOfMonth) {
                    count++;
                }
            });
            
            const monthlyEvals = document.getElementById('monthlyEvaluations');
            if (monthlyEvals) {
                monthlyEvals.textContent = count;
            }
        });
}

// Search my students
function searchMyStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const studentsTable = document.getElementById('myStudentsTable');
    
    if (!studentsTable || searchTerm.length < 2) {
        if (searchTerm.length === 0) {
            loadMyStudents();
        }
        return;
    }
    
    studentsTable.innerHTML = '';
    
    const filteredStudents = myStudents.filter(student => {
        return (
            (student.fullName && student.fullName.toLowerCase().includes(searchTerm)) ||
            (student.nationalId && student.nationalId.includes(searchTerm)) ||
            (student.guardianName && student.guardianName.toLowerCase().includes(searchTerm))
        );
    });
    
    filteredStudents.forEach((student, index) => {
        const row = createSpecialistStudentRow(student.id, student, index + 1);
        studentsTable.appendChild(row);
    });
}

// Load all evaluations
function loadAllEvaluations() {
    // Implementation for loading all evaluations
    showMessage('جاري تحميل جميع التقييمات...', 'info');
}

// Print evaluation
function printEvaluation(evaluationId) {
    showMessage('جاري إعداد التقرير للطباعة...', 'info');
    // Implementation would generate a printable report
}

// Setup event listeners for specialist
function setupSpecialistEventListeners() {
    // Prevent form submission on Enter key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
    
    // Close modals on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// ============================================
// الجزء السادس: وظائف لوحة تحكم ولي الأمر
// ============================================

// Initialize parent dashboard
function initParentDashboard() {
    if (!checkPermission('parent')) {
        return;
    }
    
    // Load user data
    const userName = localStorage.getItem('userName') || 'ولي الأمر';
    document.getElementById('parentName').textContent = userName;
    document.getElementById('userMenuName').textContent = userName;
    document.getElementById('parentWelcomeName').textContent = userName;
    
    // Initialize date display
    updateCurrentDate();
    
    // Load initial data
    loadParentDashboard();
    
    // Set up event listeners
    setupParentEventListeners();
    
    // Hide loading overlay
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }, 1000);
}

// Load parent dashboard data
function loadParentDashboard() {
    const parentId = localStorage.getItem('userId');
    
    // Load child information
    loadChildInformation();
    
    // Load dashboard stats
    loadParentStats();
    
    // Load recent updates
    loadRecentUpdates();
    
    // Load important dates
    loadImportantDates();
}

// Load child information
function loadChildInformation() {
    const parentId = localStorage.getItem('userId');
    
    // First, find which student is linked to this parent
    database.ref('students').orderByChild('guardianUserId').equalTo(parentId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                // Try alternative: check by guardian email
                const userEmail = localStorage.getItem('userEmail');
                return database.ref('students').orderByChild('guardianEmail').equalTo(userEmail).once('value');
            }
            return snapshot;
        })
        .then(snapshot => {
            if (!snapshot.exists()) {
                displayNoChildFound();
                return;
            }
            
            let childData = null;
            snapshot.forEach(child => {
                childData = {
                    id: child.key,
                    ...child.val()
                };
            });
            
            if (!childData) {
                displayNoChildFound();
                return;
            }
            
            // Store child ID for later use
            localStorage.setItem('childId', childData.id);
            
            // Display child info card
            displayChildInfoCard(childData);
            
            // Load child profile if that section is active
            const profileContent = document.getElementById('childProfileContent');
            if (profileContent && document.getElementById('child-profile-section').classList.contains('active')) {
                displayChildProfile(childData);
            }
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات الطفل: ' + error.message, 'error');
        });
}

// Display no child found message
function displayNoChildFound() {
    const childInfoCard = document.getElementById('childInfoCard');
    if (childInfoCard) {
        childInfoCard.innerHTML = `
            <div class="no-child-card">
                <div class="no-child-icon">
                    <i class="fas fa-user-slash"></i>
                </div>
                <div class="no-child-content">
                    <h3>لم يتم العثور على طالب مرتبط بحسابك</h3>
                    <p>يرجى التواصل مع إدارة المدرسة لربط حسابك بابنك/ابنتك</p>
                    <button class="btn btn-primary" onclick="contactSchool()">
                        <i class="fas fa-phone"></i> الاتصال بالمدرسة
                    </button>
                </div>
            </div>
        `;
    }
}

// Display child info card
function displayChildInfoCard(child) {
    const childInfoCard = document.getElementById('childInfoCard');
    if (!childInfoCard) return;
    
    const age = calculateAge(child.birthDate);
    const disabilityText = getDisabilityTypeText(child.disabilityType);
    
    childInfoCard.innerHTML = `
        <div class="child-card">
            <div class="child-card-header">
                <div class="child-avatar">
                    <i class="fas fa-child"></i>
                </div>
                <div class="child-info">
                    <h3>${child.fullName || 'غير محدد'}</h3>
                    <p>ابني/ابنتي - ${child.grade || 'غير محدد'}</p>
                    <div class="child-tags">
                        <span class="tag age">${age} سنوات</span>
                        <span class="tag disability">${disabilityText}</span>
                        <span class="tag status active">نشط</span>
                    </div>
                </div>
            </div>
            <div class="child-card-details">
                <div class="detail-row">
                    <span><i class="fas fa-school"></i> المدرسة:</span>
                    <span>مدرسة الأمل للتربية الخاصة</span>
                </div>
                <div class="detail-row">
                    <span><i class="fas fa-user-md"></i> الأخصائي المتابع:</span>
                    <span>${child.specialistName || 'لم يتم التعيين'}</span>
                </div>
                <div class="detail-row">
                    <span><i class="fas fa-phone"></i> هاتف المدرسة:</span>
                    <span>0112345678</span>
                </div>
            </div>
            <div class="child-card-actions">
                <button class="btn btn-sm" onclick="showSection('child-profile')">
                    <i class="fas fa-user"></i> الملف الشخصي
                </button>
                <button class="btn btn-sm btn-primary" onclick="showSection('child-grades')">
                    <i class="fas fa-chart-line"></i> النتائج
                </button>
                <button class="btn btn-sm btn-success" onclick="sendMessageToSpecialist()">
                    <i class="fas fa-envelope"></i> مراسلة الأخصائي
                </button>
            </div>
        </div>
    `;
}

// Load parent stats
function loadParentStats() {
    const childId = localStorage.getItem('childId');
    if (!childId) return;
    
    // Load child evaluations for stats
    database.ref('evaluations').orderByChild('studentId').equalTo(childId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                // No evaluations found
                updateStats(0, 0, 0, 0);
                return;
            }
            
            let totalScore = 0;
            let evalCount = 0;
            let recentEvalCount = 0;
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            
            snapshot.forEach(child => {
                const evaluation = child.val();
                if (evaluation.score) {
                    totalScore += parseInt(evaluation.score);
                    evalCount++;
                }
                
                // Count recent evaluations (last month)
                const evalDate = new Date(evaluation.date);
                if (evalDate >= oneMonthAgo) {
                    recentEvalCount++;
                }
            });
            
            const avgScore = evalCount > 0 ? Math.round(totalScore / evalCount) : 0;
            
            // Update stats
            updateStats(avgScore, recentEvalCount, 95, 0); // Attendance and messages are sample data
        })
        .catch(error => {
            console.error('Error loading child stats:', error);
        });
}

// Update stats display
function updateStats(avgGrade, recentEvals, attendance, newMessages) {
    const childAverageGrade = document.getElementById('childAverageGrade');
    const childRecentEvaluations = document.getElementById('childRecentEvaluations');
    const attendanceRate = document.getElementById('attendanceRate');
    const newMessagesCount = document.getElementById('newMessages');
    
    if (childAverageGrade) childAverageGrade.textContent = avgGrade + '%';
    if (childRecentEvaluations) childRecentEvaluations.textContent = recentEvals;
    if (attendanceRate) attendanceRate.textContent = attendance + '%';
    if (newMessagesCount) newMessagesCount.textContent = newMessages;
}

// Load recent updates
function loadRecentUpdates() {
    const updatesList = document.getElementById('recentUpdates');
    if (!updatesList) return;
    
    const childId = localStorage.getItem('childId');
    if (!childId) {
        updatesList.innerHTML = '<div class="empty-state">لا توجد تحديثات متاحة</div>';
        return;
    }
    
    // This would normally query the database for updates related to this child
    // For now, show sample updates
    const sampleUpdates = [
        {
            type: 'evaluation',
            title: 'تقييم جديد',
            message: 'تم إضافة تقييم جديد في مادة اللغة العربية',
            date: '2024-01-15',
            time: 'منذ 2 يوم'
        },
        {
            type: 'medical',
            title: 'تحديث طبي',
            message: 'تم تحديث السجل الطبي للطفل',
            date: '2024-01-10',
            time: 'منذ أسبوع'
        },
        {
            type: 'general',
            title: 'إشعار عام',
            message: 'اجتماع أولياء الأمور الشهري يوم الأربعاء القادم',
            date: '2024-01-05',
            time: 'منذ أسبوعين'
        }
    ];
    
    let updatesHTML = '';
    
    sampleUpdates.forEach(update => {
        const icon = update.type === 'evaluation' ? 'fa-clipboard-check' : 
                    update.type === 'medical' ? 'fa-file-medical' : 'fa-bell';
        
        updatesHTML += `
            <div class="update-item">
                <div class="update-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="update-content">
                    <div class="update-title">${update.title}</div>
                    <div class="update-message">${update.message}</div>
                    <div class="update-time">${update.time}</div>
                </div>
            </div>
        `;
    });
    
    updatesList.innerHTML = updatesHTML;
}

// Load important dates
function loadImportantDates() {
    const datesList = document.getElementById('importantDates');
    if (!datesList) return;
    
    // Sample important dates
    const importantDates = [
        { date: '2024-01-25', title: 'اجتماع أولياء الأمور', type: 'meeting' },
        { date: '2024-02-15', title: 'نهاية الفصل الدراسي الأول', type: 'academic' },
        { date: '2024-02-20', title: 'بداية إجازة منتصف العام', type: 'holiday' },
        { date: '2024-03-10', title: 'بداية الفصل الدراسي الثاني', type: 'academic' }
    ];
    
    let datesHTML = '';
    
    importantDates.forEach(item => {
        const dateObj = new Date(item.date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString('ar-SA', { month: 'long' });
        const typeIcon = item.type === 'meeting' ? 'fa-users' : 
                        item.type === 'academic' ? 'fa-graduation-cap' : 'fa-umbrella-beach';
        const typeClass = item.type === 'meeting' ? 'meeting' : 
                         item.type === 'academic' ? 'academic' : 'holiday';
        
        datesHTML += `
            <div class="date-item ${typeClass}">
                <div class="date-display">
                    <div class="date-day">${day}</div>
                    <div class="date-month">${month}</div>
                </div>
                <div class="date-details">
                    <div class="date-title">${item.title}</div>
                    <div class="date-info">
                        <i class="fas ${typeIcon}"></i>
                        <span>${formatDate(item.date)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    datesList.innerHTML = datesHTML;
}

// Load child profile
function loadChildProfile() {
    const childId = localStorage.getItem('childId');
    if (!childId) {
        const profileContent = document.getElementById('childProfileContent');
        if (profileContent) {
            profileContent.innerHTML = `
                <div class="no-child-message">
                    <i class="fas fa-user-slash"></i>
                    <h3>لم يتم العثور على طالب مرتبط بحسابك</h3>
                    <p>يرجى التواصل مع إدارة المدرسة</p>
                </div>
            `;
        }
        return;
    }
    
    database.ref(`students/${childId}`).once('value')
        .then(snapshot => {
            const child = snapshot.val();
            if (!child) {
                showMessage('لم يتم العثور على بيانات الطفل', 'error');
                return;
            }
            
            displayChildProfile(child);
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات الطفل: ' + error.message, 'error');
        });
}

// Display child profile
function displayChildProfile(child) {
    const profileContent = document.getElementById('childProfileContent');
    if (!profileContent) return;
    
    const age = calculateAge(child.birthDate);
    const disabilityText = getDisabilityTypeText(child.disabilityType);
    
    profileContent.innerHTML = `
        <div class="child-profile-container">
            <div class="profile-header">
                <div class="child-avatar-large">
                    <i class="fas fa-child"></i>
                </div>
                <div class="profile-header-info">
                    <h3>${child.fullName || 'غير محدد'}</h3>
                    <p>ابني/ابنتي - ${child.grade || 'غير محدد'}</p>
                    <div class="profile-tags">
                        <span class="tag age">العمر: ${age} سنوات</span>
                        <span class="tag disability">${disabilityText}</span>
                        <span class="tag status active">نشط</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-tabs">
                <button class="tab-btn active" onclick="showChildTab('info')">المعلومات</button>
                <button class="tab-btn" onclick="showChildTab('medical')">السجل الطبي</button>
                <button class="tab-btn" onclick="showChildTab('specialist')">الأخصائي المتابع</button>
                <button class="tab-btn" onclick="showChildTab('progress')">متابعة التقدم</button>
            </div>
            
            <div class="profile-tab-content">
                <div id="child-info-tab" class="tab-pane active">
                    <!-- Child info will be loaded here -->
                </div>
                <div id="child-medical-tab" class="tab-pane">
                    <!-- Medical info will be loaded here -->
                </div>
                <div id="child-specialist-tab" class="tab-pane">
                    <!-- Specialist info will be loaded here -->
                </div>
                <div id="child-progress-tab" class="tab-pane">
                    <!-- Progress info will be loaded here -->
                </div>
            </div>
        </div>
    `;
    
    // Load initial tab
    showChildTab('info', child);
}

// Show child tab content
function showChildTab(tabName, child = null) {
    if (!child) {
        const childId = localStorage.getItem('childId');
        if (!childId) return;
        
        // Load child data first
        database.ref(`students/${childId}`).once('value')
            .then(snapshot => {
                const childData = snapshot.val();
                if (childData) {
                    showChildTabContent(tabName, childData);
                }
            });
    } else {
        showChildTabContent(tabName, child);
    }
}

// Show child tab content
function showChildTabContent(tabName, child) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event) {
        event.target.classList.add('active');
    }
    
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Show selected tab
    const tabPane = document.getElementById(`child-${tabName}-tab`);
    if (tabPane) {
        tabPane.classList.add('active');
        
        // Load tab content
        switch(tabName) {
            case 'info':
                loadChildInfoTab(child);
                break;
            case 'medical':
                loadChildMedicalTab(child.id);
                break;
            case 'specialist':
                loadChildSpecialistTab(child);
                break;
            case 'progress':
                loadChildProgressTab(child.id);
                break;
        }
    }
}

// Load child info tab
function loadChildInfoTab(child) {
    const tabPane = document.getElementById('child-info-tab');
    if (!tabPane) return;
    
    const age = calculateAge(child.birthDate);
    const disabilityText = getDisabilityTypeText(child.disabilityType);
    
    tabPane.innerHTML = `
        <div class="info-grid">
            <div class="info-section">
                <h4><i class="fas fa-info-circle"></i> المعلومات الشخصية</h4>
                <div class="info-list">
                    <div class="info-item">
                        <label>الاسم الكامل:</label>
                        <span>${child.fullName || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>رقم الهوية:</label>
                        <span>${child.nationalId || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>تاريخ الميلاد:</label>
                        <span>${formatDate(child.birthDate)}</span>
                    </div>
                    <div class="info-item">
                        <label>العمر:</label>
                        <span>${age} سنوات</span>
                    </div>
                    <div class="info-item">
                        <label>الجنس:</label>
                        <span>${child.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-hearing-impaired"></i> معلومات الإعاقة</h4>
                <div class="info-list">
                    <div class="info-item">
                        <label>نوع الإعاقة:</label>
                        <span>${disabilityText}</span>
                    </div>
                    <div class="info-item">
                        <label>تاريخ الإصابة:</label>
                        <span>${child.disabilityDate ? formatDate(child.disabilityDate) : 'غير محدد'}</span>
                    </div>
                    ${child.hearingLevel ? `
                    <div class="info-item">
                        <label>درجة السمع:</label>
                        <span>${child.hearingLevel}</span>
                    </div>
                    ` : ''}
                    ${child.hearingAid !== undefined ? `
                    <div class="info-item">
                        <label>السماعة الطبية:</label>
                        <span>${child.hearingAid ? 'نعم' : 'لا'}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-school"></i> المعلومات الدراسية</h4>
                <div class="info-list">
                    <div class="info-item">
                        <label>الصف الدراسي:</label>
                        <span>${child.grade || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>تاريخ الالتحاق:</label>
                        <span>${child.enrollmentDate ? formatDate(child.enrollmentDate) : 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>رقم القيد:</label>
                        <span>${child.studentId || 'غير محدد'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-user-md"></i> المختص المتابع</h4>
                <div class="info-list">
                    <div class="info-item">
                        <label>اسم الأخصائي:</label>
                        <span>${child.specialistName || 'لم يتم التعيين'}</span>
                    </div>
                    <div class="info-item">
                        <label>التخصص:</label>
                        <span>${child.specialistType || 'غير محدد'}</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${child.medicalHistory ? `
        <div class="info-section full-width">
            <h4><i class="fas fa-file-medical"></i> ملخص التاريخ المرضي</h4>
            <div class="medical-summary">
                ${child.medicalHistory}
            </div>
        </div>
        ` : ''}
        
        ${child.notes ? `
        <div class="info-section full-width">
            <h4><i class="fas fa-sticky-note"></i> ملاحظات عامة</h4>
            <div class="general-notes">
                ${child.notes}
            </div>
        </div>
        ` : ''}
    `;
}

// Load child medical tab
function loadChildMedicalTab(childId) {
    const tabPane = document.getElementById('child-medical-tab');
    if (!tabPane) return;
    
    tabPane.innerHTML = '<div class="loading">جاري تحميل السجل الطبي...</div>';
    
    database.ref('medicalRecords').orderByChild('studentId').equalTo(childId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                tabPane.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-medical"></i>
                        <h4>لا توجد سجلات طبية</h4>
                        <p>لم يتم إضافة سجلات طبية للطفل بعد</p>
                    </div>
                `;
                return;
            }
            
            let medicalHTML = '<div class="medical-records-list">';
            const records = [];
            
            snapshot.forEach(child => {
                records.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Sort by date (newest first)
            records.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            records.forEach(record => {
                const typeText = getMedicalTypeText(record.type);
                
                medicalHTML += `
                    <div class="medical-record">
                        <div class="record-header">
                            <div class="record-type">${typeText}</div>
                            <div class="record-date">${formatDate(record.date)}</div>
                        </div>
                        <div class="record-details">
                            <div class="record-info">
                                ${record.doctor ? `<span><i class="fas fa-user-md"></i> ${record.doctor}</span>` : ''}
                                ${record.clinic ? `<span><i class="fas fa-hospital"></i> ${record.clinic}</span>` : ''}
                            </div>
                            <div class="record-description">
                                <strong>التشخيص:</strong> ${record.description}
                            </div>
                            ${record.treatment ? `
                            <div class="record-treatment">
                                <strong>العلاج:</strong> ${record.treatment}
                            </div>
                            ` : ''}
                            ${record.followupDate ? `
                            <div class="record-followup">
                                <strong>موعد المتابعة:</strong> ${formatDate(record.followupDate)}
                            </div>
                            ` : ''}
                        </div>
                        <div class="record-footer">
                            <span>أضيف بواسطة: ${record.specialistName || 'أخصائي المدرسة'}</span>
                        </div>
                    </div>
                `;
            });
            
            medicalHTML += '</div>';
            tabPane.innerHTML = medicalHTML;
        })
        .catch(error => {
            tabPane.innerHTML = '<div class="error">حدث خطأ في تحميل السجل الطبي</div>';
        });
}

// Load child specialist tab
function loadChildSpecialistTab(child) {
    const tabPane = document.getElementById('child-specialist-tab');
    if (!tabPane) return;
    
    // Sample specialist data - in production, this would come from database
    const specialist = {
        name: child.specialistName || 'أ. فاطمة أحمد',
        specialization: 'أخصائية تخاطب وتنمية مهارات',
        qualifications: 'ماجستير في التربية الخاصة - دبلوم اضطرابات التواصل',
        experience: '10 سنوات في مجال التربية الخاصة',
        email: 'fatima.ahmed@school.edu',
        phone: '0551234567',
        schedule: 'الأحد - الخميس: 8 صباحاً - 2 ظهراً',
        notes: 'متخصصة في تدريب الأطفال ذوي الإعاقة السمعية على النطق والتواصل'
    };
    
    tabPane.innerHTML = `
        <div class="specialist-profile">
            <div class="specialist-header">
                <div class="specialist-avatar">
                    <i class="fas fa-user-md"></i>
                </div>
                <div class="specialist-info">
                    <h3>${specialist.name}</h3>
                    <p>${specialist.specialization}</p>
                    <div class="specialist-tags">
                        <span class="tag experience">${specialist.experience}</span>
                        <span class="tag status active">نشط</span>
                    </div>
                </div>
            </div>
            
            <div class="specialist-details">
                <div class="detail-section">
                    <h4><i class="fas fa-graduation-cap"></i> المؤهلات العلمية</h4>
                    <div class="qualifications">
                        ${specialist.qualifications.split(' - ').map(q => `<div class="qualification">${q}</div>`).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-clock"></i> جدول العمل</h4>
                    <div class="schedule">
                        ${specialist.schedule}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-address-card"></i> معلومات التواصل</h4>
                    <div class="contact-info">
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <span>${specialist.email}</span>
                        </div>
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <span>${specialist.phone}</span>
                        </div>
                    </div>
                </div>
                
                ${specialist.notes ? `
                <div class="detail-section">
                    <h4><i class="fas fa-sticky-note"></i> ملاحظات</h4>
                    <div class="specialist-notes">
                        ${specialist.notes}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="specialist-actions">
                <button class="btn btn-primary" onclick="sendMessageToSpecialist()">
                    <i class="fas fa-envelope"></i> إرسال رسالة
                </button>
                <button class="btn btn-secondary" onclick="requestMeeting()">
                    <i class="fas fa-calendar-plus"></i> طلب موعد
                </button>
            </div>
        </div>
    `;
}

// Load child progress tab
function loadChildProgressTab(childId) {
    const tabPane = document.getElementById('child-progress-tab');
    if (!tabPane) return;
    
    tabPane.innerHTML = '<div class="loading">جاري تحميل بيانات التقدم...</div>';
    
    // Load child evaluations for progress tracking
    database.ref('evaluations').orderByChild('studentId').equalTo(childId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                tabPane.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-line"></i>
                        <h4>لا توجد بيانات تقدم</h4>
                        <p>لم يتم إضافة تقييمات للطفل بعد</p>
                    </div>
                `;
                return;
            }
            
            const evaluations = [];
            snapshot.forEach(child => {
                evaluations.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Sort by date
            evaluations.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Group by subject
            const progressBySubject = {};
            
            evaluations.forEach(eval => {
                const subject = eval.subject;
                if (!progressBySubject[subject]) {
                    progressBySubject[subject] = [];
                }
                progressBySubject[subject].push({
                    date: eval.date,
                    score: parseInt(eval.score) || 0,
                    level: eval.level
                });
            });
            
            let progressHTML = `
                <div class="progress-overview">
                    <h4>نظرة عامة على التقدم</h4>
                    <div class="progress-summary">
                        <div class="summary-item">
                            <div class="summary-label">عدد التقييمات</div>
                            <div class="summary-value">${evaluations.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">متوسط الدرجات</div>
                            <div class="summary-value">
                                ${Math.round(evaluations.reduce((sum, eval) => sum + (parseInt(eval.score) || 0), 0) / evaluations.length)}%
                            </div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">أفضل مادة</div>
                            <div class="summary-value">${findBestSubject(evaluations) || 'غير محدد'}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">معدل التحسن</div>
                            <div class="summary-value">${calculateImprovement(evaluations) || 0}%</div>
                        </div>
                </div>
            </div>
            
            <div class="progress-by-subject">
                <h4>التقدم حسب المادة</h4>
        `;
        
        for (const [subject, subjectEvals] of Object.entries(progressBySubject)) {
            const subjectText = getSubjectText(subject);
            const latestScore = subjectEvals[subjectEvals.length - 1].score;
            const firstScore = subjectEvals[0].score;
            const improvement = latestScore - firstScore;
            
            progressHTML += `
                <div class="subject-progress">
                    <div class="subject-header">
                        <h5>${subjectText}</h5>
                        <div class="subject-stats">
                            <span class="current-score">${latestScore}%</span>
                            <span class="improvement ${improvement > 0 ? 'positive' : 'negative'}">
                                ${improvement > 0 ? '+' : ''}${improvement}%
                            </span>
                        </div>
                    </div>
                    <div class="progress-chart-mini">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${latestScore}%"></div>
                        </div>
                        <div class="progress-labels">
                            <span>${firstScore}%</span>
                            <span>بداية</span>
                            <span>${latestScore}%</span>
                            <span>حالياً</span>
                        </div>
                    </div>
                    <div class="progress-details">
                        <div class="detail-item">
                            <span>عدد التقييمات:</span>
                            <span>${subjectEvals.length}</span>
                        </div>
                        <div class="detail-item">
                            <span>آخر تقييم:</span>
                            <span>${formatDate(subjectEvals[subjectEvals.length - 1].date)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        progressHTML += `
            </div>
            
            <div class="progress-actions">
                <button class="btn btn-primary" onclick="printProgressReport()">
                    <i class="fas fa-print"></i> طباعة تقرير التقدم
                </button>
            </div>
        `;
        
        tabPane.innerHTML = progressHTML;
    })
    .catch(error => {
        tabPane.innerHTML = '<div class="error">حدث خطأ في تحميل بيانات التقدم</div>';
    });
}

// Load child grades
function loadChildGrades() {
    const childId = localStorage.getItem('childId');
    if (!childId) {
        const gradesContainer = document.getElementById('childGradesContainer');
        if (gradesContainer) {
            gradesContainer.innerHTML = `
                <div class="no-child-message">
                    <i class="fas fa-user-slash"></i>
                    <h3>لم يتم العثور على طالب مرتبط بحسابك</h3>
                    <p>يرجى التواصل مع إدارة المدرسة</p>
                </div>
            `;
        }
        return;
    }
    
    const gradesContainer = document.getElementById('childGradesContainer');
    if (!gradesContainer) return;
    
    gradesContainer.innerHTML = '<div class="loading">جاري تحميل النتائج...</div>';
    
    // Load child evaluations
    database.ref('evaluations').orderByChild('studentId').equalTo(childId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                gradesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clipboard-check"></i>
                        <h4>لا توجد نتائج متاحة</h4>
                        <p>لم يتم إضافة تقييمات للطفل بعد</p>
                    </div>
                `;
                return;
            }
            
            const evaluations = [];
            snapshot.forEach(child => {
                evaluations.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Sort by date (newest first)
            evaluations.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Group by semester
            const evaluationsBySemester = {};
            
            evaluations.forEach(eval => {
                const semester = eval.semester || 'غير محدد';
                if (!evaluationsBySemester[semester]) {
                    evaluationsBySemester[semester] = [];
                }
                evaluationsBySemester[semester].push(eval);
            });
            
            let gradesHTML = '';
            
            // Calculate overall statistics
            const totalEvals = evaluations.length;
            const avgScore = evaluations.reduce((sum, eval) => sum + (parseInt(eval.score) || 0), 0) / totalEvals;
            const bestSubject = findBestSubject(evaluations);
            
            gradesHTML += `
                <div class="grades-summary">
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="summary-info">
                            <h4>متوسط درجات ابنك/ابنتك</h4>
                            <div class="summary-number">${Math.round(avgScore)}%</div>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <div class="summary-info">
                            <h4>عدد التقييمات</h4>
                            <div class="summary-number">${totalEvals}</div>
                        </div>
                    </div>
                    
                    ${bestSubject ? `
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <div class="summary-info">
                            <h4>أفضل مادة</h4>
                            <div class="summary-text">${bestSubject}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="summary-info">
                            <h4>آخر تقييم</h4>
                            <div class="summary-text">${formatDate(evaluations[0].date)}</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Display evaluations by semester
            for (const [semester, semesterEvals] of Object.entries(evaluationsBySemester)) {
                gradesHTML += `
                    <div class="semester-section">
                        <h3>${semester}</h3>
                        <div class="grades-table-container">
                            <table class="grades-table">
                                <thead>
                                    <tr>
                                        <th>المادة</th>
                                        <th>التاريخ</th>
                                        <th>نوع التقييم</th>
                                        <th>الدرجة</th>
                                        <th>المستوى</th>
                                        <th>الأخصائي</th>
                                        <th>ملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                semesterEvals.forEach(eval => {
                    const subjectText = getSubjectText(eval.subject);
                    const levelText = getEvaluationText(eval.level);
                    const levelColor = getEvaluationColor(eval.level);
                    const typeText = getEvaluationTypeText(eval.type);
                    
                    gradesHTML += `
                        <tr>
                            <td>${subjectText}</td>
                            <td>${formatDate(eval.date)}</td>
                            <td>${typeText}</td>
                            <td>
                                <div class="score-display">
                                    <div class="score-bar">
                                        <div class="score-fill" style="width: ${eval.score || 0}%"></div>
                                    </div>
                                    <span>${eval.score || 0}/100</span>
                                </div>
                            </td>
                            <td>
                                <span class="level-badge" style="background: ${levelColor}">
                                    ${levelText}
                                </span>
                            </td>
                            <td>${eval.specialistName || 'أخصائي'}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="viewEvaluationNotes('${eval.id}')">
                                    <i class="fas fa-eye"></i> عرض
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                gradesHTML += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
            
            gradesHTML += `
                <div class="grades-actions">
                    <button class="btn btn-primary" onclick="printChildGradesReport()">
                        <i class="fas fa-print"></i> طباعة التقرير الدراسي
                    </button>
                    <button class="btn btn-success" onclick="requestDetailedReport()">
                        <i class="fas fa-file-pdf"></i> طلب تقرير مفصل
                    </button>
                </div>
            `;
            
            gradesContainer.innerHTML = gradesHTML;
        })
        .catch(error => {
            gradesContainer.innerHTML = '<div class="error">حدث خطأ في تحميل النتائج</div>';
        });
}

// View evaluation notes
function viewEvaluationNotes(evaluationId) {
    database.ref(`evaluations/${evaluationId}`).once('value')
        .then(snapshot => {
            const evaluation = snapshot.val();
            if (!evaluation) return;
            
            // Create a simple modal to show notes
            const notes = evaluation.notes || 'لا توجد ملاحظات';
            const recommendations = evaluation.recommendations || 'لا توجد توصيات';
            const strengths = evaluation.strengths || 'غير محدد';
            const weaknesses = evaluation.weaknesses || 'غير محدد';
            
            const modalHTML = `
                <div class="evaluation-notes-modal">
                    <div class="modal-header">
                        <h3>ملاحظات التقييم</h3>
                        <button class="close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="notes-section">
                            <h4>نقاط القوة:</h4>
                            <p>${strengths}</p>
                        </div>
                        <div class="notes-section">
                            <h4>نقاط الضعف:</h4>
                            <p>${weaknesses}</p>
                        </div>
                        <div class="notes-section">
                            <h4>التوصيات:</h4>
                            <p>${recommendations}</p>
                        </div>
                        <div class="notes-section">
                            <h4>ملاحظات إضافية:</h4>
                            <p>${notes}</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Create and show modal
            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            modal.innerHTML = modalHTML;
            document.body.appendChild(modal);
            
            // Close modal when clicking outside
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        })
        .catch(error => {
            showMessage('خطأ في تحميل ملاحظات التقييم', 'error');
        });
}

// Find best subject
function findBestSubject(evaluations) {
    if (evaluations.length === 0) return null;
    
    const subjectScores = {};
    
    evaluations.forEach(eval => {
        const subject = eval.subject;
        const score = parseInt(eval.score) || 0;
        
        if (!subjectScores[subject]) {
            subjectScores[subject] = { total: 0, count: 0 };
        }
        
        subjectScores[subject].total += score;
        subjectScores[subject].count++;
    });
    
    let bestSubject = null;
    let bestAvg = 0;
    
    for (const [subject, data] of Object.entries(subjectScores)) {
        const avg = data.total / data.count;
        if (avg > bestAvg) {
            bestAvg = avg;
            bestSubject = getSubjectText(subject);
        }
    }
    
    return bestSubject;
}

// Calculate improvement
function calculateImprovement(evaluations) {
    if (evaluations.length < 2) return null;
    
    // Sort by date
    const sortedEvals = [...evaluations].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Get average of first 3 and last 3 evaluations
    const firstCount = Math.min(3, Math.floor(sortedEvals.length / 2));
    const lastCount = Math.min(3, Math.floor(sortedEvals.length / 2));
    
    let firstAvg = 0;
    let lastAvg = 0;
    
    for (let i = 0; i < firstCount; i++) {
        firstAvg += parseInt(sortedEvals[i].score) || 0;
    }
    firstAvg /= firstCount;
    
    for (let i = sortedEvals.length - lastCount; i < sortedEvals.length; i++) {
        lastAvg += parseInt(sortedEvals[i].score) || 0;
    }
    lastAvg /= lastCount;
    
    return Math.round(lastAvg - firstAvg);
}

// Load child attendance
function loadChildAttendance() {
    // Implementation for loading attendance data
    showMessage('جاري تحميل بيانات الحضور...', 'info');
}

// Load parent messages
function loadParentMessages() {
    // Implementation for loading messages
    showMessage('جاري تحميل الرسائل...', 'info');
}

// Contact school
function contactSchool() {
    showMessage('جاري تحضير معلومات الاتصال...', 'info');
    
    // Show school contact information
    const contactInfo = `
        <div class="contact-info-modal">
            <h3>معلومات الاتصال بالمدرسة</h3>
            <div class="contact-details">
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <div>
                        <strong>هاتف المدرسة:</strong>
                        <p>0112345678</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <div>
                        <strong>البريد الإلكتروني:</strong>
                        <p>info@school.edu</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>العنوان:</strong>
                        <p>شارع المدارس، حي التعاون، الرياض</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-clock"></i>
                    <div>
                        <strong>ساعات العمل:</strong>
                        <p>الأحد - الخميس: 7:30 صباحاً - 2:30 ظهراً</p>
                    </div>
                </div>
            </div>
            <div class="contact-actions">
                <button class="btn btn-primary" onclick="window.location.href='tel:0112345678'">
                    <i class="fas fa-phone"></i> الاتصال الآن
                </button>
                <button class="btn btn-secondary" onclick="sendEmailToSchool()">
                    <i class="fas fa-envelope"></i> إرسال بريد إلكتروني
                </button>
            </div>
        </div>
    `;
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = contactInfo;
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Send message to specialist
function sendMessageToSpecialist() {
    showMessage('جاري تحضير نموذج الرسالة...', 'info');
    
    // Implementation would show a message form
    // For now, show a simple alert
    alert('ستتمكن قريباً من إرسال رسائل مباشرة إلى الأخصائي من خلال هذه المنصة.');
}

// Request meeting
function requestMeeting() {
    showMessage('جاري تحضير نموذج طلب الموعد...', 'info');
    
    // Implementation would show a meeting request form
    alert('ستتمكن قريباً من طلب موعد مع الأخصائي من خلال هذه المنصة.');
}

// Send email to school
function sendEmailToSchool() {
    window.location.href = 'mailto:info@school.edu?subject=استفسار من ولي أمر';
}

// Print child grades report
function printChildGradesReport() {
    showMessage('جاري إعداد التقرير للطباعة...', 'info');
    // Implementation would generate a printable report
}

// Print progress report
function printProgressReport() {
    showMessage('جاري إعداد تقرير التقدم للطباعة...', 'info');
    // Implementation would generate a printable progress report
}

// Request detailed report
function requestDetailedReport() {
    showMessage('تم إرسال طلبك للحصول على تقرير مفصل. سيتم إرساله إلى بريدك الإلكتروني.', 'success');
}

// Setup event listeners for parent
function setupParentEventListeners() {
    // Prevent form submission on Enter key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
}

// ============================================
// الجزء السابع: وظائف لوحة تحكم الطالب
// ============================================

// Initialize student dashboard
function initStudentDashboard() {
    if (!checkPermission('student')) {
        return;
    }
    
    // Load user data
    const userName = localStorage.getItem('userName') || 'الطالب';
    document.getElementById('studentName').textContent = userName;
    document.getElementById('userMenuName').textContent = userName;
    document.getElementById('studentWelcomeName').textContent = userName;
    
    // Initialize date display
    updateCurrentDate();
    
    // Load initial data
    loadStudentDashboard();
    
    // Set up event listeners
    setupStudentEventListeners();
    
    // Hide loading overlay
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }, 1000);
}

// Load student dashboard data
function loadStudentDashboard() {
    const studentId = localStorage.getItem('userId');
    
    // Load student profile
    loadStudentProfile();
    
    // Load dashboard stats
    loadStudentStats();
    
    // Load today's schedule
    loadTodaySchedule();
    
    // Load recent grades
    loadRecentGrades();
}

// Load student profile
function loadStudentProfile() {
    const studentId = localStorage.getItem('userId');
    
    database.ref('students').orderByChild('userId').equalTo(studentId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                showMessage('لم يتم العثور على بيانات الطالب', 'error');
                return;
            }
            
            let studentData = null;
            snapshot.forEach(child => {
                studentData = {
                    id: child.key,
                    ...child.val()
                };
            });
            
            if (!studentData) return;
            
            // Update dashboard welcome
            const welcomeName = document.getElementById('studentWelcomeName');
            if (welcomeName) {
                welcomeName.textContent = studentData.fullName || 'الطالب';
            }
            
            // Load profile section if active
            const profileContent = document.getElementById('studentProfileContent');
            if (profileContent && document.getElementById('profile-section').classList.contains('active')) {
                displayStudentProfile(studentData);
            }
        })
        .catch(error => {
            showMessage('خطأ في تحميل بيانات الطالب: ' + error.message, 'error');
        });
}

// Display student profile
function displayStudentProfile(student) {
    const profileContent = document.getElementById('studentProfileContent');
    if (!profileContent) return;
    
    const age = calculateAge(student.birthDate);
    const disabilityText = getDisabilityTypeText(student.disabilityType);
    
    profileContent.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <div class="avatar large student">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <div class="profile-header-info">
                    <h3>${student.fullName || 'غير محدد'}</h3>
                    <p>طالب في مدرسة الأمل للتربية الخاصة</p>
                    <div class="profile-tags">
                        <span class="tag disability">${disabilityText}</span>
                        <span class="tag grade">الصف: ${student.grade || 'غير محدد'}</span>
                        <span class="tag status active">نشط</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-details">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> المعلومات الشخصية</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>الاسم الكامل:</label>
                            <span>${student.fullName || 'غير محدد'}</span>
                        </div>
                        <div class="detail-item">
                            <label>رقم الهوية:</label>
                            <span>${student.nationalId || 'غير محدد'}</span>
                        </div>
                        <div class="detail-item">
                            <label>تاريخ الميلاد:</label>
                            <span>${formatDate(student.birthDate)}</span>
                        </div>
                        <div class="detail-item">
                            <label>العمر:</label>
                            <span>${age} سنوات</span>
                        </div>
                        <div class="detail-item">
                            <label>الجنس:</label>
                            <span>${student.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-hearing-impaired"></i> معلومات الإعاقة</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>نوع الإعاقة:</label>
                            <span>${disabilityText}</span>
                        </div>
                        <div class="detail-item">
                            <label>تاريخ الإصابة:</label>
                            <span>${student.disabilityDate ? formatDate(student.disabilityDate) : 'غير محدد'}</span>
                        </div>
                        ${student.hearingLevel ? `
                        <div class="detail-item">
                            <label>درجة السمع:</label>
                            <span>${student.hearingLevel}</span>
                        </div>
                        ` : ''}
                        ${student.hearingAid !== undefined ? `
                        <div class="detail-item">
                            <label>السماعة الطبية:</label>
                            <span>${student.hearingAid ? 'نعم' : 'لا'}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-home"></i> معلومات التواصل</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>العنوان:</label>
                            <span>${student.address || 'غير محدد'}</span>
                        </div>
                        <div class="detail-item">
                            <label>الهاتف:</label>
                            <span>${student.phone || 'غير محدد'}</span>
                        </div>
                        <div class="detail-item">
                            <label>البريد الإلكتروني:</label>
                            <span>${student.email || 'غير محدد'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-user-friends"></i> ولي الأمر</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>اسم ولي الأمر:</label>
                            <span>${student.guardianName || 'غير محدد'}</span>
                        </div>
                        <div class="detail-item">
                            <label>صلة القرابة:</label>
                            <span>${student.guardianRelation || 'غير محدد'}</span>
                        </div>
                        <div class="detail-item">
                            <label>هاتف ولي الأمر:</label>
                            <span>${student.guardianPhone || 'غير محدد'}</span>
                        </div>
                    </div>
                </div>
                
                ${student.notes ? `
                <div class="detail-section">
                    <h4><i class="fas fa-sticky-note"></i> ملاحظات</h4>
                    <div class="notes-content">
                        ${student.notes}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="profile-actions">
                <button class="btn btn-secondary" onclick="printProfile()">
                    <i class="fas fa-print"></i> طباعة الملف الشخصي
                </button>
            </div>
        </div>
    `;
}

// Load student stats
function loadStudentStats() {
    const studentId = localStorage.getItem('userId');
    
    // Find student in students collection
    database.ref('students').orderByChild('userId').equalTo(studentId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) return;
            
            let studentData = null;
            snapshot.forEach(child => {
                studentData = child.val();
            });
            
            if (!studentData || !studentData.id) return;
            
            // Load evaluations for this student
            database.ref('evaluations').orderByChild('studentId').equalTo(studentData.id).once('value')
                .then(evalSnapshot => {
                    let totalScore = 0;
                    let evalCount = 0;
                    let recentEvalCount = 0;
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    
                    evalSnapshot.forEach(child => {
                        const evaluation = child.val();
                        if (evaluation.score) {
                            totalScore += parseInt(evaluation.score);
                            evalCount++;
                        }
                        
                        // Count recent evaluations (last month)
                        const evalDate = new Date(evaluation.date);
                        if (evalDate >= oneMonthAgo) {
                            recentEvalCount++;
                        }
                    });
                    
                    // Update stats
                    const averageGrade = document.getElementById('averageGrade');
                    const recentEvaluationsCount = document.getElementById('recentEvaluationsCount');
                    
                    if (averageGrade) {
                        averageGrade.textContent = evalCount > 0 ? 
                            Math.round(totalScore / evalCount) + '%' : '0%';
                    }
                    
                    if (recentEvaluationsCount) {
                        recentEvaluationsCount.textContent = recentEvalCount;
                    }
                });
        })
        .catch(error => {
            console.error('Error loading student stats:', error);
        });
}

// Load today's schedule
function loadTodaySchedule() {
    const todaySchedule = document.getElementById('todaySchedule');
    if (!todaySchedule) return;
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Map day number to Arabic day name
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const todayName = days[dayOfWeek];
    
    // Sample schedule data - in production, this would come from database
    const scheduleData = [
        { time: '08:00 - 09:00', subject: 'اللغة العربية', teacher: 'أ. محمد', room: 'قاعة 101' },
        { time: '09:00 - 10:00', subject: 'تدريب السمع', teacher: 'أ. فاطمة', room: 'معمل السمع' },
        { time: '10:30 - 11:30', subject: 'الرياضيات', teacher: 'أ. خالد', room: 'قاعة 102' },
        { time: '11:30 - 12:30', subject: 'تدريب النطق', teacher: 'أ. سارة', room: 'معمل النطق' }
    ];
    
    const todayClasses = document.getElementById('todayClasses');
    if (todayClasses) {
        todayClasses.textContent = scheduleData.length;
    }
    
    let scheduleHTML = `
        <div class="schedule-header">
            <h4>${todayName} ${formatDate(today.toISOString())}</h4>
        </div>
    `;
    
    if (scheduleData.length === 0) {
        scheduleHTML += '<div class="empty-schedule">لا توجد حصص لهذا اليوم</div>';
    } else {
        scheduleData.forEach((item, index) => {
            scheduleHTML += `
                <div class="schedule-item ${index === 0 ? 'current' : ''}">
                    <div class="schedule-time">${item.time}</div>
                    <div class="schedule-details">
                        <div class="schedule-subject">${item.subject}</div>
                        <div class="schedule-info">
                            <span><i class="fas fa-user"></i> ${item.teacher}</span>
                            <span><i class="fas fa-door-closed"></i> ${item.room}</span>
                        </div>
                    </div>
                    ${index === 0 ? '<div class="schedule-badge">الآن</div>' : ''}
                </div>
            `;
        });
    }
    
    todaySchedule.innerHTML = scheduleHTML;
}

// Load recent grades
function loadRecentGrades() {
    const recentGrades = document.getElementById('recentGrades');
    if (!recentGrades) return;
    
    const studentId = localStorage.getItem('userId');
    
    // Find student in students collection
    database.ref('students').orderByChild('userId').equalTo(studentId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                recentGrades.innerHTML = '<div class="empty-state">لا توجد درجات متاحة</div>';
                return;
            }
            
            let studentData = null;
            snapshot.forEach(child => {
                studentData = {
                    id: child.key,
                    ...child.val()
                };
            });
            
            if (!studentData || !studentData.id) {
                recentGrades.innerHTML = '<div class="empty-state">لا توجد درجات متاحة</div>';
                return;
            }
            
            // Load evaluations for this student
            database.ref('evaluations').orderByChild('studentId').equalTo(studentData.id).limitToLast(5).once('value')
                .then(evalSnapshot => {
                    if (!evalSnapshot.exists()) {
                        recentGrades.innerHTML = '<div class="empty-state">لا توجد درجات متاحة</div>';
                        return;
                    }
                    
                    let gradesHTML = '';
                    const evaluations = [];
                    
                    evalSnapshot.forEach(child => {
                        evaluations.push({
                            id: child.key,
                            ...child.val()
                        });
                    });
                    
                    // Sort by date (newest first)
                    evaluations.sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                    evaluations.forEach(eval => {
                        const subjectText = getSubjectText(eval.subject);
                        const levelText = getEvaluationText(eval.level);
                        const levelColor = getEvaluationColor(eval.level);
                        
                        gradesHTML += `
                            <div class="grade-item">
                                <div class="grade-header">
                                    <div class="grade-subject">${subjectText}</div>
                                    <div class="grade-score" style="color: ${levelColor}">${eval.score || 0}/100</div>
                                </div>
                                <div class="grade-details">
                                    <span><i class="far fa-calendar"></i> ${formatDate(eval.date)}</span>
                                    <span><i class="fas fa-user-md"></i> ${eval.specialistName || 'أخصائي'}</span>
                                    <span class="grade-level" style="background: ${levelColor}">${levelText}</span>
                                </div>
                                ${eval.notes ? `
                                <div class="grade-notes">
                                    ${eval.notes}
                                </div>
                                ` : ''}
                            </div>
                        `;
                    });
                    
                    recentGrades.innerHTML = gradesHTML;
                })
                .catch(error => {
                    recentGrades.innerHTML = '<div class="error">حدث خطأ في تحميل الدرجات</div>';
                });
        })
        .catch(error => {
            recentGrades.innerHTML = '<div class="error">حدث خطأ في تحميل البيانات</div>';
        });
}

// Load student grades
function loadStudentGrades() {
    const gradesContainer = document.getElementById('gradesContainer');
    if (!gradesContainer) return;
    
    gradesContainer.innerHTML = '<div class="loading">جاري تحميل النتائج...</div>';
    
    const studentId = localStorage.getItem('userId');
    
    // Find student in students collection
    database.ref('students').orderByChild('userId').equalTo(studentId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                gradesContainer.innerHTML = '<div class="empty-state">لا توجد نتائج متاحة</div>';
                return;
            }
            
            let studentData = null;
            snapshot.forEach(child => {
                studentData = {
                    id: child.key,
                    ...child.val()
                };
            });
            
            if (!studentData || !studentData.id) {
                gradesContainer.innerHTML = '<div class="empty-state">لا توجد نتائج متاحة</div>';
                return;
            }
            
            // Load all evaluations for this student
            database.ref('evaluations').orderByChild('studentId').equalTo(studentData.id).once('value')
                .then(evalSnapshot => {
                    if (!evalSnapshot.exists()) {
                        gradesContainer.innerHTML = '<div class="empty-state">لا توجد نتائج متاحة</div>';
                        return;
                    }
                    
                    let evaluationsHTML = '';
                    const evaluations = [];
                    
                    evalSnapshot.forEach(child => {
                        evaluations.push({
                            id: child.key,
                            ...child.val()
                        });
                    });
                    
                    // Sort by date (newest first)
                    evaluations.sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                    // Group by semester
                    const evaluationsBySemester = {};
                    
                    evaluations.forEach(eval => {
                        const semester = eval.semester || 'غير محدد';
                        if (!evaluationsBySemester[semester]) {
                            evaluationsBySemester[semester] = [];
                        }
                        evaluationsBySemester[semester].push(eval);
                    });
                    
                    // Display by semester
                    for (const [semester, semesterEvals] of Object.entries(evaluationsBySemester)) {
                        evaluationsHTML += `
                            <div class="semester-section">
                                <h3>${semester}</h3>
                                <div class="grades-table-container">
                                    <table class="grades-table">
                                        <thead>
                                            <tr>
                                                <th>المادة</th>
                                                <th>التاريخ</th>
                                                <th>نوع التقييم</th>
                                                <th>الدرجة</th>
                                                <th>المستوى</th>
                                                <th>الأخصائي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                        `;
                        
                        semesterEvals.forEach(eval => {
                            const subjectText = getSubjectText(eval.subject);
                            const levelText = getEvaluationText(eval.level);
                            const levelColor = getEvaluationColor(eval.level);
                            const typeText = getEvaluationTypeText(eval.type);
                            
                            evaluationsHTML += `
                                <tr>
                                    <td>${subjectText}</td>
                                    <td>${formatDate(eval.date)}</td>
                                    <td>${typeText}</td>
                                    <td>
                                        <div class="score-display">
                                            <div class="score-bar">
                                                <div class="score-fill" style="width: ${eval.score || 0}%"></div>
                                            </div>
                                            <span>${eval.score || 0}/100</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="level-badge" style="background: ${levelColor}">
                                            ${levelText}
                                        </span>
                                    </td>
                                    <td>${eval.specialistName || 'أخصائي'}</td>
                                </tr>
                            `;
                        });
                        
                        evaluationsHTML += `
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Add summary statistics
                    const totalEvals = evaluations.length;
                    const avgScore = evaluations.reduce((sum, eval) => sum + (parseInt(eval.score) || 0), 0) / totalEvals;
                    const bestSubject = findBestSubject(evaluations);
                    const improvement = calculateImprovement(evaluations);
                    
                    evaluationsHTML = `
                        <div class="grades-summary">
                            <div class="summary-card">
                                <div class="summary-icon">
                                    <i class="fas fa-chart-line"></i>
                                </div>
                                <div class="summary-info">
                                    <h4>متوسط الدرجات</h4>
                                    <div class="summary-number">${Math.round(avgScore)}%</div>
                                </div>
                            </div>
                            
                            <div class="summary-card">
                                <div class="summary-icon">
                                    <i class="fas fa-clipboard-check"></i>
                                </div>
                                <div class="summary-info">
                                    <h4>عدد التقييمات</h4>
                                    <div class="summary-number">${totalEvals}</div>
                                </div>
                            </div>
                            
                            ${bestSubject ? `
                            <div class="summary-card">
                                <div class="summary-icon">
                                    <i class="fas fa-trophy"></i>
                                </div>
                                <div class="summary-info">
                                    <h4>أفضل مادة</h4>
                                    <div class="summary-text">${bestSubject}</div>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${improvement !== null ? `
                            <div class="summary-card">
                                <div class="summary-icon">
                                    <i class="fas fa-arrow-up"></i>
                                </div>
                                <div class="summary-info">
                                    <h4>معدل التحسن</h4>
                                    <div class="summary-number ${improvement > 0 ? 'positive' : 'negative'}">
                                        ${improvement > 0 ? '+' : ''}${improvement}%
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div class="grades-details">
                            ${evaluationsHTML}
                        </div>
                        
                        <div class="grades-actions">
                            <button class="btn btn-primary" onclick="printGradesReport()">
                                <i class="fas fa-print"></i> طباعة التقرير الدراسي
                            </button>
                        </div>
                    `;
                    
                    gradesContainer.innerHTML = evaluationsHTML;
                })
                .catch(error => {
                    gradesContainer.innerHTML = '<div class="error">حدث خطأ في تحميل النتائج</div>';
                });
        })
        .catch(error => {
            gradesContainer.innerHTML = '<div class="error">حدث خطأ في تحميل البيانات</div>';
        });
}

// Load student schedule
function loadStudentSchedule() {
    // Implementation for loading full schedule
    showMessage('جاري تحميل الجدول الدراسي...', 'info');
}

// Load student messages
function loadStudentMessages() {
    // Implementation for loading messages
    showMessage('جاري تحميل الرسائل...', 'info');
}

// Print profile
function printProfile() {
    showMessage('جاري إعداد الملف الشخصي للطباعة...', 'info');
    // Implementation would generate a printable profile
}

// Print grades report
function printGradesReport() {
    showMessage('جاري إعداد التقرير الدراسي للطباعة...', 'info');
    // Implementation would generate a printable grades report
}

// Setup event listeners for student
function setupStudentEventListeners() {
    // Prevent form submission on Enter key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
}

// ============================================
// الجزء الثامن: وظائف إدارة الصفحات المشتركة
// ============================================

// Update current date
function updateCurrentDate() {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const today = new Date().toLocaleDateString('ar-SA', options);
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.textContent = today;
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
}

// Toggle user menu
function toggleUserMenu() {
    const dropdown = document.getElementById('userMenuDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Toggle notifications
function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Show section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    const titles = {
        'dashboard': 'لوحة التحكم',
        'students': 'إدارة الطلاب',
        'add-student': 'إضافة طالب جديد',
        'add-user': 'إضافة مستخدم جديد',
        'users': 'إدارة المستخدمين',
        'settings': 'إعدادات النظام',
        'profile': 'الملف الشخصي',
        'child-profile': 'ملف ابني/ابنتي',
        'child-grades': 'نتائج وتقييمات ابني/ابنتي',
        'attendance': 'الحضور والغياب',
        'reports': 'التقارير الشهرية',
        'messages': 'الرسائل',
        'school-info': 'معلومات المدرسة',
        'my-students': 'طلابي',
        'all-students': 'جميع الطلاب',
        'student-search': 'بحث عن طالب',
        'add-evaluation': 'إضافة تقييم',
        'evaluations': 'التقييمات',
        'reports': 'تقارير التقدم',
        'medical-history': 'التاريخ المرضي',
        'add-medical': 'إضافة بيانات طبية',
        'grades': 'النتائج والتقييمات',
        'schedule': 'الجدول الدراسي',
        'resources': 'المصادر التعليمية'
    };
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[sectionId] || sectionId;
    }
    
    // Load section data
    switch(sectionId) {
        case 'child-profile':
            loadChildProfile();
            break;
        case 'child-grades':
            loadChildGrades();
            break;
        case 'attendance':
            loadChildAttendance();
            break;
        case 'messages':
            loadParentMessages();
            break;
        case 'my-students':
            loadMyStudents();
            break;
        case 'add-evaluation':
            loadEvaluationForm();
            break;
        case 'evaluations':
            loadAllEvaluations();
            break;
        case 'profile':
            if (localStorage.getItem('userRole') === 'student') {
                loadStudentProfile();
            }
            break;
        case 'grades':
            if (localStorage.getItem('userRole') === 'student') {
                loadStudentGrades();
            }
            break;
        case 'schedule':
            if (localStorage.getItem('userRole') === 'student') {
                loadStudentSchedule();
            }
            break;
    }
    
    // Close dropdowns
    closeAllDropdowns();
}

// Close all dropdowns
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.matches('.notification-btn')) {
        const dropdown = document.getElementById('notificationsDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
    
    if (!event.target.matches('.user-menu-btn')) {
        const dropdown = document.getElementById('userMenuDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
};

// Generate progress report
function generateProgressReport() {
    showMessage('جاري إنشاء تقرير التقدم...', 'info');
    // Implementation would generate a PDF report
}

//  هذه الدالة للتعامل مع فشل التحميل
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error);
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    showMessage('حدث خطأ في تحميل الصفحة. يرجى تحديث الصفحة.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    showMessage('حدث خطأ غير متوقع. يرجى تحديث الصفحة.', 'error');
});

// ============================================
// تصدير الوظائف للاستخدام في المتصفح
// ============================================

// Export functions to global scope for use in HTML onclick handlers
window.togglePassword = togglePassword;
window.showRoleInfo = showRoleInfo;
window.closeRoleInfo = closeRoleInfo;
window.logout = logout;
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.toggleUserMenu = toggleUserMenu;
window.toggleNotifications = toggleNotifications;
window.markAllAsRead = markAllAsRead;
window.closeModal = closeModal;
window.viewStudent = viewStudent;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.searchStudents = searchStudents;
window.exportStudents = exportStudents;
window.generateMonthlyReport = generateMonthlyReport;
window.resetUserPassword = resetUserPassword;
window.printStudentReport = printStudentReport;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitStudentForm = submitStudentForm;
window.generatePassword = generatePassword;
window.submitUserForm = submitUserForm;
window.toggleRoleFields = toggleRoleFields;
window.loadEvaluationForm = loadEvaluationForm;
window.updateEvaluationScore = updateEvaluationScore;
window.submitEvaluation = submitEvaluation;
window.addEvaluationForStudent = addEvaluationForStudent;
window.viewStudentDetails = viewStudentDetails;
window.showStudentTab = showStudentTab;
window.viewEvaluationDetails = viewEvaluationDetails;
window.addMedicalRecord = addMedicalRecord;
window.submitMedicalRecord = submitMedicalRecord;
window.updateProgressChart = updateProgressChart;
window.searchMyStudents = searchMyStudents;
window.printEvaluation = printEvaluation;
window.generateProgressReport = generateProgressReport;
window.loadChildProfile = loadChildProfile;
window.loadChildGrades = loadChildGrades;
window.showChildTab = showChildTab;
window.viewEvaluationNotes = viewEvaluationNotes;
window.contactSchool = contactSchool;
window.sendMessageToSpecialist = sendMessageToSpecialist;
window.requestMeeting = requestMeeting;
window.sendEmailToSchool = sendEmailToSchool;
window.printChildGradesReport = printChildGradesReport;
window.printProgressReport = printProgressReport;
window.requestDetailedReport = requestDetailedReport;
window.loadChildAttendance = loadChildAttendance;
window.loadParentMessages = loadParentMessages;
window.loadStudentProfile = loadStudentProfile;
window.loadStudentGrades = loadStudentGrades;
window.loadStudentSchedule = loadStudentSchedule;
window.loadStudentMessages = loadStudentMessages;
window.printProfile = printProfile;
window.printGradesReport = printGradesReport;