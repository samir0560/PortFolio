// API Configuration
const API_BASE = window.location.origin + '/api';
const FALLBACK_DATA = {
    settings: {
        siteTitle: 'Professional Developer',
        siteDescription: 'Full Stack Developer & UI/UX Designer',
        aboutName: 'Professional Developer',
        aboutDescription: 'I\'m a passionate developer creating amazing digital experiences...',
        contactLocation: 'Your Location',
        contactEmail: 'your.email@example.com',
        contactPhone: '+1 (123) 456-7890',
        socialLinks: {
            github: '#',
            linkedin: '#',
            twitter: '#',
            dribbble: '#'
        }
    },
    projects: [],
    skills: [],
    sites: []
};

// Enhanced Toast System
function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.querySelector('.toast-container').appendChild(toast);
    
    // Show toast
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Hide toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Enhanced API call function
async function apiCall(endpoint, options = {}) {
    const sessionId = localStorage.getItem('adminToken');
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(sessionId && { 'Authorization': sessionId })
        },
        ...options
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Portfolio Data Loading
async function loadPortfolioData() {
    try {
        // Track visitor first
        trackVisitor().catch(err => console.log('Visitor tracking failed:', err));
        
        // Load portfolio data
        const data = await apiCall('/portfolio-data');
        
        if (data.success && data.data) {
            const { settings, projects, skills, sites, analytics } = data.data;
            
            // Update all sections
            updateHeroSection(settings, projects, skills, analytics);
            updateAboutSection(settings);
            updateSkillsSection(skills);
            updateProjectsSection(projects);
            updateSitesSection(sites);
            updateContactSection(settings);
            updateFooterSection(settings);
            
            // Cache data
            localStorage.setItem('portfolioCache', JSON.stringify({
                data: data.data,
                timestamp: Date.now()
            }));
            
            return data.data;
        } else {
            throw new Error('Invalid data structure received');
        }
        
    } catch (error) {
        console.error('Failed to load portfolio data:', error);
        loadCachedData();
        showToast('Loading cached data due to connection issues', 'warning');
        throw error;
    }
}

// Load cached data as fallback
function loadCachedData() {
    try {
        const cached = localStorage.getItem('portfolioCache');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000; // 24 hours
            
            if (isRecent) {
                const { settings, projects, skills, sites, analytics } = data;
                updateHeroSection(settings, projects, skills, analytics);
                updateAboutSection(settings);
                updateSkillsSection(skills);
                updateProjectsSection(projects);
                updateSitesSection(sites);
                updateContactSection(settings);
                updateFooterSection(settings);
                return;
            }
        }
    } catch (error) {
        console.error('Error loading cached data:', error);
    }
    
    // Load fallback data
    loadFallbackData();
}

function loadFallbackData() {
    const { settings, projects, skills, sites } = FALLBACK_DATA;
    updateHeroSection(settings, projects, skills, {});
    updateAboutSection(settings);
    updateSkillsSection(skills);
    updateProjectsSection(projects);
    updateSitesSection(sites);
    updateContactSection(settings);
    updateFooterSection(settings);
}

// Section Update Functions
function updateHeroSection(settings, projects, skills, analytics) {
    const elements = {
        heroName: document.getElementById('heroName'),
        heroTitle: document.getElementById('heroTitle'),
        heroDescription: document.getElementById('heroDescription'),
        totalProjects: document.getElementById('totalProjects'),
        totalSkills: document.getElementById('totalSkills'),
        totalVisitors: document.getElementById('totalVisitors'),
        heroImage: document.getElementById('heroImage')
    };
    
    if (elements.heroName) elements.heroName.textContent = settings.siteTitle || 'Professional Developer';
    if (elements.heroTitle) elements.heroTitle.textContent = settings.siteDescription || 'Full Stack Developer';
    if (elements.heroDescription) elements.heroDescription.textContent = settings.aboutDescription || 'Creating amazing digital experiences...';
    
    if (elements.totalProjects) elements.totalProjects.textContent = projects ? projects.length : 0;
    if (elements.totalSkills) elements.totalSkills.textContent = skills ? skills.length : 0;
    if (elements.totalVisitors) elements.totalVisitors.textContent = analytics?.totalVisitors || 0;
    
    if (elements.heroImage && settings.aboutImage) {
        elements.heroImage.src = settings.aboutImage;
        elements.heroImage.style.display = 'block';
        const placeholder = elements.heroImage.nextElementSibling;
        if (placeholder) placeholder.style.display = 'none';
    }
}

