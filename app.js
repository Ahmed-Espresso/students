// app.js - نظام إدارة طلاب ذوي الإعاقة السمعية 

// ============================================
// 1. تهيئة Firebase والمتغيرات العامة
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCYKp5mi2gDJGg4l5sOURJXGiQQOPDWU3s",
    authDomain: "students-59f43.firebaseapp.com",
    databaseURL: "https://students-59f43-default-rtdb.firebaseio.com",
    projectId: "students-59f43",
    storageBucket: "students-59f43.firebasestorage.app",
    messagingSenderId: "248717629262",
    appId: "1:248717629262:web:a7ee2ad69da4bc6f38f01f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let currentUser = null;
let currentUserData = null;
let searchTimeout = null;

// ============================================
// 2. وظائف مساعدة عامة
// ============================================
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    // إزالة أي رسائل سابقة
    const existingToasts = document.querySelectorAll('.toast-message');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // إضافة الأنماط إذا لم تكن موجودة
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-message {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 9999;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .toast-success { border-right: 4px solid #2ecc71; }
            .toast-error { border-right: 4px solid #e74c3c; }
            .toast-info { border-right: 4px solid #3498db; }
            .toast-message i { font-size: 18px; }
            .toast-success i { color: #2ecc71; }
            .toast-error i { color: #e74c3c; }
            .toast-info i { color: #3498db; }
            .toast-close {
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                margin-right: auto;
            }
        `;
        document.head.appendChild(style);
    }
    
    // إزالة الرسالة بعد 5 ثواني
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function setCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('ar-EG', options);
    const dateElements = document.querySelectorAll('#currentDate');
    dateElements.forEach(element => {
        if (element) element.textContent = dateString;
    });
}

function formatDateDay(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { day: 'numeric' });
}

function formatDateMonth(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { month: 'short' });
}

// ============================================
// 3. نظام تسجيل الدخول (index.html)
// ============================================
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function(e) {
            togglePasswordVisibility(e);
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

function togglePasswordVisibility(e) {
    const toggleBtn = e.currentTarget;
    const passwordInput = document.getElementById('password');
    const eyeIcon = toggleBtn.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('يرجى ملء جميع الحقول');
        return;
    }
    
    showLoading();
    
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            return firebase.database().ref('users/' + user.uid).once('value');
        })
        .then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const role = userData.role;
                
                switch(role) {
                    case 'admin':
                        window.location.href = 'admin.html';
                        break;
                    case 'specialist':
                        window.location.href = 'specialist.html';
                        break;
                    case 'teacher':
                        window.location.href = 'teacher.html';
                        break;
                    case 'parent':
                        window.location.href = 'parent.html';
                        break;
                    case 'student':
                        window.location.href = 'student.html';
                        break;
                    default:
                        showError('دور المستخدم غير معروف');
                        hideLoading();
                }
            } else {
                showError('بيانات المستخدم غير موجودة في قاعدة البيانات');
                hideLoading();
            }
        })
        .catch((error) => {
            console.error('خطأ في تسجيل الدخول:', error);
            let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
            
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'المستخدم غير موجود';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'كلمة المرور غير صحيحة';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'هذا الحساب معطل';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'تم محاولة تسجيل الدخول مرات عديدة، حاول لاحقاً';
                    break;
            }
            
            showError(errorMessage);
            hideLoading();
        });
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('errorText');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'flex';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// ============================================
// 4. وظائف لوحة التحكم العامة
// ============================================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
    
    if (mainContent) {
        mainContent.classList.toggle('expanded');
    }
    
    const toggleBtn = document.querySelector('.sidebar-toggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            if (sidebar.classList.contains('collapsed')) {
                icon.className = 'fas fa-bars';
            } else {
                icon.className = 'fas fa-times';
            }
        }
    }
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    const activeSection = document.getElementById(sectionId + '-section');
    if (activeSection) {
        activeSection.classList.add('active');
        
        // تهيئة البحث عند فتح القسم
        if (sectionId === 'students' || sectionId === 'users' || sectionId === 'grades-list' || 
            sectionId === 'evaluations' || sectionId === 'medical-history' || sectionId === 'children') {
            setTimeout(() => {
                initSearch(sectionId);
                // إعادة ضبط حجم العناصر
                adjustContentHeight();
            }, 300);
        }
    }
    
    const activeNavLink = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
    
    updatePageTitle(sectionId);
}

function updatePageTitle(sectionId) {
    const pageTitle = document.getElementById('pageTitle');
    if (!pageTitle) return;
    
    const titles = {
        'home': 'الصفحة الرئيسية',
        'students': 'قائمة الطلاب',
        'add-student': 'إضافة طالب جديد',
        'users': 'جميع المستخدمين',
        'add-user': 'إضافة مستخدم جديد',
        'child-profile': 'ملف ابني/ابنتي',
        'child-grades': 'النتائج الدراسية',
        'follow-up': 'المتابعة الطبية',
        'profile': 'الملف الشخصي',
        'grades': 'النتائج الدراسية',
        'my-students': 'طلابي',
        'add-grade': 'إضافة درجات',
        'grades-list': 'قائمة الدرجات',
        'children': 'جميع الأطفال',
        'add-evaluation': 'إضافة تقييم',
        'evaluations': 'التقييمات السابقة',
        'medical-history': 'التاريخ المرضي',
        'sessions': 'جدول الجلسات'
    };
    
    pageTitle.textContent = titles[sectionId] || 'الصفحة الرئيسية';
}

// ============================================
// 5. نظام البحث في الجداول
// ============================================
function initSearch(sectionId) {
    const tableIdMap = {
        'students': 'adminStudentsTable',
        'users': 'adminUsersTable',
        'grades-list': 'gradesListTable',
        'evaluations': 'evaluationsTable',
        'medical-history': 'medicalHistoryTable',
        'children': 'specialistChildrenTable',
        'my-students': 'teacherStudentsTable'
    };
    
    const tableId = tableIdMap[sectionId];
    if (!tableId) return;
    
    const table = document.getElementById(tableId);
    if (!table) return;
    
    // التحقق من وجود شريط البحث مسبقاً
    const existingSearch = table.parentElement.querySelector('.table-search-container');
    if (existingSearch) return;
    
    // إنشاء شريط البحث
    const searchContainer = document.createElement('div');
    searchContainer.className = 'table-search-container';
    searchContainer.innerHTML = `
        <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" class="table-search-input" 
                   placeholder="ابحث في القائمة..." 
                   onkeyup="handleSearch('${sectionId}', this.value)">
            <button class="clear-search" onclick="clearSearch('${sectionId}', this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="search-info">
            <span class="results-count">0 نتيجة</span>
        </div>
    `;
    
    // إضافة الأنماط إذا لم تكن موجودة
    if (!document.querySelector('#search-styles')) {
        const style = document.createElement('style');
        style.id = 'search-styles';
        style.textContent = `
            .table-search-container {
                background: white;
                padding: 15px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px 8px 0 0;
            }
            .search-box {
                position: relative;
                width: 300px;
            }
            .search-box i {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: #999;
            }
            .table-search-input {
                width: 100%;
                padding: 10px 40px 10px 15px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                transition: all 0.3s;
            }
            .table-search-input:focus {
                outline: none;
                border-color: #3498db;
                box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
            }
            .clear-search {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                display: none;
            }
            .search-info {
                font-size: 14px;
                color: #666;
            }
            @media (max-width: 768px) {
                .table-search-container {
                    flex-direction: column;
                    gap: 10px;
                    align-items: stretch;
                }
                .search-box {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // إضافة شريط البحث قبل الجدول
    table.parentElement.insertBefore(searchContainer, table);
}

function handleSearch(sectionId, searchTerm) {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        const tableIdMap = {
            'students': 'adminStudentsTable',
            'users': 'adminUsersTable',
            'grades-list': 'gradesListTable',
            'evaluations': 'evaluationsTable',
            'medical-history': 'medicalHistoryTable',
            'children': 'specialistChildrenTable',
            'my-students': 'teacherStudentsTable'
        };
        
        const tableId = tableIdMap[sectionId];
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
        let visibleCount = 0;
        
        // إظهار زر مسح البحث إذا كان هناك نص
        const clearBtn = table.parentElement.querySelector('.clear-search');
        if (clearBtn) {
            clearBtn.style.display = searchTerm ? 'block' : 'none';
        }
        
        rows.forEach(row => {
            if (row.classList.contains('no-data')) {
                row.style.display = 'none';
                return;
            }
            
            const text = row.textContent.toLowerCase();
            const searchLower = searchTerm.toLowerCase().trim();
            
            if (!searchLower || text.includes(searchLower)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // تحديث عدد النتائج
        const resultsCount = table.parentElement.querySelector('.results-count');
        if (resultsCount) {
            resultsCount.textContent = `${visibleCount} نتيجة`;
        }
        
        // إظهار رسالة إذا لم توجد نتائج
        if (visibleCount === 0 && rows.length > 0) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.className = 'no-results';
            noResultsRow.innerHTML = `
                <td colspan="${rows[0].cells.length}">
                    <div class="no-results-message">
                        <i class="fas fa-search"></i>
                        <p>لا توجد نتائج تطابق "${searchTerm}"</p>
                    </div>
                </td>
            `;
            tbody.appendChild(noResultsRow);
        } else {
            // إزالة رسالة عدم وجود نتائج إذا كانت موجودة
            const noResults = tbody.querySelector('.no-results');
            if (noResults) {
                noResults.remove();
            }
        }
    }, 300); // تأخير 300 مللي ثانية لتحسين الأداء
}

function clearSearch(sectionId, button) {
    const tableIdMap = {
        'students': 'adminStudentsTable',
        'users': 'adminUsersTable',
        'grades-list': 'gradesListTable',
        'evaluations': 'evaluationsTable',
        'medical-history': 'medicalHistoryTable',
        'children': 'specialistChildrenTable',
        'my-students': 'teacherStudentsTable'
    };
    
    const tableId = tableIdMap[sectionId];
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const searchInput = table.parentElement.querySelector('.table-search-input');
    if (searchInput) {
        searchInput.value = '';
        handleSearch(sectionId, '');
    }
    
    if (button) {
        button.style.display = 'none';
    }
}

// ============================================
// 6. نظام إدارة المشرف (admin.html)
// ============================================
function initAdminDashboard() {
    checkAuth('admin').then(() => {
        loadAdminData();
        loadStatistics();
        loadStudentsList();
        loadUsersList();
        setupAdminForms();
        setCurrentDate();
        loadParentsForSelect();
        hideLoading();
        
        // تهيئة البحث عند تحميل الصفحة
        setTimeout(() => {
            initSearch('students');
            initSearch('users');
            adjustContentHeight();
        }, 800);
    }).catch(error => {
        console.error('خطأ في المصادقة:', error);
        window.location.href = 'index.html';
    });
}

function loadAdminData() {
    if (currentUser && currentUserData) {
        const adminNameElements = document.querySelectorAll('#adminName, #adminWelcomeName');
        adminNameElements.forEach(element => {
            if (element) {
                element.textContent = currentUserData.fullName || 'المشرف الرئيسي';
            }
        });
        
        const userEmailElement = document.getElementById('currentUserEmail');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email;
        }
    }
}

function loadStatistics() {
    firebase.database().ref('students').once('value')
        .then((snapshot) => {
            const totalStudents = snapshot.numChildren();
            document.getElementById('totalStudents').textContent = totalStudents;
        })
        .catch((error) => {
            console.error('خطأ في تحميل إحصائية الطلاب:', error);
        });
    
    firebase.database().ref('users').once('value')
        .then((snapshot) => {
            let specialists = 0;
            let teachers = 0;
            let parents = 0;
            
            snapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                switch(user.role) {
                    case 'specialist':
                        specialists++;
                        break;
                    case 'teacher':
                        teachers++;
                        break;
                    case 'parent':
                        parents++;
                        break;
                }
            });
            
            document.getElementById('totalSpecialists').textContent = specialists;
            document.getElementById('totalTeachers').textContent = teachers;
            document.getElementById('totalParents').textContent = parents;
        })
        .catch((error) => {
            console.error('خطأ في تحميل إحصائية المستخدمين:', error);
        });
}

function loadParentsForSelect() {
    database.ref('users').orderByChild('role').equalTo('parent').once('value')
        .then((snapshot) => {
            const parentSelect = document.getElementById('parentId');
            const parentIdInput = document.getElementById('parentIdInput'); 
            
            if (!parentSelect) return;
            
            parentSelect.innerHTML = '<option value="">اختر ولي الأمر</option>';
            
            if (!snapshot.exists()) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'لا توجد أولياء أمور مسجلين';
                parentSelect.appendChild(option);
                return;
            }
            
            snapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                const userId = childSnapshot.key;
                
                const option = document.createElement('option');
                option.value = userId;
               
                const phoneText = user.phone ? ` - ${user.phone}` : '';
                option.textContent = `${user.fullName}${phoneText}`;
                option.dataset.phone = user.phone || ''; 
                parentSelect.appendChild(option);
            });
        })
        .catch((error) => {
            console.error('خطأ في تحميل أولياء الأمور:', error);
            showToast('حدث خطأ في تحميل قائمة أولياء الأمور', 'error');
        });
}

function updateParentInfo() {
    const parentSelect = document.getElementById('parentId');
    const parentNameInput = document.getElementById('parentName');
    const parentPhoneInput = document.getElementById('parentPhone');
    const parentIdInput = document.getElementById('parentIdInput');
    
    if (parentSelect && parentNameInput && parentPhoneInput && parentIdInput) {
        const selectedOption = parentSelect.options[parentSelect.selectedIndex];
        
        if (parentSelect.value) {
            // جلب الاسم الكامل من النص المعروض
            const fullText = selectedOption.textContent;
            const nameMatch = fullText.split(' - ')[0];
            parentNameInput.value = nameMatch;
            parentIdInput.value = parentSelect.value;
            
            // جلب رقم الهاتف من data attribute
            if (selectedOption.dataset.phone) {
                parentPhoneInput.value = selectedOption.dataset.phone;
            }
        } else {
            parentNameInput.value = '';
            parentPhoneInput.value = '';
            parentIdInput.value = '';
        }
    }
}

function loadStudentsList() {
    Promise.all([
        database.ref('students').once('value'),
        database.ref('users').once('value')
    ])
    .then(([studentsSnapshot, usersSnapshot]) => {
        const tbody = document.getElementById('adminStudentsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!studentsSnapshot.exists()) {
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="9">
                        <i class="fas fa-info-circle"></i>
                        <span>لا توجد طلاب مسجلين حتى الآن</span>
                    </td>
                </tr>
            `;
            return;
        }
        
        // إنشاء خريطة لأسماء وأرقام هواتف أولياء الأمور
        const parentsMap = {};
        usersSnapshot.forEach((userSnapshot) => {
            const user = userSnapshot.val();
            if (user.role === 'parent') {
                parentsMap[userSnapshot.key] = {
                    name: user.fullName || 'غير محدد',
                    phone: user.phone || 'غير محدد'
                };
            }
        });
        
        let index = 1;
        studentsSnapshot.forEach((childSnapshot) => {
            const student = childSnapshot.val();
            const studentId = childSnapshot.key;
            
            // الحصول على اسم ولي الأمر
            let parentName = 'غير محدد';
            let parentPhone = student.parentPhone || 'غير محدد'; 
            let parentId = student.parentId || '';
            
            if (parentId && parentsMap[parentId]) {
                parentName = parentsMap[parentId].name;
                // إذا لم يكن هناك رقم هاتف مخزن في بيانات الطالب، نستخدم الرقم من بيانات ولي الأمر
                if (!parentPhone || parentPhone === 'غير محدد') {
                    parentPhone = parentsMap[parentId].phone;
                }
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index}</td>
                <td>${student.fullName || 'غير محدد'}</td>
                <td>${student.studentId || 'غير محدد'}</td>
                <td>${student.birthDate || 'غير محدد'}</td>
                <td>${student.disabilityType || 'غير محدد'}</td>
                <td>${parentPhone}</td> 
                <td>${parentName}</td>
                <td><span class="status-badge active">نشط</span></td>
                <td>
                    <button type="button" class="btn-icon edit" onclick="editStudent('${studentId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-icon delete" onclick="confirmDeleteStudent('${studentId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
            index++;
        });
    })
    .catch((error) => {
        console.error('خطأ في تحميل قائمة الطلاب:', error);
        showToast('حدث خطأ في تحميل قائمة الطلاب', 'error');
    });
}

function loadUsersList() {
    firebase.database().ref('users').once('value')
        .then((snapshot) => {
            const tbody = document.getElementById('adminUsersTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!snapshot.exists()) {
                tbody.innerHTML = `
                    <tr class="no-data">
                        <td colspan="7">
                            <i class="fas fa-info-circle"></i>
                            <span>لا توجد مستخدمين مسجلين حتى الآن</span>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let index = 1;
            snapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                const userId = childSnapshot.key;
                
                if (userId === currentUser.uid) return;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index}</td>
                    <td>${user.fullName || 'غير محدد'}</td>
                    <td>${user.email || 'غير محدد'}</td>
                    <td><span class="role-badge ${user.role}">${getRoleName(user.role)}</span></td>
                    <td>${user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('ar-EG') : 'غير محدد'}</td>
                    <td><span class="status-badge active">نشط</span></td>
                    <td>
                        <button type="button" class="btn-icon edit" onclick="editUser('${userId}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-icon delete" onclick="confirmDeleteUser('${userId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
                index++;
            });
            
            if (tbody.children.length === 0) {
                tbody.innerHTML = `
                    <tr class="no-data">
                        <td colspan="7">
                            <i class="fas fa-info-circle"></i>
                            <span>لا توجد مستخدمين مسجلين حتى الآن</span>
                        </td>
                    </tr>
                `;
            }
        })
        .catch((error) => {
            console.error('خطأ في تحميل قائمة المستخدمين:', error);
            showToast('حدث خطأ في تحميل قائمة المستخدمين', 'error');
        });
}

