// Admin-specific JavaScript

// DOM Elements
const adminDashboard = document.querySelector('.dashboard');
const logoutBtn = document.getElementById('logout-btn');
const projectsTable = document.getElementById('projects-table');
const sitesTable = document.getElementById('sites-table');
const skillsTable = document.getElementById('skills-table');
const recentActivity = document.getElementById('recent-activity');
const projectModal = document.getElementById('project-modal');
const siteModal = document.getElementById('site-modal');
const skillModal = document.getElementById('skill-modal');
const addProjectBtn = document.getElementById('add-project-btn');
const addSiteBtn = document.getElementById('add-site-btn');
const addSkillBtn = document.getElementById('add-skill-btn');
const projectForm = document.getElementById('project-form');
const siteForm = document.getElementById('site-form');
const skillForm = document.getElementById('skill-form');
const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
const dashboardSections = document.querySelectorAll('.dashboard-section');
const closeModalBtns = document.querySelectorAll('.close-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const imageUploadOptions = document.querySelectorAll('.upload-option');

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Function to make API calls
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': token })
        },
        ...options
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('adminToken');
    
    if (token) {
        adminDashboard.style.display = 'block';
        initializeAdminDashboard();
    } else {
        window.location.href = 'admin-login.html';
    }
    
    // Update current time
    function updateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            timeElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }
    
    updateTime();
    setInterval(updateTime, 1000);
});

// Initialize Admin Dashboard
async function initializeAdminDashboard() {
    try {
        await renderProjectsTable();
        await renderSitesTable();
        await renderSkillsTable();
        await renderRecentActivity();
        await updateDashboardStats();
        await loadSettings();
        initChart();
        
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Logout button
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = 'admin-login.html';
    });
    
    // Dashboard sidebar navigation
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const sectionId = link.getAttribute('data-section');
            dashboardSections.forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Add project button
    addProjectBtn.addEventListener('click', () => openProjectModal());
    
    // Add site button
    addSiteBtn.addEventListener('click', () => openSiteModal());
    
    // Add skill button
    addSkillBtn.addEventListener('click', () => openSkillModal());
    
    // Project form submission
    projectForm.addEventListener('submit', handleProjectSubmit);
    
    // Site form submission
    siteForm.addEventListener('submit', handleSiteSubmit);
    
    // Skill form submission
    skillForm.addEventListener('submit', handleSkillSubmit);
    
    // Close modal buttons
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === projectModal || e.target === siteModal || e.target === skillModal) {
            closeModal();
        }
    });
    
    // Image upload options
    imageUploadOptions.forEach(option => {
        option.addEventListener('click', () => {
            imageUploadOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            const optionType = option.getAttribute('data-option');
            if (optionType === 'url') {
                document.getElementById('image-url-container').style.display = 'block';
                document.getElementById('image-upload-container').style.display = 'none';
            } else {
                document.getElementById('image-url-container').style.display = 'none';
                document.getElementById('image-upload-container').style.display = 'block';
            }
        });
    });
    
    // Image upload preview
    const imageUploadInput = document.getElementById('project-image-upload');
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('image-preview');
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                }
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Toggle password visibility in settings
    const adminTogglePasswordIcon = document.getElementById('admin-toggle-password-icon');
    if (adminTogglePasswordIcon) {
        adminTogglePasswordIcon.addEventListener('click', function() {
            const passwordInput = document.getElementById('admin-password');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    }
    
    // Toggle current password visibility
    const currentTogglePasswordIcon = document.getElementById('current-toggle-password-icon');
    if (currentTogglePasswordIcon) {
        currentTogglePasswordIcon.addEventListener('click', function() {
            const passwordInput = document.getElementById('current-password');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    }
    
    // Toggle confirm password visibility
    const confirmTogglePasswordIcon = document.getElementById('confirm-toggle-password-icon');
    if (confirmTogglePasswordIcon) {
        confirmTogglePasswordIcon.addEventListener('click', function() {
            const passwordInput = document.getElementById('confirm-password');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    }
    
    // Change password button
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handleChangePassword);
    }
    
    // Save settings
    saveSettingsBtn.addEventListener('click', handleSaveSettings);
}

// Handle Project Form Submission
async function handleProjectSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('project-id').value;
    const title = document.getElementById('project-title').value;
    const category = document.getElementById('project-category').value;
    const description = document.getElementById('project-description').value;
    
    // Handle image source (URL or upload)
    let imageFile = null;
    let imageUrl = '';
    
    const imageUrlOption = document.getElementById('image-url');
    if (imageUrlOption.checked) {
        imageUrl = document.getElementById('project-image').value;
    } else {
        imageFile = document.getElementById('project-image-upload').files[0];
        if (!imageFile) {
            showToast('Please select an image file', 'error');
            return;
        }
    }
    
    const tags = document.getElementById('project-tags').value.split(',').map(tag => tag.trim());
    const liveUrl = document.getElementById('project-live').value;
    const githubUrl = document.getElementById('project-github').value;
    
    const projectData = {
        title,
        category,
        description,
        tags,
        liveUrl,
        githubUrl,
        ...(imageUrl && { imageUrl })
    };
    
    try {
        if (id) {
            // Update existing project
            await saveProject({ ...projectData, id }, imageFile);
            showToast('Project updated successfully', 'success');
        } else {
            // Add new project
            await saveProject(projectData, imageFile);
            showToast('Project added successfully', 'success');
        }
        
        await renderProjectsTable();
        await renderRecentActivity();
        await updateDashboardStats();
        
        // Auto-refresh dashboard data
        setTimeout(async () => {
            await renderProjectsTable();
            await updateDashboardStats();
        }, 1000);
        
        closeModal();
    } catch (error) {
        console.error('Error saving project:', error);
        showToast('Failed to save project', 'error');
    }
}

// Handle Site Form Submission
async function handleSiteSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('site-id').value;
    const name = document.getElementById('site-name').value;
    const url = document.getElementById('site-url').value;
    
    const siteData = { name, url };
    
    try {
        if (id) {
            // Update existing site
            await saveSite({ ...siteData, id });
            showToast('Site updated successfully', 'success');
        } else {
            // Add new site
            await saveSite(siteData);
            showToast('Site added successfully', 'success');
        }
        
        await renderSitesTable();
        await renderRecentActivity();
        await updateDashboardStats();
        
        // Auto-refresh dashboard data
        setTimeout(async () => {
            await renderSitesTable();
            await updateDashboardStats();
        }, 1000);
        
        // Broadcast site update to main website
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'dataUpdate' }, '*');
        }
        
        closeModal();
    } catch (error) {
        console.error('Error saving site:', error);
        showToast('Failed to save site', 'error');
    }
}