function updateAboutSection(settings) {
    const elements = {
        aboutName: document.getElementById('aboutName'),
        aboutDescription: document.getElementById('aboutDescription'),
        aboutImageMain: document.getElementById('aboutImageMain')
    };
    
    if (elements.aboutName) elements.aboutName.textContent = settings.aboutName || 'Professional Developer';
    if (elements.aboutDescription) elements.aboutDescription.textContent = settings.aboutDescription || 'About description...';
    
    if (elements.aboutImageMain && settings.aboutImage) {
        elements.aboutImageMain.src = settings.aboutImage;
        elements.aboutImageMain.style.display = 'block';
        const placeholder = elements.aboutImageMain.nextElementSibling;
        if (placeholder) placeholder.style.display = 'none';
    }
}

function updateSkillsSection(skills) {
    const container = document.getElementById('skillsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (skills && skills.length > 0) {
        // Auto-categorize skills based on name
        const categorizeSkill = (skillName) => {
            const name = skillName.toLowerCase();
            
            // Frontend technologies
            const frontend = ['html', 'css', 'javascript', 'js', 'react', 'vue', 'angular', 'next', 'nextjs', 'svelte', 'tailwind', 'bootstrap', 'sass', 'scss', 'typescript', 'ts', 'jquery', 'redux', 'webpack', 'vite'];
            
            // Backend technologies
            const backend = ['node', 'nodejs', 'express', 'mongodb', 'mysql', 'postgresql', 'sql', 'python', 'django', 'flask', 'php', 'laravel', 'java', 'spring', 'ruby', 'rails', 'go', 'rust', 'c#', 'asp.net', 'firebase', 'graphql', 'rest', 'api'];
            
            // DevOps & Tools
            const devops = ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'github', 'gitlab', 'jenkins', 'ci/cd', 'nginx', 'apache', 'linux', 'bash'];
            
            // Design & UI/UX
            const design = ['figma', 'photoshop', 'illustrator', 'xd', 'sketch', 'ui', 'ux', 'design'];
            
            // Mobile Development
            const mobile = ['react native', 'flutter', 'android', 'ios', 'swift', 'kotlin', 'xamarin'];
            
            // Check which category the skill belongs to
            if (frontend.some(tech => name.includes(tech))) return 'Frontend';
            if (backend.some(tech => name.includes(tech))) return 'Backend';
            if (devops.some(tech => name.includes(tech))) return 'DevOps';
            if (design.some(tech => name.includes(tech))) return 'Design';
            if (mobile.some(tech => name.includes(tech))) return 'Mobile';
            
            return 'Other';
        };
        
        // Create skills grid with 4 cards per row
        const skillsGrid = document.createElement('div');
        skillsGrid.className = 'skills-grid';
        
        skills.forEach((skill, index) => {
            // Determine category: use provided category or auto-detect
            const category = skill.category || categorizeSkill(skill.name);
            
            const skillCard = document.createElement('div');
            skillCard.className = 'skill-card';
            skillCard.style.setProperty('--index', index);
            skillCard.innerHTML = `
                <div class="skill-icon">
                    <i class="${skill.icon || 'fas fa-code'}"></i>
                </div>
                <h3 class="skill-name">${skill.name}</h3>
                ${skill.description ? `<p class="skill-description">${skill.description}</p>` : ''}
                <span class="skill-category">${category}</span>
            `;
            skillsGrid.appendChild(skillCard);
        });
        
        container.appendChild(skillsGrid);
    } else {
        container.innerHTML = '<div class="no-data"><i class="fas fa-code"></i><p>No skills added yet.</p></div>';
    }
}