function getRoleName(role) {
    const roles = {
        'admin': 'مشرف',
        'specialist': 'أخصائي',
        'teacher': 'معلم',
        'parent': 'ولي أمر',
        'student': 'طالب'
    };
    return roles[role] || role;
}

function setupAdminForms() {
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleAddStudent);
    }
    
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }
}

function handleAddStudent(e) {
    e.preventDefault();
    
    const studentData = {
        fullName: document.getElementById('studentName').value.trim(),
        studentId: document.getElementById('studentId').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        disabilityType: document.getElementById('disabilityType').value,
        email: document.getElementById('studentEmail').value.trim() || '',
        parentId: document.getElementById('parentId').value.trim() || '',
        parentPhone: document.getElementById('parentPhone').value.trim() || '',
        notes: document.getElementById('notes').value.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (!studentData.fullName || !studentData.studentId || !studentData.birthDate || !studentData.disabilityType) {
        showToast('يرجى ملء جميع الحقول المطلوبة (*)', 'error');
        return;
    }
    
    showLoading();
    
    // التحقق من عدم وجود طالب بنفس رقم الهوية
    database.ref('students').orderByChild('studentId').equalTo(studentData.studentId).once('value')
        .then(existingSnapshot => {
            if (existingSnapshot.exists()) {
                throw new Error('يوجد طالب مسجل بنفس رقم الهوية');
            }
            
            const newStudentRef = database.ref('students').push();
            return newStudentRef.set(studentData);
        })
        .then(() => {
            showToast('تم إضافة الطالب بنجاح!', 'success');
            document.getElementById('addStudentForm').reset();
            
            loadStatistics();
            loadStudentsList();
            
            showSection('students');
            hideLoading();
        })
        .catch((error) => {
            console.error('خطأ في إضافة الطالب:', error);
            showToast(error.message || 'حدث خطأ أثناء إضافة الطالب', 'error');
            hideLoading();
        });
}

function handleAddUser(e) {
    e.preventDefault();
    
    const userData = {
        fullName: document.getElementById('userFullName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        password: document.getElementById('userPassword').value,
        role: document.getElementById('userRole').value,
        phone: document.getElementById('userPhone').value.trim() || '',
        registeredAt: new Date().toISOString()
    };
    
    if (!userData.fullName || !userData.email || !userData.password || !userData.role) {
        showToast('يرجى ملء جميع الحقول المطلوبة (*)', 'error');
        return;
    }
    
    if (userData.password.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    showLoading();
    
    firebase.auth().createUserWithEmailAndPassword(userData.email, userData.password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            const userToSave = {
                fullName: userData.fullName,
                email: userData.email,
                role: userData.role,
                phone: userData.phone,
                registeredAt: userData.registeredAt,
                uid: user.uid
            };
            
            return database.ref('users/' + user.uid).set(userToSave);
        })
        .then(() => {
            showToast('تم إضافة المستخدم بنجاح!', 'success');
            document.getElementById('addUserForm').reset();
            
            loadStatistics();
            loadUsersList();
            
            showSection('users');
            hideLoading();
        })
        .catch((error) => {
            console.error('خطأ في إضافة المستخدم:', error);
            
            let errorMessage = 'حدث خطأ أثناء إضافة المستخدم';
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'كلمة المرور ضعيفة، يجب أن تكون 6 أحرف على الأقل';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'عملية إنشاء الحساب غير مسموح بها حالياً';
                    break;
            }
            
            showToast(errorMessage, 'error');
            hideLoading();
        });
}

function confirmDeleteStudent(studentId) {
    if (confirm('⚠️ هل أنت متأكد من حذف هذا الطالب؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) {
        showLoading();
        
        database.ref('students/' + studentId).remove()
            .then(() => {
                showToast('تم حذف الطالب بنجاح', 'success');
                loadStatistics();
                loadStudentsList();
                hideLoading();
            })
            .catch((error) => {
                console.error('خطأ في حذف الطالب:', error);
                showToast('حدث خطأ أثناء حذف الطالب', 'error');
                hideLoading();
            });
    }
}

function confirmDeleteUser(userId) {
    if (confirm('⚠️ هل أنت متأكد من حذف هذا المستخدم؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) {
        showLoading();
        
        database.ref('users/' + userId).remove()
            .then(() => {
                showToast('تم حذف المستخدم بنجاح', 'success');
                loadStatistics();
                loadUsersList();
                hideLoading();
            })
            .catch((error) => {
                console.error('خطأ في حذف المستخدم:', error);
                showToast('حدث خطأ أثناء حذف المستخدم', 'error');
                hideLoading();
            });
    }
}

function editStudent(studentId) {
    showLoading();
    
    database.ref('students/' + studentId).once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                showToast('الطالب غير موجود', 'error');
                hideLoading();
                return;
            }
            
            const student = snapshot.val();
            
            // تعبئة النموذج
            document.getElementById('studentName').value = student.fullName || '';
            document.getElementById('studentId').value = student.studentId || '';
            document.getElementById('birthDate').value = student.birthDate || '';
            document.getElementById('disabilityType').value = student.disabilityType || '';
            document.getElementById('studentEmail').value = student.email || '';
            document.getElementById('notes').value = student.notes || '';
            document.getElementById('parentPhone').value = student.parentPhone || ''; 
            
            // تعيين ولي الأمر
            if (student.parentId) {
                document.getElementById('parentId').value = student.parentId;
                updateParentInfo();
            }
            
            // تغيير النموذج لوضع التعديل
            const form = document.getElementById('addStudentForm');
            form.dataset.editMode = 'true';
            form.dataset.studentId = studentId;
            
            // تغيير النص والعمل
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'تحديث الطالب';
            submitBtn.onclick = function(e) { 
                e.preventDefault(); 
                updateStudent(studentId); 
            };
            
            // إضافة زر إلغاء التعديل
            const cancelEditBtn = document.createElement('button');
            cancelEditBtn.type = 'button';
            cancelEditBtn.className = 'btn btn-warning';
            cancelEditBtn.innerHTML = '<i class="fas fa-times"></i> إلغاء التعديل';
            cancelEditBtn.onclick = function() {
                cancelEditStudent();
            };
            
            const formActions = form.querySelector('.form-actions');
            formActions.insertBefore(cancelEditBtn, formActions.firstChild);
            
            // الانتقال إلى قسم إضافة/تعديل الطالب
            showSection('add-student');
            hideLoading();
        })
        .catch((error) => {
            console.error('خطأ في تحميل بيانات الطالب:', error);
            showToast('حدث خطأ في تحميل بيانات الطالب', 'error');
            hideLoading();
        });
}