// Handle Skill Form Submission
async function handleSkillSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('skill-id').value;
    const name = document.getElementById('skill-name').value;
    const icon = document.getElementById('skill-icon').value;
    const description = document.getElementById('skill-description').value;
    
    const skillData = { name, icon, description };
    
    try {
        if (id) {
            // Update existing skill
            await saveSkill({ ...skillData, id });
            showToast('Skill updated successfully', 'success');
        } else {
            // Add new skill
            await saveSkill(skillData);
            showToast('Skill added successfully', 'success');
        }
        
        await renderSkillsTable();
        await renderRecentActivity();
        await updateDashboardStats();
        
        // Auto-refresh dashboard data
        setTimeout(async () => {
            await renderSkillsTable();
            await updateDashboardStats();
        }, 1000);
        
        closeModal();
    } catch (error) {
        console.error('Error saving skill:', error);
        showToast('Failed to save skill', 'error');
    }
}

// Handle Change Password
async function handleChangePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('admin-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    if (!currentPassword) {
        showToast('Please enter current password', 'error');
        return;
    }
    
    if (!newPassword) {
        showToast('Please enter new password', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('New password and confirm password do not match', 'error');
        return;
    }
    
    if (currentPassword === newPassword) {
        showToast('New password must be different from current password', 'error');
        return;
    }
    
    try {
        await changeAdminPassword(currentPassword, newPassword);
        showToast('Password changed successfully', 'success');
        
        // Clear password fields
        document.getElementById('current-password').value = '';
        document.getElementById('admin-password').value = '';
        document.getElementById('confirm-password').value = '';
        
        await renderRecentActivity();
    } catch (error) {
        console.error('Error changing password:', error);
        showToast(error.message || 'Failed to change password', 'error');
    }
}