function updateProjectsSection(projects) {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (projects && projects.length > 0) {
        // Show only 4 projects on homepage
        const featuredProjects = projects.slice(0, 3);
        
        featuredProjects.forEach((project, index) => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card';
            projectCard.setAttribute('data-category', project.category || 'other');
            projectCard.style.setProperty('--index', index + 1);
            
            // Handle technologies - display simple strings without brackets
            const technologies = project.technologies ? project.technologies.map(tech => {
                const techName = typeof tech === 'string' ? tech : (tech.name || tech);
                return `<span class="tech-tag">${techName}</span>`;
            }).join('') : '';
            
            projectCard.innerHTML = `
                <div class="project-image">
                    <img src="${project.image}" alt="${project.title}" 
                         onerror="this.src='https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'">
                    <div class="project-overlay">
                        <div class="project-actions">
                            ${project.liveUrl ? `<a href="${project.liveUrl}" target="_blank" class="action-btn live-demo-btn" title="Live Demo"><i class="fas fa-external-link-alt"></i><span>Live Demo</span></a>` : ''}
                            ${project.githubUrl ? `<a href="${project.githubUrl}" target="_blank" class="action-btn view-code-btn" title="View Code"><i class="fab fa-github"></i><span>View Code</span></a>` : ''}
                        </div>
                    </div>
                </div>
                <div class="project-content">
                    <div class="project-header">
                        <h3>${project.title}</h3>
                        <span class="project-category">${project.category || 'Other'}</span>
                    </div>
                    <p class="project-description">${project.description.length > 120 ? project.description.substring(0, 120) + '...' : project.description}</p>
                    <div class="project-skills">
                        <h4><i class="fas fa-tools"></i> Technologies Used</h4>
                        <div class="project-technologies">
                            ${technologies}
                        </div>
                    </div>
                    <div class="project-links">
                        ${project.liveUrl ? `<a href="${project.liveUrl}" target="_blank" class="project-link live-link"><i class="fas fa-globe"></i> Live Demo</a>` : ''}
                        ${project.githubUrl ? `<a href="${project.githubUrl}" target="_blank" class="project-link code-link"><i class="fab fa-github"></i> Source Code</a>` : ''}
                    </div>
                </div>
            `;
            container.appendChild(projectCard);
        });
    } else {
        container.innerHTML = '<div class="no-data"><i class="fas fa-folder-open"></i><p>No projects added yet.</p></div>';
    }
}

function updateSitesSection(sites) {
    const container = document.getElementById('sitesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (sites && sites.length > 0) {
        sites.forEach(site => {
            const siteCard = document.createElement('div');
            siteCard.className = 'site-card';
            siteCard.innerHTML = `
                <h3>${site.name}</h3>
                <p>${site.description || 'Visit my profile'}</p>
                <a href="${site.url}" target="_blank" class="site-link">
                    Visit Site <i class="fas fa-arrow-right"></i>
                </a>
            `;
            container.appendChild(siteCard);
        });
    } else {
        container.innerHTML = '<div class="no-data"><i class="fas fa-globe"></i><p>No sites added yet.</p></div>';
    }
}

function updateContactSection(settings) {
    const elements = {
        contactLocation: document.getElementById('contactLocation'),
        contactEmail: document.getElementById('contactEmail'),
        contactPhone: document.getElementById('contactPhone')
    };
    
    if (elements.contactLocation) elements.contactLocation.textContent = settings.contactLocation || 'Your Location';
    if (elements.contactEmail) elements.contactEmail.textContent = settings.contactEmail || 'your.email@example.com';
    if (elements.contactPhone) elements.contactPhone.textContent = settings.contactPhone || '+1 (123) 456-7890';
}

function updateFooterSection(settings) {
    const elements = {
        footerName: document.getElementById('footerName'),
        footerDescription: document.getElementById('footerDescription'),
        copyrightName: document.getElementById('copyrightName')
    };
    
    if (elements.footerName) elements.footerName.textContent = settings.aboutName || 'Professional Developer';
    if (elements.footerDescription) elements.footerDescription.textContent = settings.footerDescription || 'Creating amazing digital experiences...';
    if (elements.copyrightName) elements.copyrightName.textContent = settings.copyrightName || settings.aboutName || 'Professional Developer';
    
    // Update social links
    if (settings.socialLinks) {
        updateSocialLink('socialGithub', settings.socialLinks.github);
        updateSocialLink('socialLinkedin', settings.socialLinks.linkedin);
        updateSocialLink('socialTwitter', settings.socialLinks.twitter);
        updateSocialLink('socialDribbble', settings.socialLinks.dribbble);
    }
}