function updateStudent(studentId) {
    const studentData = {
        fullName: document.getElementById('studentName').value.trim(),
        studentId: document.getElementById('studentId').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        disabilityType: document.getElementById('disabilityType').value,
        email: document.getElementById('studentEmail').value.trim() || '',
        parentId: document.getElementById('parentIdInput').value.trim() || '',
        parentPhone: document.getElementById('parentPhone').value.trim() || '', 
        notes: document.getElementById('notes').value.trim() || '',
        updatedAt: new Date().toISOString()
    };
    
    if (!studentData.fullName || !studentData.studentId || !studentData.birthDate || !studentData.disabilityType) {
        showToast('يرجى ملء جميع الحقول المطلوبة (*)', 'error');
        return;
    }
    
    showLoading();
    
    database.ref('students/' + studentId).update(studentData)
        .then(() => {
            showToast('تم تحديث الطالب بنجاح!', 'success');
            
            // إعادة تعيين النموذج
            cancelEditStudent();
            
            // تحديث القوائم
            loadStatistics();
            loadStudentsList();
            
            // العودة إلى قائمة الطلاب
            showSection('students');
            hideLoading();
        })
        .catch((error) => {
            console.error('خطأ في تحديث الطالب:', error);
            showToast(error.message || 'حدث خطأ أثناء تحديث الطالب', 'error');
            hideLoading();
        });
}

function cancelEditStudent() {
    const form = document.getElementById('addStudentForm');
    
    // إعادة تعيين النموذج
    form.reset();
    delete form.dataset.editMode;
    delete form.dataset.studentId;
    
    // إعادة تعيين زر الحفظ
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'حفظ الطالب';
    submitBtn.onclick = function(e) { 
        e.preventDefault(); 
        handleAddStudent(e); 
    };
    
    // إزالة زر إلغاء التعديل إذا كان موجوداً
    const cancelEditBtn = form.querySelector('.btn-warning');
    if (cancelEditBtn) {
        cancelEditBtn.remove();
    }
    
    // إعادة تعيين قائمة أولياء الأمور
    document.getElementById('parentName').value = '';
    document.getElementById('parentIdInput').value = '';
    
    // إعادة تعيين قائمة الاختيار
    loadParentsForSelect();
}

function editUser(userId) {
    showToast('وظيفة التعديل قيد التطوير', 'info');
}

// ============================================
// 7. نظام إدارة الطالب (student.html)
// ============================================
function initStudentDashboard() {
    checkAuth('student').then(() => {
        loadStudentData();
        loadStudentGrades();
        setCurrentDate();
        hideLoading();
    }).catch(error => {
        console.error('خطأ في المصادقة:', error);
        window.location.href = 'index.html';
    });
}

function loadStudentData() {
    if (currentUser && currentUserData) {
        const studentNameElements = document.querySelectorAll('#studentName, #studentWelcomeName, #profileStudentName');
        studentNameElements.forEach(element => {
            if (element) {
                element.textContent = currentUserData.fullName || 'الطالب';
            }
        });
        
        const userEmailElement = document.getElementById('currentUserEmail');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email;
        }
        
        database.ref('students/' + currentUser.uid).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const studentDetails = snapshot.val();
                    updateStudentProfile(studentDetails);
                    updateStudentStats();
                }
            })
            .catch(error => {
                console.error('خطأ في تحميل بيانات الطالب:', error);
            });
    }
}