// Handle Save Settings
async function handleSaveSettings() {
    try {
        // Get all settings values
        const settings = {
            siteTitle: document.getElementById('site-title').value,
            siteDescription: document.getElementById('site-description').value,
            aboutName: document.getElementById('about-name').value,
            aboutDescription: document.getElementById('about-description').value,
            contactLocation: document.getElementById('contact-location').value,
            contactEmail: document.getElementById('contact-email').value,
            contactPhone: document.getElementById('contact-phone').value,
            contactWebsite: document.getElementById('contact-website').value,
            footerTitle: document.getElementById('site-title').value, // Use site title as footer title
            footerDescription: document.getElementById('site-description').value, // Use site description as footer description
            copyrightName: document.getElementById('about-name').value, // Use about name as copyright name
            socialLinks: {
                github: document.getElementById('social-github').value,
                linkedin: document.getElementById('social-linkedin').value,
                twitter: document.getElementById('social-twitter').value,
                dribbble: document.getElementById('social-dribbble').value
            }
        };
        
        await updateSettings(settings);
        showToast('Settings saved successfully', 'success');
        await renderRecentActivity();
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Failed to save settings', 'error');
    }
}

// Render Projects Table
async function renderProjectsTable() {
    if (!projectsTable) return;
    
    try {
        const response = await apiCall('/projects');
        const projects = response.data || response; // Handle both response formats
        projectsTable.innerHTML = '';
        
        projects.forEach(project => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${project.title}</td>
                <td>${project.category.charAt(0).toUpperCase() + project.category.slice(1)}</td>
                <td>${new Date(project.createdAt).toLocaleDateString()}</td>
                <td class="action-buttons">
                    <button class="btn-edit" data-id="${project._id}">Edit</button>
                    <button class="btn-delete" data-id="${project._id}">Delete</button>
                </td>
            `;
            
            projectsTable.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('#projects-table .btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openProjectModal(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('#projects-table .btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteProject(btn.getAttribute('data-id')));
        });
    } catch (error) {
        console.error('Error rendering projects table:', error);
        projectsTable.innerHTML = '<tr><td colspan="4">Failed to load projects</td></tr>';
    }
}

// Render Sites Table
async function renderSitesTable() {
    if (!sitesTable) return;
    
    try {
        const response = await apiCall('/sites');
        const sites = response.data || response; // Handle both response formats
        sitesTable.innerHTML = '';
        
        sites.forEach(site => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${site.name}</td>
                <td><a href="${site.url}" target="_blank">${site.url}</a></td>
                <td class="action-buttons">
                    <button class="btn-edit" data-id="${site._id}">Edit</button>
                    <button class="btn-delete" data-id="${site._id}">Delete</button>
                </td>
            `;
            
            sitesTable.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('#sites-table .btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openSiteModal(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('#sites-table .btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteSite(btn.getAttribute('data-id')));
        });
    } catch (error) {
        console.error('Error rendering sites table:', error);
        sitesTable.innerHTML = '<tr><td colspan="3">Failed to load sites</td></tr>';
    }
}

// Render Skills Table
async function renderSkillsTable() {
    if (!skillsTable) return;
    
    try {
        const response = await apiCall('/skills');
        const skills = response.data || response; // Handle both response formats
        skillsTable.innerHTML = '';
        
        skills.forEach(skill => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${skill.name}</td>
                <td><i class="${skill.icon}"></i> ${skill.icon}</td>
                <td>${skill.description}</td>
                <td class="action-buttons">
                    <button class="btn-edit" data-id="${skill._id}">Edit</button>
                    <button class="btn-delete" data-id="${skill._id}">Delete</button>
                </td>
            `;
            
            skillsTable.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('#skills-table .btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openSkillModal(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('#skills-table .btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteSkill(btn.getAttribute('data-id')));
        });
    } catch (error) {
        console.error('Error rendering skills table:', error);
        skillsTable.innerHTML = '<tr><td colspan="4">Failed to load skills</td></tr>';
    }
}

// Render Recent Activity
async function renderRecentActivity() {
    if (!recentActivity) return;
    
    try {
        const activities = await apiCall('/activities');
        recentActivity.innerHTML = '';
        
        activities.forEach(activity => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${activity.date}</td>
                <td>${activity.activity}</td>
                <td>${activity.details}</td>
            `;
            
            recentActivity.appendChild(row);
        });
    } catch (error) {
        console.error('Error rendering recent activity:', error);
        recentActivity.innerHTML = '<tr><td colspan="3">Failed to load activities</td></tr>';
    }
}