function updateSocialLink(elementId, url) {
    const element = document.getElementById(elementId);
    if (element) {
        if (url && url !== '#' && url !== '') {
            element.href = url;
            element.style.display = 'flex';
        } else {
            element.style.display = 'none';
        }
    }
}

// Utility Functions
async function trackVisitor() {
    try {
        const response = await fetch(`${API_BASE}/visitors/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Visitor tracked! Count: ${data.count}`);
        } else {
            console.error('❌ Failed to track visitor:', data.error);
        }
    } catch (error) {
        console.error('❌ Failed to track visitor:', error);
    }
}

// Contact form submission
async function submitContactForm(formData) {
    try {
        const response = await fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
}

// Project filtering
function filterProjects(filter) {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Initialize application
function initializeApp() {
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize forms
    initializeForms();
    
    // Initialize time
    initializeLiveTime();
    
    // Initialize theme toggle
    initializeThemeToggle();
    
    // Initialize scroll effects
    initializeScrollEffects();
    
    // Initialize project filters
    initializeProjectFilters();
    
    // Initialize real-time updates
    initializeRealTimeUpdates();
    
    // Load portfolio data
    loadPortfolioData();
}

// Real-time updates listener
function initializeRealTimeUpdates() {
    // Listen for messages from admin dashboard
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'dataUpdate') {
            console.log('Received real-time update:', event.data.dataType);
            loadPortfolioData();
        }
    });
    
    // Listen for localStorage updates (cross-tab communication)
    window.addEventListener('storage', (event) => {
        if (event.key === 'dataUpdate') {
            console.log('Storage update detected, refreshing data');
            loadPortfolioData();
        }
    });
}

function initializeNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
    
    // Close menu when clicking on links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
        });
    });
    
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initializeForms() {
    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                submitBtn.disabled = true;
                
                await submitContactForm(formData);
                showToast('Thank you for your message! I will get back to you soon.', 'success');
                contactForm.reset();
            } catch (error) {
                showToast('There was an error sending your message. Please try again.', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

function initializeLiveTime() {
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        });
        const timeElement = document.getElementById('liveTime');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
    
    updateTime();
    setInterval(updateTime, 1000);
}

function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle?.querySelector('i');
    const loadingScreen = document.getElementById('loadingScreen');
    
    if (themeToggle && icon) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            
            // Update loading screen theme
            if (loadingScreen) {
                if (document.body.classList.contains('dark-theme')) {
                    loadingScreen.classList.add('dark-theme');
                } else {
                    loadingScreen.classList.remove('dark-theme');
                }
            }
            
            if (document.body.classList.contains('dark-theme')) {
                icon.className = 'fas fa-sun';
                localStorage.setItem('theme', 'dark');
            } else {
                icon.className = 'fas fa-moon';
                localStorage.setItem('theme', 'light');
            }
        });
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            if (loadingScreen) {
                loadingScreen.classList.add('dark-theme');
            }
            icon.className = 'fas fa-sun';
        }
    }
}

function initializeScrollEffects() {
    const backToTop = document.getElementById('backToTop');
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', () => {
        // Back to top button
        if (backToTop) {
            if (window.pageYOffset > 300) {
                backToTop.style.display = 'flex';
            } else {
                backToTop.style.display = 'none';
            }
        }
        
        // Header background on scroll - maintain glassmorphism effect
        if (header) {
            if (window.pageYOffset > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });
    
    // Back to top click
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

function initializeProjectFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter projects
            const filter = btn.getAttribute('data-filter');
            filterProjects(filter);
        });
    });
}


// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Real-time updates listener
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'dataUpdate') {
        // Refresh portfolio data when admin makes changes
        loadPortfolioData().catch(console.error);
    } else if (event.data && event.data.type === 'technologyUpdate') {
        // Handle real-time technology updates
        console.log('Technology update received:', event.data.technologies);
        // Refresh projects section to show updated technologies
        loadPortfolioData().catch(console.error);
    }
});

// Listen for localStorage changes (cross-tab communication)
window.addEventListener('storage', (event) => {
    if (event.key === 'dataUpdate') {
        loadPortfolioData().catch(console.error);
    } else if (event.key === 'technologyUpdate') {
        loadPortfolioData().catch(console.error);
    }
});

// Export functions for global access
window.showToast = showToast;
window.loadPortfolioData = loadPortfolioData;
window.trackVisitor = trackVisitor;