function updateStudentProfile(studentDetails) {
    const elements = {
        'profileStudentId': studentDetails.studentId || 'غير محدد',
        'profileBirthDate': studentDetails.birthDate || 'غير محدد',
        'profileDisability': studentDetails.disabilityType || 'غير محدد',
        'profileGradeLevel': studentDetails.gradeLevel || 'غير محدد'
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
    if (studentDetails.parentId) {
        database.ref('users/' + studentDetails.parentId).once('value')
            .then(parentSnapshot => {
                const parentElement = document.getElementById('profileParent');
                if (parentElement) {
                    parentElement.textContent = parentSnapshot.exists() ? 
                        parentSnapshot.val().fullName || 'غير محدد' : 'غير محدد';
                }
            })
            .catch(() => {
                const parentElement = document.getElementById('profileParent');
                if (parentElement) parentElement.textContent = 'غير محدد';
            });
    } else {
        const parentElement = document.getElementById('profileParent');
        if (parentElement) parentElement.textContent = 'غير محدد';
    }
}

function loadStudentGrades() {
    database.ref('grades').orderByChild('studentId').equalTo(currentUser.uid).once('value')
        .then(snapshot => {
            const tbody = document.getElementById('studentGradesTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!snapshot.exists()) {
                tbody.innerHTML = `
                    <tr class="no-data">
                        <td colspan="6">
                            <i class="fas fa-info-circle"></i>
                            <span>لا توجد نتائج حتى الآن</span>
                        </td>
                    </tr>
                `;
                updateGradesStats(0, 0);
                return;
            }
            
            let index = 1;
            let totalScore = 0;
            let totalGrades = 0;
            
            snapshot.forEach((childSnapshot) => {
                const grade = childSnapshot.val();
                
                let gradeLetter = 'غير محدد';
                if (grade.gradeScore >= 90) gradeLetter = 'ممتاز';
                else if (grade.gradeScore >= 80) gradeLetter = 'جيد جداً';
                else if (grade.gradeScore >= 70) gradeLetter = 'جيد';
                else if (grade.gradeScore >= 60) gradeLetter = 'مقبول';
                else gradeLetter = 'راسب';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index}</td>
                    <td>${grade.subject || 'غير محدد'}</td>
                    <td>${grade.gradeScore || 0}</td>
                    <td><span class="grade-badge ${gradeLetter}">${gradeLetter}</span></td>
                    <td>${grade.gradeDate || 'غير محدد'}</td>
                    <td>${grade.gradeNotes || 'لا توجد ملاحظات'}</td>
                `;
                
                tbody.appendChild(row);
                
                if (grade.gradeScore) {
                    totalScore += grade.gradeScore;
                    totalGrades++;
                }
                
                index++;
            });
            
            updateGradesStats(totalScore, totalGrades);
        })
        .catch((error) => {
            console.error('خطأ في تحميل الدرجات:', error);
            showToast('حدث خطأ في تحميل الدرجات', 'error');
        });
}

function updateStudentStats() {
    database.ref('grades').orderByChild('studentId').equalTo(currentUser.uid).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                let subjects = new Set();
                let totalScore = 0;
                let totalGrades = 0;
                
                snapshot.forEach((childSnapshot) => {
                    const grade = childSnapshot.val();
                    if (grade.subject) {
                        subjects.add(grade.subject);
                    }
                    if (grade.gradeScore) {
                        totalScore += grade.gradeScore;
                        totalGrades++;
                    }
                });
                
                const subjectsCountElement = document.getElementById('subjectsCount');
                if (subjectsCountElement) {
                    subjectsCountElement.textContent = subjects.size;
                }
                
                if (totalGrades > 0) {
                    const average = Math.round(totalScore / totalGrades);
                    const averageGradeElement = document.getElementById('averageGrade');
                    if (averageGradeElement) {
                        averageGradeElement.textContent = average + '%';
                    }
                }
            }
        })
        .catch((error) => {
            console.error('خطأ في حساب الإحصائيات:', error);
        });
}

function updateGradesStats(totalScore, totalGrades) {
    if (totalGrades > 0) {
        const average = Math.round(totalScore / totalGrades);
        const averageGradeElement = document.getElementById('averageGrade');
        const subjectsCountElement = document.getElementById('subjectsCount');
        
        if (averageGradeElement) {
            averageGradeElement.textContent = average + '%';
        }
        if (subjectsCountElement) {
            subjectsCountElement.textContent = totalGrades;
        }
    }
}

// ============================================
// 8. نظام إدارة ولي الأمر (parent.html)
// ============================================
function initParentDashboard() {
    checkAuth('parent').then(() => {
        loadParentData();
        setCurrentDate();
        hideLoading();
    }).catch(error => {
        console.error('خطأ في المصادقة:', error);
        window.location.href = 'index.html';
    });
}

function loadParentData() {
    if (currentUser && currentUserData) {
        const parentNameElements = document.querySelectorAll('#parentName, #parentWelcomeName');
        parentNameElements.forEach(element => {
            if (element) {
                element.textContent = currentUserData.fullName || 'ولي الأمر';
            }
        });
        
        const userEmailElement = document.getElementById('currentUserEmail');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email;
        }
        
        loadChildData();
    }
}

function loadChildData() {
    if (currentUserData.childId) {
        getChildData(currentUserData.childId);
    } else {
        database.ref('students').orderByChild('parentId').equalTo(currentUser.uid).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        const childId = childSnapshot.key;
                        database.ref('users/' + currentUser.uid).update({
                            childId: childId
                        });
                        getChildData(childId);
                    });
                } else {
                    showNoChildMessage();
                }
            })
            .catch(error => {
                console.error('خطأ في البحث عن الطفل:', error);
                showNoChildMessage();
            });
    }
}

function getChildData(childId) {
    database.ref('students/' + childId).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const childData = snapshot.val();
                displayChildInfo(childData);
                loadChildGrades(childId);
                loadChildMedicalFollowup(childId);
            } else {
                showNoChildMessage();
            }
        })
        .catch(error => {
            console.error('خطأ في جلب بيانات الطفل:', error);
            showNoChildMessage();
        });
}

function displayChildInfo(childData) {
    const childInfoCard = document.getElementById('childInfoCard');
    if (childInfoCard) {
        childInfoCard.innerHTML = `
            <div class="child-info-header">
                <div class="child-avatar">
                    <i class="fas fa-child"></i>
                </div>
                <div class="child-info">
                    <h3>${childData.fullName || 'غير محدد'}</h3>
                    <p>رقم الهوية: ${childData.studentId || 'غير محدد'}</p>
                </div>
            </div>
            
            <div class="child-details">
                <div class="detail-item">
                    <span class="detail-label">تاريخ الميلاد:</span>
                    <span class="detail-value">${childData.birthDate || 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">الصف الدراسي:</span>
                    <span class="detail-value">${childData.gradeLevel || 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">نوع الإعاقة:</span>
                    <span class="detail-value">${childData.disabilityType || 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">مستوى الإعاقة:</span>
                    <span class="detail-value">${childData.disabilityLevel || 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">المدرسة:</span>
                    <span class="detail-value">مدرسة الأمل</span>
                </div>
            </div>
            
            <div class="child-actions">
                <button class="btn btn-primary" onclick="showSection('child-profile')">
                    <i class="fas fa-child"></i> عرض الملف الشخصي الكامل
                </button>
            </div>
        `;
    }
    
    updateChildProfile(childData);
}

function updateChildProfile(childData) {
    const profileContent = document.getElementById('childProfileContent');
    if (profileContent) {
        profileContent.innerHTML = `
            <div class="child-profile-card">
                <div class="profile-section">
                    <h3><i class="fas fa-user"></i> المعلومات الشخصية</h3>
                    <div class="profile-grid">
                        <div class="profile-item">
                            <label>الاسم الكامل:</label>
                            <span>${childData.fullName || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>رقم الهوية:</label>
                            <span>${childData.studentId || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>تاريخ الميلاد:</label>
                            <span>${childData.birthDate || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>العمر:</label>
                            <span>${calculateAge(childData.birthDate) || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>نوع الإعاقة:</label>
                            <span>${childData.disabilityType || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>مستوى الإعاقة:</label>
                            <span>${childData.disabilityLevel || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>الصف الدراسي:</label>
                            <span>${childData.gradeLevel || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>البريد الإلكتروني:</label>
                            <span>${childData.email || 'غير محدد'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3><i class="fas fa-stethoscope"></i> المعلومات الطبية</h3>
                    <div class="profile-grid">
                        <div class="profile-item">
                            <label>تاريخ التشخيص:</label>
                            <span>${childData.diagnosisDate || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>الجهة الطبية:</label>
                            <span>${childData.medicalCenter || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>الطبيب المعالج:</label>
                            <span>${childData.doctorName || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item">
                            <label>رقم هاتف الطبيب:</label>
                            <span>${childData.doctorPhone || 'غير محدد'}</span>
                        </div>
                        <div class="profile-item full-width">
                            <label>الملاحظات الطبية:</label>
                            <p>${childData.medicalNotes || 'لا توجد ملاحظات طبية'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3><i class="fas fa-school"></i> المعلومات الأكاديمية</h3>
                    <div class="profile-grid">
                        <div class="profile-item">
                            <label>المدرسة:</label>
                            <span>مدرسة الأمل</span>
                        </div>
                        <div class="profile-item">
                            <label>السنة الدراسية:</label>
                            <span>${childData.academicYear || '2023-2024'}</span>
                        </div>
                        <div class="profile-item">
                            <label>الفصل الدراسي:</label>
                            <span>${childData.semester || 'الأول'}</span>
                        </div>
                        <div class="profile-item full-width">
                            <label>ملاحظات أكاديمية:</label>
                            <p>${childData.notes || 'لا توجد ملاحظات'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function calculateAge(birthDate) {
    if (!birthDate) return 'غير محدد';
    
    try {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return `${age} سنة`;
    } catch (error) {
        return 'غير محدد';
    }
}

function loadChildGrades(childId) {
    database.ref('grades').orderByChild('studentId').equalTo(childId).once('value')
        .then(snapshot => {
            const container = document.getElementById('childGradesContainer');
            if (!container) return;
            
            if (!snapshot.exists()) {
                container.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-chart-line"></i>
                        <h3>لا توجد نتائج دراسية حتى الآن</h3>
                        <p>سيتم إضافة النتائج الدراسية من قبل المعلمين قريباً</p>
                    </div>
                `;
                return;
            }
            
            let gradesHTML = `
                <div class="grades-summary">
                    <h3><i class="fas fa-chart-bar"></i> ملخص النتائج الدراسية</h3>
                    <div class="summary-cards" id="gradesSummary">
                        <!-- سيتم ملؤها بالجافاسكريبت -->
                    </div>
                </div>
                
                <div class="grades-table-section">
                    <h3><i class="fas fa-table"></i> تفاصيل الدرجات</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>المادة</th>
                                    <th>نوع الاختبار</th>
                                    <th>التاريخ</th>
                                    <th>الدرجة</th>
                                    <th>التقدير</th>
                                    <th>ملاحظات المعلم</th>
                                </tr>
                            </thead>
                            <tbody id="childGradesTableBody">
                                <!-- سيتم ملؤها بالجافاسكريبت -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            container.innerHTML = gradesHTML;
            
            let totalScore = 0;
            let totalGrades = 0;
            let subjects = new Set();
            let subjectsData = {};
            
            let index = 1;
            snapshot.forEach((childSnapshot) => {
                const grade = childSnapshot.val();
                
                let gradeLetter = 'غير محدد';
                if (grade.gradeScore >= 90) gradeLetter = 'ممتاز';
                else if (grade.gradeScore >= 80) gradeLetter = 'جيد جداً';
                else if (grade.gradeScore >= 70) gradeLetter = 'جيد';
                else if (grade.gradeScore >= 60) gradeLetter = 'مقبول';
                else gradeLetter = 'راسب';
                
                const tbody = document.getElementById('childGradesTableBody');
                if (tbody) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index}</td>
                        <td>${grade.subject || 'غير محدد'}</td>
                        <td>${grade.gradeType || 'غير محدد'}</td>
                        <td>${grade.gradeDate || 'غير محدد'}</td>
                        <td>${grade.gradeScore || 0}</td>
                        <td><span class="grade-badge ${gradeLetter}">${gradeLetter}</span></td>
                        <td>${grade.gradeNotes || 'لا توجد ملاحظات'}</td>
                    `;
                    tbody.appendChild(row);
                }
                
                if (grade.gradeScore) {
                    totalScore += grade.gradeScore;
                    totalGrades++;
                    
                    if (grade.subject) {
                        subjects.add(grade.subject);
                        if (!subjectsData[grade.subject]) {
                            subjectsData[grade.subject] = {
                                total: 0,
                                count: 0
                            };
                        }
                        subjectsData[grade.subject].total += grade.gradeScore;
                        subjectsData[grade.subject].count++;
                    }
                }
                
                index++;
            });
            
            updateGradesSummary(totalScore, totalGrades, subjects.size, subjectsData);
        })
        .catch((error) => {
            console.error('خطأ في تحميل درجات الطفل:', error);
            showToast('حدث خطأ في تحميل درجات الطفل', 'error');
        });
}

function updateGradesSummary(totalScore, totalGrades, subjectsCount, subjectsData) {
    const summaryDiv = document.getElementById('gradesSummary');
    if (!summaryDiv) return;
    
    let average = totalGrades > 0 ? Math.round(totalScore / totalGrades) : 0;
    
    summaryDiv.innerHTML = `
        <div class="summary-card">
            <div class="summary-icon" style="background: #4a6ee0;">
                <i class="fas fa-book"></i>
            </div>
            <div class="summary-info">
                <h4>عدد المواد</h4>
                <div class="summary-value">${subjectsCount}</div>
            </div>
        </div>
        
        <div class="summary-card">
            <div class="summary-icon" style="background: #6a11cb;">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="summary-info">
                <h4>المتوسط العام</h4>
                <div class="summary-value">${average}%</div>
            </div>
        </div>
        
        <div class="summary-card">
            <div class="summary-icon" style="background: #28a745;">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="summary-info">
                <h4>عدد الاختبارات</h4>
                <div class="summary-value">${totalGrades}</div>
            </div>
        </div>
        
        <div class="summary-card">
            <div class="summary-icon" style="background: #ffc107;">
                <i class="fas fa-star"></i>
            </div>
            <div class="summary-info">
                <h4>أفضل مادة</h4>
                <div class="summary-value">${getBestSubject(subjectsData)}</div>
            </div>
        </div>
    `;
}

function getBestSubject(subjectsData) {
    let bestSubject = 'غير محدد';
    let highestAverage = 0;
    
    for (const subject in subjectsData) {
        const average = subjectsData[subject].total / subjectsData[subject].count;
        if (average > highestAverage) {
            highestAverage = average;
            bestSubject = subject;
        }
    }
    
    return bestSubject;
}

function loadChildMedicalFollowup(childId) {
    database.ref('medicalHistory').orderByChild('studentId').equalTo(childId).once('value')
        .then(snapshot => {
            const container = document.getElementById('follow-upContainer');
            if (!container) return;
            
            if (!snapshot.exists()) {
                container.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-heartbeat"></i>
                        <h3>لا توجد بيانات متابعة طبية</h3>
                        <p>سيتم إضافة بيانات المتابعة الطبية من قبل الأخصائيين قريباً</p>
                    </div>
                `;
                return;
            }
            
            let followupHTML = `
                <div class="followup-cards" id="medicalFollowupCards">
                    <!-- سيتم ملؤها بالجافاسكريبت -->
                </div>
            `;
            
            container.innerHTML = followupHTML;
            
            const cardsDiv = document.getElementById('medicalFollowupCards');
            let index = 1;
            
            snapshot.forEach((childSnapshot) => {
                const record = childSnapshot.val();
                
                const card = document.createElement('div');
                card.className = 'followup-card';
                card.innerHTML = `
                    <div class="followup-header">
                        <span class="followup-date">${record.recordDate || 'غير محدد'}</span>
                        <span class="followup-type">${record.visitType || 'متابعة'}</span>
                    </div>
                    
                    <div class="followup-content">
                        <div class="followup-item">
                            <label><i class="fas fa-user-md"></i> الأخصائي:</label>
                            <span>${record.specialistName || 'غير محدد'}</span>
                        </div>
                        <div class="followup-item">
                            <label><i class="fas fa-stethoscope"></i> التشخيص:</label>
                            <span>${record.diagnosis || 'غير محدد'}</span>
                        </div>
                        <div class="followup-item">
                            <label><i class="fas fa-prescription-bottle-alt"></i> العلاج:</label>
                            <span>${record.treatment || 'غير محدد'}</span>
                        </div>
                        <div class="followup-item">
                            <label><i class="fas fa-calendar-check"></i> موعد المقبل:</label>
                            <span>${record.nextVisit || 'غير محدد'}</span>
                        </div>
                        <div class="followup-item full-width">
                            <label><i class="fas fa-comment-medical"></i> ملاحظات:</label>
                            <p>${record.notes || 'لا توجد ملاحظات'}</p>
                        </div>
                    </div>
                    
                    <div class="followup-actions">
                        <span class="followup-status ${record.status || 'مكتمل'}">${record.status || 'مكتمل'}</span>
                    </div>
                `;
                
                cardsDiv.appendChild(card);
                index++;
            });
        })
        .catch((error) => {
            console.error('خطأ في تحميل المتابعة الطبية:', error);
            showToast('حدث خطأ في تحميل المتابعة الطبية', 'error');
        });
}

function showNoChildMessage() {
    const childInfoCard = document.getElementById('childInfoCard');
    if (childInfoCard) {
        childInfoCard.innerHTML = `
            <div class="no-child-message">
                <i class="fas fa-child"></i>
                <h3>لا يوجد طفل مرتبط بحسابك</h3>
                <p>يرجى التواصل مع المشرف لإضافة طفل إلى حسابك</p>
                <button class="btn btn-primary" onclick="contactAdmin()">
                    <i class="fas fa-headset"></i> التواصل مع المشرف
                </button>
            </div>
        `;
    }
}

function contactAdmin() {
    alert('يرجى التواصل مع المشرف العام على البريد: admin@school.edu');
}

// ============================================
// 9. نظام إدارة المعلم (teacher.html)
// ============================================
function initTeacherDashboard() {
    checkAuth('teacher').then(() => {
        loadTeacherData();
        loadTeacherStudents();
        loadTeacherGradesList();
        initAddGradeForm();
        setCurrentDate();
        hideLoading();
        
        // تهيئة البحث
        setTimeout(() => {
            initSearch('my-students');
            initSearch('grades-list');
        }, 500);
    }).catch(error => {
        console.error('خطأ في المصادقة:', error);
        window.location.href = 'index.html';
    });
}

function loadTeacherData() {
    if (currentUser && currentUserData) {
        const teacherNameElements = document.querySelectorAll('#teacherName, #teacherWelcomeName');
        teacherNameElements.forEach(element => {
            if (element) {
                element.textContent = currentUserData.fullName || 'المعلم';
            }
        });
        
        const subjectElement = document.getElementById('teacherSubject');
        const currentSubjectElement = document.getElementById('currentSubject');
        if (subjectElement && currentUserData.subject) {
            subjectElement.textContent = currentUserData.subject;
        }
        if (currentSubjectElement && currentUserData.subject) {
            currentSubjectElement.textContent = currentUserData.subject;
        }
        
        const userEmailElement = document.getElementById('currentUserEmail');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email;
        }
        
        updateTeacherStats();
    }
}

function loadTeacherStudents() {
    database.ref('students').once('value')
        .then(snapshot => {
            const tbody = document.getElementById('teacherStudentsTableBody');
            const gradeStudentSelect = document.getElementById('gradeStudent');
            
            if (!snapshot.exists()) {
                if (tbody) {
                    tbody.innerHTML = `
                        <tr class="no-data">
                            <td colspan="8">
                                <i class="fas fa-info-circle"></i>
                                <span>لا توجد بيانات طلاب حتى الآن</span>
                            </td>
                        </tr>
                    `;
                }
                if (gradeStudentSelect) {
                    gradeStudentSelect.innerHTML = '<option value="">لا توجد طلاب</option>';
                }
                return;
            }
            
            let studentsCount = 0;
            let totalAverage = 0;
            let totalStudentsWithGrades = 0;
            
            if (tbody) tbody.innerHTML = '';
            if (gradeStudentSelect) {
                gradeStudentSelect.innerHTML = '<option value="">اختر الطالب</option>';
            }
            
            snapshot.forEach((childSnapshot) => {
                const student = childSnapshot.val();
                const studentId = childSnapshot.key;
                
                studentsCount++;
                
                if (gradeStudentSelect) {
                    const option = document.createElement('option');
                    option.value = studentId;
                    option.textContent = student.fullName || 'طالب بدون اسم';
                    gradeStudentSelect.appendChild(option);
                }
                
                database.ref('grades')
                    .orderByChild('studentId')
                    .equalTo(studentId)
                    .once('value')
                    .then(gradesSnapshot => {
                        let studentTotal = 0;
                        let studentGradesCount = 0;
                        let lastGrade = 0;
                        let attendance = 'حاضر';
                        
                        if (gradesSnapshot.exists()) {
                            gradesSnapshot.forEach(gradeSnapshot => {
                                const grade = gradeSnapshot.val();
                                if (grade.gradeScore) {
                                    studentTotal += grade.gradeScore;
                                    studentGradesCount++;
                                    lastGrade = grade.gradeScore;
                                }
                            });
                        }
                        
                        const studentAverage = studentGradesCount > 0 ? Math.round(studentTotal / studentGradesCount) : 0;
                        
                        if (studentAverage > 0) {
                            totalAverage += studentAverage;
                            totalStudentsWithGrades++;
                        }
                        
                        if (tbody) {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${studentsCount}</td>
                                <td>${student.fullName || 'غير محدد'}</td>
                                <td>${student.gradeLevel || 'غير محدد'}</td>
                                <td>${lastGrade}</td>
                                <td>${studentAverage}%</td>
                                <td>${studentGradesCount}</td>
                                <td><span class="attendance-badge ${attendance}">${attendance}</span></td>
                                <td>
                                    <button type="button" class="btn-icon add-grade" onclick="addGradeForStudent('${studentId}', '${student.fullName || 'الطالب'}')">
                                        <i class="fas fa-plus"></i> إضافة درجة
                                    </button>
                                    <button type="button" class="btn-icon view-grades" onclick="viewStudentGrades('${studentId}')">
                                        <i class="fas fa-eye"></i> عرض الدرجات
                                    </button>
                                </td>
                            `;
                            tbody.appendChild(row);
                        }
                        
                        if (studentsCount === snapshot.numChildren()) {
                            const finalAverage = totalStudentsWithGrades > 0 ? Math.round(totalAverage / totalStudentsWithGrades) : 0;
                            const averageScoreElement = document.getElementById('averageScore');
                            const subjectStudentsCountElement = document.getElementById('subjectStudentsCount');
                            
                            if (averageScoreElement) averageScoreElement.textContent = finalAverage + '%';
                            if (subjectStudentsCountElement) subjectStudentsCountElement.textContent = studentsCount;
                        }
                    })
                    .catch(error => {
                        console.error('خطأ في جلب درجات الطالب:', error);
                    });
            });
        })
        .catch((error) => {
            console.error('خطأ في تحميل الطلاب:', error);
            showToast('حدث خطأ في تحميل قائمة الطلاب', 'error');
        });
}

function initAddGradeForm() {
    const addGradeForm = document.getElementById('addGradeForm');
    if (addGradeForm) {
        addGradeForm.addEventListener('submit', handleAddGrade);
        
        const today = new Date().toISOString().split('T')[0];
        const gradeDateInput = document.getElementById('gradeDate');
        if (gradeDateInput) {
            gradeDateInput.value = today;
        }
    }
}

function handleAddGrade(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('gradeStudent').value;
    const gradeType = document.getElementById('gradeType').value;
    const gradeDate = document.getElementById('gradeDate').value;
    const gradeScore = document.getElementById('gradeScore').value;
    const gradeNotes = document.getElementById('gradeNotes').value;
    
    if (!studentId || !gradeType || !gradeDate || !gradeScore) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (gradeScore < 0 || gradeScore > 100) {
        showToast('الدرجة يجب أن تكون بين 0 و 100', 'error');
        return;
    }
    
    showLoading();
    
    database.ref('students/' + studentId).once('value')
        .then(studentSnapshot => {
            if (!studentSnapshot.exists()) {
                throw new Error('الطالب غير موجود');
            }
            
            const student = studentSnapshot.val();
            const subject = currentUserData.subject || 'غير محدد';
            
            const gradeData = {
                studentId: studentId,
                studentName: student.fullName || 'غير محدد',
                teacherId: currentUser.uid,
                teacherName: currentUserData.fullName || 'المعلم',
                subject: subject,
                gradeType: gradeType,
                gradeDate: gradeDate,
                gradeScore: parseInt(gradeScore),
                gradeNotes: gradeNotes || 'لا توجد ملاحظات',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            return database.ref('grades').push().set(gradeData);
        })
        .then(() => {
            showToast('تم إضافة الدرجة بنجاح!', 'success');
            
            document.getElementById('addGradeForm').reset();
            
            loadTeacherGradesList();
            loadTeacherStudents();
            updateTeacherStats();
            
            hideLoading();
            
            showSection('grades-list');
        })
        .catch((error) => {
            console.error('خطأ في إضافة الدرجة:', error);
            showToast('حدث خطأ أثناء إضافة الدرجة: ' + error.message, 'error');
            hideLoading();
        });
}

function loadTeacherGradesList() {
    database.ref('grades').orderByChild('teacherId').equalTo(currentUser.uid).once('value')
        .then(snapshot => {
            const tbody = document.getElementById('gradesListTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!snapshot.exists()) {
                tbody.innerHTML = `
                    <tr class="no-data">
                        <td colspan="7">
                            <i class="fas fa-info-circle"></i>
                            <span>لا توجد درجات حتى الآن</span>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let index = 1;
            snapshot.forEach((childSnapshot) => {
                const grade = childSnapshot.val();
                const gradeId = childSnapshot.key;
                
                let gradeLetter = 'غير محدد';
                if (grade.gradeScore >= 90) gradeLetter = 'ممتاز';
                else if (grade.gradeScore >= 80) gradeLetter = 'جيد جداً';
                else if (grade.gradeScore >= 70) gradeLetter = 'جيد';
                else if (grade.gradeScore >= 60) gradeLetter = 'مقبول';
                else gradeLetter = 'راسب';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="#">${index}</td>
                    <td data-label="اسم الطالب">${grade.studentName || 'غير محدد'}</td>
                    <td data-label="نوع الاختبار">${grade.gradeType || 'غير محدد'}</td>
                    <td data-label="التاريخ">
                        <div class="date-cell">
                            <span class="date-day">${formatDateDay(grade.gradeDate)}</span>
                            <span class="date-month">${formatDateMonth(grade.gradeDate)}</span>
                        </div>
                    </td>
                    <td data-label="الدرجة">
                        <div class="score-display">
                            <span class="score-value">${grade.gradeScore || 0}</span>
                            <span class="score-max">/100</span>
                        </div>
                    </td>
                    <td data-label="التقدير">
                        <span class="grade-badge ${gradeLetter}">${gradeLetter}</span>
                    </td>
                    <td data-label="الإجراءات">
                        <div class="action-buttons">
                            <button type="button" class="btn-icon view" onclick="viewGradeDetails('${gradeId}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn-icon edit" onclick="editGrade('${gradeId}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn-icon delete" onclick="confirmDeleteGrade('${gradeId}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tbody.appendChild(row);
                index++;
            });
        })
        .catch((error) => {
            console.error('خطأ في تحميل قائمة الدرجات:', error);
            showToast('حدث خطأ في تحميل قائمة الدرجات', 'error');
        });
}

function updateTeacherStats() {
    database.ref('grades').orderByChild('teacherId').equalTo(currentUser.uid).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                let totalScore = 0;
                let totalGrades = 0;
                let studentsSet = new Set();
                
                snapshot.forEach((childSnapshot) => {
                    const grade = childSnapshot.val();
                    
                    if (grade.gradeScore) {
                        totalScore += grade.gradeScore;
                        totalGrades++;
                    }
                    
                    if (grade.studentId) {
                        studentsSet.add(grade.studentId);
                    }
                });
                
                const average = totalGrades > 0 ? Math.round(totalScore / totalGrades) : 0;
                const averageScoreElement = document.getElementById('averageScore');
                const subjectStudentsCountElement = document.getElementById('subjectStudentsCount');
                
                if (averageScoreElement) averageScoreElement.textContent = average + '%';
                if (subjectStudentsCountElement) subjectStudentsCountElement.textContent = studentsSet.size;
            }
        })
        .catch((error) => {
            console.error('خطأ في تحديث إحصائيات المعلم:', error);
        });
}

function addGradeForStudent(studentId, studentName) {
    showSection('add-grade');
    
    const gradeStudentSelect = document.getElementById('gradeStudent');
    if (gradeStudentSelect) {
        gradeStudentSelect.value = studentId;
        
        let found = false;
        for (let option of gradeStudentSelect.options) {
            if (option.value === studentId) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            const option = document.createElement('option');
            option.value = studentId;
            option.textContent = studentName;
            gradeStudentSelect.appendChild(option);
        }
        
        gradeStudentSelect.value = studentId;
    }
}

function viewStudentGrades(studentId) {
    database.ref('grades')
        .orderByChild('studentId')
        .equalTo(studentId)
        .once('value')
        .then(snapshot => {
            let message = 'درجات الطالب:\n\n';
            let total = 0;
            let count = 0;
            
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const grade = childSnapshot.val();
                    message += `- ${grade.subject || 'مادة'}: ${grade.gradeScore} (${grade.gradeType || 'نوع'})\n`;
                    
                    if (grade.gradeScore) {
                        total += grade.gradeScore;
                        count++;
                    }
                });
                
                if (count > 0) {
                    const average = Math.round(total / count);
                    message += `\nالمتوسط: ${average}%`;
                }
            } else {
                message = 'لا توجد درجات لهذا الطالب';
            }
            
            alert(message);
        })
        .catch(error => {
            console.error('خطأ في عرض درجات الطالب:', error);
            alert('حدث خطأ في جلب درجات الطالب');
        });
}

function viewGradeDetails(gradeId) {
    database.ref('grades/' + gradeId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert('الدرجة غير موجودة');
                return;
            }
            
            const grade = snapshot.val();
            let message = `📋 **تفاصيل الدرجة**\n\n`;
            message += `👦 الطالب: ${grade.studentName || 'غير محدد'}\n`;
            message += `👨‍🏫 المعلم: ${grade.teacherName || 'غير محدد'}\n`;
            message += `📚 المادة: ${grade.subject || 'غير محدد'}\n`;
            message += `📊 نوع الاختبار: ${grade.gradeType || 'غير محدد'}\n`;
            message += `📅 التاريخ: ${grade.gradeDate || 'غير محدد'}\n`;
            message += `⭐ الدرجة: ${grade.gradeScore || 0}/100\n\n`;
            message += `📝 **الملاحظات:**\n${grade.gradeNotes || 'لا توجد ملاحظات'}`;
            
            alert(message);
        })
        .catch(error => {
            console.error('خطأ في عرض تفاصيل الدرجة:', error);
            alert('حدث خطأ في عرض تفاصيل الدرجة');
        });
}

function editGrade(gradeId) {
    showToast('وظيفة التعديل قيد التطوير', 'info');
}

function confirmDeleteGrade(gradeId) {
    if (confirm('⚠️ هل أنت متأكد من حذف هذه الدرجة؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) {
        showLoading();
        
        database.ref('grades/' + gradeId).remove()
            .then(() => {
                showToast('تم حذف الدرجة بنجاح', 'success');
                loadTeacherGradesList();
                updateTeacherStats();
                hideLoading();
            })
            .catch(error => {
                console.error('خطأ في حذف الدرجة:', error);
                showToast('حدث خطأ أثناء حذف الدرجة', 'error');
                hideLoading();
            });
    }
}

// ============================================
// 10. نظام إدارة الأخصائي (specialist.html)
// ============================================
function initSpecialistDashboard() {
    checkAuth('specialist').then(() => {
        loadSpecialistData();
        loadSpecialistChildren();
        loadEvaluationsList();
        loadMedicalHistory();
        initAddEvaluationForm();
        setCurrentDate();
        updateSpecialistStats();
        hideLoading();
        
        // تهيئة البحث
        setTimeout(() => {
            initSearch('children');
            initSearch('evaluations');
            initSearch('medical-history');
        }, 500);
    }).catch(error => {
        console.error('خطأ في المصادقة:', error);
        window.location.href = 'index.html';
    });
}

function loadSpecialistData() {
    if (currentUser && currentUserData) {
        const specialistNameElements = document.querySelectorAll('#specialistName, #specialistWelcomeName');
        specialistNameElements.forEach(element => {
            if (element) {
                element.textContent = currentUserData.fullName || 'الأخصائي';
            }
        });
        
        const userEmailElement = document.getElementById('currentUserEmail');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email;
        }
        
        if (currentUserData.specialty) {
            const specialtyBadge = document.createElement('span');
            specialtyBadge.className = 'specialty-badge';
            specialtyBadge.textContent = currentUserData.specialty;
            
            const userInfo = document.querySelector('.user-info');
            if (userInfo) {
                userInfo.appendChild(specialtyBadge);
            }
        }
    }
}

function loadSpecialistChildren() {
    database.ref('students').once('value')
        .then(snapshot => {
            const tbody = document.getElementById('specialistChildrenTableBody');
            const evalStudentSelect = document.getElementById('evalStudent');
            
            if (!snapshot.exists()) {
                if (tbody) {
                    tbody.innerHTML = `
                        <tr class="no-data">
                            <td colspan="7">
                                <i class="fas fa-info-circle"></i>
                                <span>لا توجد بيانات أطفال حتى الآن</span>
                            </td>
                        </tr>
                    `;
                }
                if (evalStudentSelect) {
                    evalStudentSelect.innerHTML = '<option value="">لا توجد أطفال</option>';
                }
                return;
            }
            
            let childrenCount = 0;
            
            if (tbody) tbody.innerHTML = '';
            if (evalStudentSelect) {
                evalStudentSelect.innerHTML = '<option value="">اختر الطفل</option>';
            }
            
            snapshot.forEach((childSnapshot) => {
                const child = childSnapshot.val();
                const childId = childSnapshot.key;
                
                childrenCount++;
                
                if (evalStudentSelect) {
                    const option = document.createElement('option');
                    option.value = childId;
                    option.textContent = child.fullName || 'طفل بدون اسم';
                    evalStudentSelect.appendChild(option);
                }
                
                database.ref('evaluations')
                    .orderByChild('studentId')
                    .equalTo(childId)
                    .limitToLast(1)
                    .once('value')
                    .then(evalSnapshot => {
                        let lastEvaluation = 'لا يوجد';
                        let lastEvaluationDate = 'غير محدد';
                        let progressLevel = 'غير محدد';
                        
                        if (evalSnapshot.exists()) {
                            evalSnapshot.forEach(evalChild => {
                                const evaluation = evalChild.val();
                                lastEvaluation = evaluation.evalType || 'غير محدد';
                                lastEvaluationDate = evaluation.evalDate || 'غير محدد';
                                
                                if (evaluation.evalScore >= 90) progressLevel = 'ممتاز';
                                else if (evaluation.evalScore >= 80) progressLevel = 'جيد جداً';
                                else if (evaluation.evalScore >= 70) progressLevel = 'جيد';
                                else if (evaluation.evalScore >= 60) progressLevel = 'مقبول';
                                else if (evaluation.evalScore > 0) progressLevel = 'يحتاج تحسين';
                            });
                        }
                        
                        const age = calculateAge(child.birthDate);
                        
                        if (tbody) {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td data-label="#">${childrenCount}</td>
                                <td data-label="الاسم الكامل">
                                    <div class="child-cell">
                                        <div class="child-name">${child.fullName || 'غير محدد'}</div>
                                        <div class="child-age">العمر: ${age}</div>
                                    </div>
                                </td>
                                <td data-label="العمر">${age}</td>
                                <td data-label="نوع الإعاقة">${child.disabilityType || 'غير محدد'}</td>
                                <td data-label="آخر تقييم">
                                    <div class="last-eval">
                                        <span class="eval-type">${lastEvaluation}</span>
                                        <span class="eval-date">${lastEvaluationDate}</span>
                                    </div>
                                </td>
                                <td data-label="مستوى التقدم">
                                    <span class="progress-level ${progressLevel}">${progressLevel}</span>
                                </td>
                                <td data-label="الإجراءات">
                                    <button type="button" class="btn-icon add-eval" onclick="addEvaluationForChild('${childId}', '${child.fullName || 'الطفل'}')">
                                        <i class="fas fa-clipboard-check"></i> تقييم
                                    </button>
                                    <button type="button" class="btn-icon view-history" onclick="viewChildHistory('${childId}')">
                                        <i class="fas fa-history"></i> سجل
                                    </button>
                                </td>
                            `;
                            tbody.appendChild(row);
                        }
                    })
                    .catch(error => {
                        console.error('خطأ في جلب تقييمات الطفل:', error);
                    });
            });
            
            const childrenCountElement = document.getElementById('childrenCount');
            if (childrenCountElement) {
                childrenCountElement.textContent = childrenCount;
            }
        })
        .catch((error) => {
            console.error('خطأ في تحميل الأطفال:', error);
            showToast('حدث خطأ في تحميل قائمة الأطفال', 'error');
        });
}

function initAddEvaluationForm() {
    const addEvaluationForm = document.getElementById('addEvaluationForm');
    if (addEvaluationForm) {
        addEvaluationForm.addEventListener('submit', handleAddEvaluation);
        
        const today = new Date().toISOString().split('T')[0];
        const evalDateInput = document.getElementById('evalDate');
        if (evalDateInput) {
            evalDateInput.value = today;
        }
    }
}

function handleAddEvaluation(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('evalStudent').value;
    const evalType = document.getElementById('evalType').value;
    const evalDate = document.getElementById('evalDate').value;
    const evalScore = document.getElementById('evalScore').value;
    const evalNotes = document.getElementById('evalNotes').value;
    
    if (!studentId || !evalType || !evalDate || !evalScore) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (evalScore < 0 || evalScore > 100) {
        showToast('الدرجة يجب أن تكون بين 0 و 100', 'error');
        return;
    }
    
    showLoading();
    
    database.ref('students/' + studentId).once('value')
        .then(studentSnapshot => {
            if (!studentSnapshot.exists()) {
                throw new Error('الطفل غير موجود');
            }
            
            const student = studentSnapshot.val();
            
            const evaluationData = {
                studentId: studentId,
                studentName: student.fullName || 'غير محدد',
                specialistId: currentUser.uid,
                specialistName: currentUserData.fullName || 'الأخصائي',
                evalType: evalType,
                evalDate: evalDate,
                evalScore: parseInt(evalScore),
                evalNotes: evalNotes || 'لا توجد ملاحظات',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            return database.ref('evaluations').push().set(evaluationData);
        })
        .then(() => {
            showToast('تم إضافة التقييم بنجاح!', 'success');
            
            document.getElementById('addEvaluationForm').reset();
            
            loadEvaluationsList();
            loadSpecialistChildren();
            updateSpecialistStats();
            
            hideLoading();
            
            showSection('evaluations');
        })
        .catch((error) => {
            console.error('خطأ في إضافة التقييم:', error);
            showToast('حدث خطأ أثناء إضافة التقييم: ' + error.message, 'error');
            hideLoading();
        });
}

function loadEvaluationsList() {
    database.ref('evaluations').orderByChild('specialistId').equalTo(currentUser.uid).once('value')
        .then(snapshot => {
            const tbody = document.getElementById('evaluationsTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!snapshot.exists()) {
                tbody.innerHTML = `
                    <tr class="no-data">
                        <td colspan="6">
                            <i class="fas fa-info-circle"></i>
                            <span>لا توجد تقييمات حتى الآن</span>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let index = 1;
            snapshot.forEach((childSnapshot) => {
                const evaluation = childSnapshot.val();
                const evalId = childSnapshot.key;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index}</td>
                    <td>${evaluation.studentName || 'غير محدد'}</td>
                    <td>${evaluation.evalType || 'غير محدد'}</td>
                    <td>${evaluation.evalDate || 'غير محدد'}</td>
                    <td>
                        <div class="score-display">
                            <span class="score-value">${evaluation.evalScore || 0}</span>
                            <span class="score-max">/100</span>
                        </div>
                    </td>
                    <td>
                        <button type="button" class="btn-icon view" onclick="viewEvaluationDetails('${evalId}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn-icon edit" onclick="editEvaluation('${evalId}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-icon delete" onclick="confirmDeleteEvaluation('${evalId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
                index++;
            });
        })
        .catch((error) => {
            console.error('خطأ في تحميل قائمة التقييمات:', error);
            showToast('حدث خطأ في تحميل قائمة التقييمات', 'error');
        });
}

function loadMedicalHistory() {
    database.ref('medicalHistory').orderByChild('specialistId').equalTo(currentUser.uid).once('value')
        .then(snapshot => {
            const tbody = document.getElementById('medicalHistoryTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!snapshot.exists()) {
                tbody.innerHTML = `
                    <tr class="no-data">
                        <td colspan="6">
                            <i class="fas fa-info-circle"></i>
                            <span>لا توجد بيانات طبية حتى الآن</span>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let index = 1;
            snapshot.forEach((childSnapshot) => {
                const record = childSnapshot.val();
                const recordId = childSnapshot.key;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index}</td>
                    <td>${record.studentName || 'غير محدد'}</td>
                    <td>${record.diagnosis || 'غير محدد'}</td>
                    <td>${record.recordDate || 'غير محدد'}</td>
                    <td>${record.treatment || 'غير محدد'}</td>
                    <td>
                        <button type="button" class="btn-icon view" onclick="viewMedicalRecord('${recordId}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn-icon edit" onclick="editMedicalRecord('${recordId}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
                index++;
            });
        })
        .catch((error) => {
            console.error('خطأ في تحميل السجلات الطبية:', error);
            showToast('حدث خطأ في تحميل السجلات الطبية', 'error');
        });
}

function updateSpecialistStats() {
    database.ref('students').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const childrenCountElement = document.getElementById('childrenCount');
                if (childrenCountElement) {
                    childrenCountElement.textContent = snapshot.numChildren();
                }
            }
        })
        .catch(error => {
            console.error('خطأ في حساب عدد الأطفال:', error);
        });
    
    const upcomingSessionsElement = document.getElementById('upcomingSessions');
    if (upcomingSessionsElement) {
        upcomingSessionsElement.textContent = '3';
    }
}

function addEvaluationForChild(childId, childName) {
    showSection('add-evaluation');
    
    const evalStudentSelect = document.getElementById('evalStudent');
    if (evalStudentSelect) {
        evalStudentSelect.value = childId;
        
        let found = false;
        for (let option of evalStudentSelect.options) {
            if (option.value === childId) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            const option = document.createElement('option');
            option.value = childId;
            option.textContent = childName;
            evalStudentSelect.appendChild(option);
        }
        
        evalStudentSelect.value = childId;
    }
}

function viewChildHistory(childId) {
    showLoading();
    
    Promise.all([
        database.ref('evaluations').orderByChild('studentId').equalTo(childId).once('value'),
        database.ref('medicalHistory').orderByChild('studentId').equalTo(childId).once('value'),
        database.ref('students/' + childId).once('value')
    ])
    .then(([evaluationsSnapshot, medicalSnapshot, studentSnapshot]) => {
        hideLoading();
        
        if (!studentSnapshot.exists()) {
            alert('الطفل غير موجود');
            return;
        }
        
        const child = studentSnapshot.val();
        let message = `👦 **السجل الكامل للطفل:** ${child.fullName || 'غير محدد'}\n\n`;
        
        if (evaluationsSnapshot.exists()) {
            message += "📊 **التقييمات:**\n";
            evaluationsSnapshot.forEach(evalChild => {
                const evaluation = evalChild.val();
                message += `- ${evaluation.evalType}: ${evaluation.evalScore}/100 (${evaluation.evalDate})\n`;
            });
            message += "\n";
        } else {
            message += "📊 **التقييمات:** لا توجد\n\n";
        }
        
        if (medicalSnapshot.exists()) {
            message += "🏥 **السجلات الطبية:**\n";
            medicalSnapshot.forEach(recordChild => {
                const record = recordChild.val();
                message += `- ${record.diagnosis} (${record.recordDate})\n`;
            });
        } else {
            message += "🏥 **السجلات الطبية:** لا توجد";
        }
        
        alert(message);
    })
    .catch(error => {
        hideLoading();
        console.error('خطأ في جلب تاريخ الطفل:', error);
        alert('حدث خطأ في جلب تاريخ الطفل');
    });
}

function viewEvaluationDetails(evalId) {
    database.ref('evaluations/' + evalId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert('التقييم غير موجود');
                return;
            }
            
            const evaluation = snapshot.val();
            let message = `📋 **تفاصيل التقييم**\n\n`;
            message += `👦 الطفل: ${evaluation.studentName || 'غير محدد'}\n`;
            message += `👨‍⚕️ الأخصائي: ${evaluation.specialistName || 'غير محدد'}\n`;
            message += `📊 نوع التقييم: ${evaluation.evalType || 'غير محدد'}\n`;
            message += `📅 التاريخ: ${evaluation.evalDate || 'غير محدد'}\n`;
            message += `⭐ الدرجة: ${evaluation.evalScore || 0}/100\n\n`;
            message += `📝 **الملاحظات:**\n${evaluation.evalNotes || 'لا توجد ملاحظات'}`;
            
            alert(message);
        })
        .catch(error => {
            console.error('خطأ في عرض تفاصيل التقييم:', error);
            alert('حدث خطأ في عرض تفاصيل التقييم');
        });
}

function editEvaluation(evalId) {
    showToast('وظيفة التعديل قيد التطوير', 'info');
}

function confirmDeleteEvaluation(evalId) {
    if (confirm('⚠️ هل أنت متأكد من حذف هذا التقييم؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) {
        showLoading();
        
        database.ref('evaluations/' + evalId).remove()
            .then(() => {
                showToast('تم حذف التقييم بنجاح', 'success');
                loadEvaluationsList();
                loadSpecialistChildren();
                updateSpecialistStats();
                hideLoading();
            })
            .catch(error => {
                console.error('خطأ في حذف التقييم:', error);
                showToast('حدث خطأ أثناء حذف التقييم', 'error');
                hideLoading();
            });
    }
}

function viewMedicalRecord(recordId) {
    database.ref('medicalHistory/' + recordId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert('السجل الطبي غير موجود');
                return;
            }
            
            const record = snapshot.val();
            let message = `🏥 **السجل الطبي**\n\n`;
            message += `👦 الطفل: ${record.studentName || 'غير محدد'}\n`;
            message += `👨‍⚕️ الأخصائي: ${record.specialistName || 'غير محدد'}\n`;
            message += `📅 تاريخ الزيارة: ${record.recordDate || 'غير محدد'}\n`;
            message += `🔍 نوع الزيارة: ${record.visitType || 'غير محدد'}\n`;
            message += `🏥 التشخيص: ${record.diagnosis || 'غير محدد'}\n`;
            message += `💊 العلاج: ${record.treatment || 'غير محدد'}\n`;
            message += `📅 الموعد القادم: ${record.nextVisit || 'غير محدد'}\n`;
            message += `📈 الحالة: ${record.status || 'غير محدد'}\n\n`;
            message += `📝 **الملاحظات:**\n${record.notes || 'لا توجد ملاحظات'}`;
            
            alert(message);
        })
        .catch(error => {
            console.error('خطأ في عرض السجل الطبي:', error);
            alert('حدث خطأ في عرض السجل الطبي');
        });
}

function editMedicalRecord(recordId) {
    showToast('وظيفة التعديل قيد التطوير', 'info');
}

// ============================================
// 11. نظام المصادقة والصلاحيات
// ============================================
function checkAuth(requiredRole) {
    return new Promise((resolve, reject) => {
        showLoading();
        
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                
                firebase.database().ref('users/' + user.uid).once('value')
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            currentUserData = snapshot.val();
                            
                            if (currentUserData.role === requiredRole) {
                                resolve();
                            } else {
                                reject('ليس لديك صلاحية الدخول إلى هذه الصفحة');
                                window.location.href = 'index.html';
                            }
                        } else {
                            reject('بيانات المستخدم غير موجودة');
                            window.location.href = 'index.html';
                        }
                    })
                    .catch((error) => {
                        reject(error);
                        window.location.href = 'index.html';
                    });
            } else {
                reject('لم يتم تسجيل الدخول');
                window.location.href = 'index.html';
            }
        });
    });
}

// ============================================
// 12. تسجيل الخروج
// ============================================
function logout() {
    showLoading();
    
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('خطأ في تسجيل الخروج:', error);
            hideLoading();
            showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
        });
}

// ============================================
// 13. تهيئة التصميم والتنسيقات
// ============================================
function initLayout() {
    adjustContentHeight();
    window.addEventListener('resize', adjustContentHeight);
    initSidebarButtons();
    setCurrentDate();
}

function adjustContentHeight() {
    const topBar = document.querySelector('.top-bar');
    const contentSections = document.querySelector('.content-sections');
    
    if (topBar && contentSections) {
        const topBarHeight = topBar.offsetHeight;
        const windowHeight = window.innerHeight;
        const newHeight = windowHeight - topBarHeight - 60;
        contentSections.style.minHeight = `${newHeight}px`;
    }
}

function initSidebarButtons() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                const mainContent = document.querySelector('.main-content');
                
                if (sidebar) {
                    sidebar.classList.add('collapsed');
                }
                if (mainContent) {
                    mainContent.classList.add('expanded');
                }
                
                const toggleBtn = document.querySelector('.sidebar-toggle');
                if (toggleBtn) {
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-bars';
                    }
                }
            }
        });
    });
}

// ============================================
// 14. تهيئة الصفحة عند التحميل
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();

    initLayout();

    switch(currentPage) {
        case 'index.html':
        case '':
            initLoginPage();
            break;
        case 'admin.html':
            initAdminDashboard();
            break;
        case 'student.html': 
            initStudentDashboard();
            break;
        case 'parent.html': 
            initParentDashboard();
            break;
        case 'teacher.html':  
            initTeacherDashboard();
            break;
        case 'specialist.html':  
            initSpecialistDashboard();
            break;
    }
    
    setCurrentDate();
});