// Open Project Modal
async function openProjectModal(id = null) {
    const modalTitle = document.getElementById('project-modal-title');
    const form = document.getElementById('project-form');
    
    // Reset image upload options
    document.getElementById('image-url').checked = true;
    document.getElementById('image-url-container').style.display = 'block';
    document.getElementById('image-upload-container').style.display = 'none';
    document.getElementById('image-preview').innerHTML = '';
    imageUploadOptions.forEach(opt => {
        if (opt.getAttribute('data-option') === 'url') {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
    
    if (id) {
        // Edit mode
        modalTitle.textContent = 'Edit Project';
        try {
            const project = await apiCall(`/projects/${id}`);
            
            document.getElementById('project-id').value = project._id;
            document.getElementById('project-title').value = project.title;
            document.getElementById('project-category').value = project.category;
            document.getElementById('project-description').value = project.description;
            document.getElementById('project-image').value = project.image;
            document.getElementById('project-tags').value = project.tags.join(', ');
            document.getElementById('technologies-container').innerHTML = project.technologies.map(tech => `<span class="badge">${tech}</span>`).join('');
            document.getElementById('project-live').value = project.liveUrl || '';
            document.getElementById('project-github').value = project.githubUrl || '';
        } catch (error) {
            console.error('Error loading project:', error);
            showToast('Failed to load project data', 'error');
            return;
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Project';
        form.reset();
        document.getElementById('project-id').value = '';
    }
    
    projectModal.style.display = 'flex';
}

// Open Site Modal
async function openSiteModal(id = null) {
    const modalTitle = document.getElementById('site-modal-title');
    const form = document.getElementById('site-form');
    
    if (id) {
        // Edit mode
        modalTitle.textContent = 'Edit Site';
        try {
            const response = await apiCall(`/sites/${id}`);
            const site = response.data || response; // Handle both response formats
            
            document.getElementById('site-id').value = site._id;
            document.getElementById('site-name').value = site.name;
            document.getElementById('site-url').value = site.url;
        } catch (error) {
            console.error('Error loading site:', error);
            showToast('Failed to load site data', 'error');
            return;
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Site';
        form.reset();
        document.getElementById('site-id').value = '';
    }
    
    siteModal.style.display = 'flex';
}

// Open Skill Modal
async function openSkillModal(id = null) {
    const modalTitle = document.getElementById('skill-modal-title');
    const form = document.getElementById('skill-form');
    
    if (id) {
        // Edit mode
        modalTitle.textContent = 'Edit Skill';
        try {
            const skill = await apiCall(`/skills/${id}`);
            
            document.getElementById('skill-id').value = skill._id;
            document.getElementById('skill-name').value = skill.name;
            document.getElementById('skill-icon').value = skill.icon;
            document.getElementById('skill-description').value = skill.description;
        } catch (error) {
            console.error('Error loading skill:', error);
            showToast('Failed to load skill data', 'error');
            return;
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Skill';
        form.reset();
        document.getElementById('skill-id').value = '';
    }
    
    skillModal.style.display = 'flex';
}

// Close Modal
function closeModal() {
    projectModal.style.display = 'none';
    siteModal.style.display = 'none';
    skillModal.style.display = 'none';
}

// Delete Project
async function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            await deleteProjectApi(id);
            showToast('Project deleted successfully', 'success');
            await renderProjectsTable();
            await renderRecentActivity();
            await updateDashboardStats();
        } catch (error) {
            console.error('Error deleting project:', error);
            showToast('Failed to delete project', 'error');
        }
    }
}

// Delete Skill
async function deleteSkill(id) {
    if (confirm('Are you sure you want to delete this skill?')) {
        try {
            await deleteSkillApi(id);
            showToast('Skill deleted successfully', 'success');
            await renderSkillsTable();
            await renderRecentActivity();
            await updateDashboardStats();
        } catch (error) {
            console.error('Error deleting skill:', error);
            showToast('Failed to delete skill', 'error');
        }
    }
}

// Delete Site
async function deleteSite(id) {
    if (confirm('Are you sure you want to delete this site?')) {
        try {
            await deleteSiteApi(id);
            showToast('Site deleted successfully', 'success');
            await renderSitesTable();
            await renderRecentActivity();
            await updateDashboardStats();
            
            // Broadcast site update to main website
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'dataUpdate' }, '*');
            }
        } catch (error) {
            console.error('Error deleting site:', error);
            showToast('Failed to delete site', 'error');
        }
    }
}

// Update Dashboard Stats
async function updateDashboardStats() {
    try {
        const stats = await getDashboardStats();
        
        const totalVisitorsElement = document.getElementById('total-visitors');
        if (totalVisitorsElement) {
            totalVisitorsElement.textContent = stats.totalVisitors.toLocaleString();
        }
        
        const uniqueVisitorsElement = document.getElementById('unique-visitors');
        if (uniqueVisitorsElement) {
            uniqueVisitorsElement.textContent = stats.uniqueVisitors.toLocaleString();
        }
        
        const totalProjectsElement = document.getElementById('total-projects');
        if (totalProjectsElement) {
            totalProjectsElement.textContent = stats.totalProjects;
        }
        
        const totalSitesElement = document.getElementById('total-sites');
        if (totalSitesElement) {
            totalSitesElement.textContent = stats.totalSites;
        }
        
        const pageViewsElement = document.getElementById('page-views');
        if (pageViewsElement) {
            pageViewsElement.textContent = Math.floor(stats.totalVisitors * 1.7).toLocaleString();
        }
        
        const totalMessagesElement = document.getElementById('total-messages');
        if (totalMessagesElement) {
            totalMessagesElement.textContent = stats.unreadMessages;
        }
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Initialize Chart
async function initChart() {
    const ctx = document.getElementById('visitorChart');
    if (!ctx) return;
    
    try {
        // Use sample data for the chart since we don't have a specific endpoint for visitor stats
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            last6Months.push(monthYear);
        }
        
        // Generate sample data
        const monthlyVisitors = last6Months.map(() => Math.floor(Math.random() * 500) + 200);
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last6Months,
                datasets: [{
                    label: 'Monthly Visitors',
                    data: monthlyVisitors,
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
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

// API Functions

// Save project (with file upload support)
async function saveProject(projectData, imageFile = null) {
    try {
        const formData = new FormData();
        
        // Append all project data to formData
        Object.keys(projectData).forEach(key => {
            if (key === 'tags' && Array.isArray(projectData[key])) {
                formData.append(key, projectData[key].join(','));
            } else if (key !== 'id' && key !== '_id') {
                formData.append(key, projectData[key]);
            }
        });
        
        // Append image file if provided
        if (imageFile) {
            formData.append('image', imageFile);
        } else if (projectData.imageUrl) {
            formData.append('imageUrl', projectData.imageUrl);
        }
        
        const endpoint = projectData.id ? `/projects/${projectData.id}` : '/projects';
        const method = projectData.id ? 'PUT' : 'POST';
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: method,
            headers: {
                'Authorization': localStorage.getItem('adminToken')
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to save project');
        }
        
        return data;
    } catch (error) {
        console.error('Failed to save project:', error);
        throw error;
    }
}

// Delete project
async function deleteProjectApi(projectId) {
    try {
        const response = await apiCall(`/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}

// Save site
async function saveSite(siteData) {
    try {
        const endpoint = siteData.id ? `/sites/${siteData.id}` : '/sites';
        const method = siteData.id ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, {
            method: method,
            body: JSON.stringify(siteData)
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}

// Delete site
async function deleteSiteApi(siteId) {
    try {
        const response = await apiCall(`/sites/${siteId}`, {
            method: 'DELETE'
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}

// Delete skill
async function deleteSkillApi(skillId) {
    try {
        const response = await apiCall(`/skills/${skillId}`, {
            method: 'DELETE'
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}

// Get dashboard statistics
async function getDashboardStats() {
    try {
        const response = await apiCall('/dashboard/stats');
        return response;
    } catch (error) {
        throw error;
    }
}

// Change admin password
async function changeAdminPassword(currentPassword, newPassword) {
    try {
        const response = await apiCall('/admin/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}

// Load settings
async function loadSettings() {
    try {
        const settings = await apiCall('/settings');
        
        // Populate form fields with current settings
        document.getElementById('site-title').value = settings.siteTitle || '';
        document.getElementById('site-description').value = settings.siteDescription || '';
        document.getElementById('about-name').value = settings.aboutName || '';
        document.getElementById('about-description').value = settings.aboutDescription || '';
        document.getElementById('contact-location').value = settings.contactLocation || '';
        document.getElementById('contact-email').value = settings.contactEmail || '';
        document.getElementById('contact-phone').value = settings.contactPhone || '';
        document.getElementById('contact-website').value = settings.contactWebsite || '';
        document.getElementById('social-github').value = settings.socialLinks?.github || '';
        document.getElementById('social-linkedin').value = settings.socialLinks?.linkedin || '';
        document.getElementById('social-twitter').value = settings.socialLinks?.twitter || '';
        document.getElementById('social-dribbble').value = settings.socialLinks?.dribbble || '';
        
        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        throw error;
    }
}

// Update settings
async function updateSettings(settings) {
    try {
        const response = await apiCall('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}

// Toast Message Function
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 4000);
}


