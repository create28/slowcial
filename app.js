// ===================================
// State Management
// ===================================
const state = {
    photos: [],
    currentEditingPhoto: null,
    filterSettings: {
        color: '#667eea',
        opacity: 30,
        opacity: 30,
        blendMode: 'multiply'
    },
    isSignup: false
};

// ===================================
// DOM Elements
// ===================================
// ===================================
// DOM Elements
// ===================================
const elements = {
    // ... (existing elements) ...
    uploadSection: document.getElementById('uploadSection'), // Wrapper for upload zone
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    photoGrid: document.getElementById('photoGrid'),
    emptyState: document.getElementById('emptyState'),
    // ... (filter elements) ...
    filterPanel: document.getElementById('filterPanel'),
    filterToggle: document.getElementById('filterToggle'),
    filterColor: document.getElementById('filterColor'),
    filterOpacity: document.getElementById('filterOpacity'),
    blendMode: document.getElementById('blendMode'),
    opacityValue: document.getElementById('opacityValue'),
    colorValue: document.querySelector('.color-value'),
    applyFilter: document.getElementById('applyFilter'),
    resetFilter: document.getElementById('resetFilter'),
    // ... (lightbox elements) ...
    lightbox: document.getElementById('lightbox'),
    lightboxImage: document.getElementById('lightboxImage'),
    lightboxCaption: document.getElementById('lightboxCaption'),
    lightboxClose: document.getElementById('lightboxClose'),
    // ... (edit modal elements) ...
    editModal: document.getElementById('editModal'),
    editModalClose: document.getElementById('editModalClose'),
    editCaptionInput: document.getElementById('editCaptionInput'),
    editDateInput: document.getElementById('editDateInput'),
    editShutterInput: document.getElementById('editShutterInput'),
    editApertureInput: document.getElementById('editApertureInput'),
    editIsoInput: document.getElementById('editIsoInput'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveEditBtn: document.getElementById('saveEditBtn'),
    // Auth Elements
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    loginModal: document.getElementById('loginModal'),
    loginModalClose: document.getElementById('loginModalClose'),
    emailInput: document.getElementById('emailInput'),
    passwordInput: document.getElementById('passwordInput'),
    submitLoginBtn: document.getElementById('submitLoginBtn'),
    loginError: document.getElementById('loginError'),
    loginError: document.getElementById('loginError'),
    lightboxMetadata: document.getElementById('lightboxMetadata'),
    // Signup Elements
    modalTitle: document.getElementById('modalTitle'),
    signupFields: document.getElementById('signupFields'),
    fullNameInput: document.getElementById('fullNameInput'),
    usernameInput: document.getElementById('usernameInput'),
    authToggleText: document.getElementById('authToggleText'),
    authToggleBtn: document.getElementById('authToggleBtn')
};

// ===================================
// Initialization
// ===================================
async function init() {
    loadFilterSettings();
    setupEventListeners();

    // Check initial auth state
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session);

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
        updateAuthUI(session);
    });

    await fetchPhotos();
}

// ===================================
// Auth Logic
// ===================================
function updateAuthUI(session) {
    const isAdmin = !!session;

    // Header controls
    // Header controls
    if (isAdmin) {
        elements.loginBtn.classList.add('hidden');
        elements.logoutBtn.classList.remove('hidden');
        elements.uploadSection.style.display = 'block'; // Keep this as block since it has specific layout styles
    } else {
        elements.loginBtn.classList.remove('hidden');
        elements.logoutBtn.classList.add('hidden');
        elements.uploadSection.style.display = 'none';
    }

    // Update grid items (show/hide edit/delete buttons)
    // We re-render the grid to apply the correct visibility to buttons
    renderGrid(isAdmin);
}

const email = elements.emailInput.value;
const password = elements.passwordInput.value;

elements.loginError.style.display = 'none';
elements.submitLoginBtn.disabled = true;
elements.submitLoginBtn.textContent = state.isSignup ? 'Creating Account...' : 'Signing in...';

let result;

if (state.isSignup) {
    const fullName = elements.fullNameInput.value;
    const username = elements.usernameInput.value;

    if (!fullName || !username) {
        elements.loginError.textContent = 'Please fill in all fields';
        elements.loginError.style.display = 'block';
        elements.submitLoginBtn.disabled = false;
        elements.submitLoginBtn.textContent = 'Sign Up';
        return;
    }

    result = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                username: username
            }
        }
    });
} else {
    result = await supabase.auth.signInWithPassword({
        email,
        password
    });
}

const { data, error } = result;

if (error) {
    elements.loginError.textContent = error.message;
    elements.loginError.style.display = 'block';
    elements.submitLoginBtn.textContent = state.isSignup ? 'Sign Up' : 'Sign In';
    elements.submitLoginBtn.disabled = false;
} else {
    if (state.isSignup && data?.user && !data?.session) {
        // Email confirmation required case (if enabled) but assuming auto-confirm for now or let user know
        elements.loginError.textContent = 'Please check your email to confirm your account.';
        elements.loginError.style.color = '#4ade80'; // Green
        elements.loginError.style.display = 'block';
        elements.submitLoginBtn.textContent = 'Sign Up';
        elements.submitLoginBtn.disabled = false;
        // Don't close modal if confirmation needed
    } else {
        // Success
        elements.emailInput.value = '';
        elements.passwordInput.value = '';
        elements.fullNameInput.value = '';
        elements.usernameInput.value = '';

        elements.submitLoginBtn.textContent = state.isSignup ? 'Sign Up' : 'Sign In';
        elements.submitLoginBtn.disabled = false;
        elements.loginModal.classList.remove('active');

        showNotification(state.isSignup ? 'Account created successfully!' : 'Signed in successfully');
    }
}
}

function toggleAuthMode(e) {
    if (e) e.preventDefault();
    state.isSignup = !state.isSignup;

    if (state.isSignup) {
        elements.modalTitle.textContent = 'Create Account';
        elements.signupFields.classList.remove('hidden');
        elements.submitLoginBtn.textContent = 'Sign Up';
        elements.authToggleText.textContent = 'Already have an account?';
        elements.authToggleBtn.textContent = 'Sign In';
    } else {
        elements.modalTitle.textContent = 'Login';
        elements.signupFields.classList.add('hidden');
        elements.submitLoginBtn.textContent = 'Sign In';
        elements.authToggleText.textContent = 'New to Friendsta?';
        elements.authToggleBtn.textContent = 'Sign Up';
    }

    elements.loginError.style.display = 'none';
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
}

// ===================================
// Event Listeners
// ===================================
function setupEventListeners() {
    // ... (existing listeners) ...
    // Upload zone interactions
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);

    // Filter panel toggle
    elements.filterToggle.addEventListener('click', toggleFilterPanel);

    // Filter controls
    elements.filterColor.addEventListener('input', handleColorChange);
    elements.filterOpacity.addEventListener('input', handleOpacityChange);
    elements.blendMode.addEventListener('change', handleBlendModeChange);
    elements.applyFilter.addEventListener('click', applyFilterToAll);
    elements.resetFilter.addEventListener('click', resetFilter);

    // Lightbox
    elements.lightboxClose.addEventListener('click', closeLightbox);
    elements.lightbox.addEventListener('click', (e) => {
        if (e.target === elements.lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.lightbox.classList.contains('active')) closeLightbox();
            if (elements.editModal.classList.contains('active')) closeEditModal();
            if (elements.loginModal.classList.contains('active')) elements.loginModal.classList.remove('active');
        }
    });

    // Edit Modal
    elements.editModalClose.addEventListener('click', closeEditModal);
    elements.cancelEditBtn.addEventListener('click', closeEditModal);
    elements.saveEditBtn.addEventListener('click', savePhotoDetails);
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) closeEditModal();
    });

    // Auth Events
    elements.loginBtn.addEventListener('click', () => elements.loginModal.classList.add('active'));
    elements.loginModalClose.addEventListener('click', () => elements.loginModal.classList.remove('active'));
    elements.loginModal.addEventListener('click', (e) => {
        if (e.target === elements.loginModal) elements.loginModal.classList.remove('active');
    });
    elements.submitLoginBtn.addEventListener('click', handleLogin);
    elements.authToggleBtn.addEventListener('click', toggleAuthMode);
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
}

// ... (rest of file) ...

// ===================================
// Grid Rendering
// ===================================
function renderGrid(isAdmin = false) {
    elements.photoGrid.innerHTML = '';

    state.photos.forEach(photo => {
        const gridItem = createGridItem(photo, isAdmin);
        elements.photoGrid.appendChild(gridItem);
    });
}

function createGridItem(photo, isAdmin) {
    const item = document.createElement('div');
    // ... (existing item creation) ...
    item.className = 'grid-item';
    item.dataset.id = photo.id;

    const sizeClass = getItemSizeClass(photo.aspect_ratio);
    if (sizeClass) {
        item.classList.add(sizeClass);
    }

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.caption || 'Photo';
    img.loading = 'lazy';

    const filter = document.createElement('div');
    filter.className = 'item-filter';
    updateFilterStyle(filter, state.filterSettings);

    if (photo.caption) {
        const caption = document.createElement('div');
        caption.className = 'grid-caption';
        caption.textContent = photo.caption;
        item.appendChild(caption);
    }

    // Metadata Badge (Hover)
    if (photo.shutter_speed || photo.aperture || photo.iso) {
        const metaBadge = document.createElement('div');
        metaBadge.className = 'grid-metadata-badge';
        const parts = [];
        if (photo.aperture) parts.push(photo.aperture);
        if (photo.shutter_speed) parts.push(photo.shutter_speed);
        if (photo.iso) parts.push(`ISO ${photo.iso}`);
        metaBadge.textContent = parts.join(' • ');
        // Append to item - will be positioned via CSS
        item.appendChild(metaBadge);
    }

    // Author Badge (Bottom Right or Top Left?)
    // Let's put it on top-left, move metadata to bottom-left? 
    // Or just put it above the caption.
    if (photo.profiles && photo.profiles.username) {
        const authorBadge = document.createElement('div');
        authorBadge.className = 'grid-author';
        authorBadge.textContent = `@${photo.profiles.username}`;
        item.appendChild(authorBadge);
    }

    // Only add overlay/actions if admin
    if (isAdmin) {
        const overlay = document.createElement('div');
        overlay.className = 'item-overlay';

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.06 1L15 4.94L12.56 7.38L8.62 3.44L11.06 1ZM1 11.06L7.56 4.5L11.5 8.44L4.94 15H1V11.06Z" fill="currentColor"/>
            </svg>
        `;
        editBtn.title = 'Edit details';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(photo);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4H14M6 4V2H10V4M12 4V14H4V4H12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
        `;
        deleteBtn.title = 'Delete photo';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePhoto(photo);
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        overlay.appendChild(actions);
        item.appendChild(overlay);
    }

    item.appendChild(img);
    item.appendChild(filter);

    item.addEventListener('click', () => openLightbox(photo));

    return item;
}

// ===================================
// File Upload Handling
// ===================================
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = ''; // Reset input
}

function handleDragOver(e) {
    e.preventDefault();
    elements.uploadZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
    );

    if (files.length > 0) {
        processFiles(files);
    }
}

async function processFiles(files) {
    elements.uploadZone.classList.add('uploading');

    for (const file of files) {
        try {
            const newPhoto = await uploadPhoto(file);
            // Prompt for caption immediately after upload
            if (newPhoto) {
                setTimeout(() => openEditModal(newPhoto), 500);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showNotification('Failed to upload ' + file.name);
        }
    }

    elements.uploadZone.classList.remove('uploading');
    await fetchPhotos();
}

async function uploadPhoto(file) {
    // 0. Extract EXIF data (before compression)
    let exifData = {
        date_taken: null,
        shutter_speed: null,
        aperture: null,
        iso: null
    };

    try {
        exifData = await extractExifData(file);
        console.log('Extracted EXIF:', exifData);
    } catch (e) {
        console.warn('Could not extract EXIF data:', e);
    }

    // 1. Compress image if needed
    const compressedFile = await compressImage(file);

    // 2. Upload image to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`;
    const { data: storageData, error: storageError } = await supabase.storage
        .from('photos')
        .upload(fileName, compressedFile);

    if (storageError) throw storageError;

    // 3. Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

    // 4. Get image dimensions
    const dimensions = await getImageDimensions(compressedFile);

    // 4. Get active user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in to upload photos');

    // 5. Insert record into Database
    const { data, error: dbError } = await supabase
        .from('photos')
        .insert({
            url: publicUrl,
            width: dimensions.width,
            height: dimensions.height,
            aspect_ratio: dimensions.width / dimensions.height,
            filter_settings: state.filterSettings,
            caption: null,
            user_id: session.user.id,
            ...exifData // Add extracted EXIF data
        })
        .select()
        .single();

    if (dbError) throw dbError;

    showNotification('Photo uploaded successfully');
    return data;
}

async function compressImage(file) {
    if (file.size <= 500 * 1024) return file;

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_DIMENSION = 2048;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const attemptCompression = (quality) => {
                canvas.toBlob((blob) => {
                    if (blob.size <= 500 * 1024 || quality <= 0.1) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                        attemptCompression(quality - 0.1);
                    }
                }, 'image/jpeg', quality);
            };

            attemptCompression(0.9);
        };
        img.src = URL.createObjectURL(file);
    });
}

function getImageDimensions(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.src = URL.createObjectURL(file);
    });
}

// ===================================
// Data Fetching
// ===================================
async function fetchPhotos() {
    // Join with profiles table to get username and avatar
    const { data, error } = await supabase
        .from('photos')
        .select(`
            *,
            profiles (
                username,
                avatar_url
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching photos:', error);
        return;
    }

    state.photos = data;
    renderGrid();
    updateEmptyState();
}

// ===================================
// Grid Rendering
// ===================================
function renderGrid(isAdmin = false) {
    elements.photoGrid.innerHTML = '';

    state.photos.forEach(photo => {
        const gridItem = createGridItem(photo, isAdmin);
        elements.photoGrid.appendChild(gridItem);
    });
}

function createGridItem(photo, isAdmin) {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.dataset.id = photo.id;

    const sizeClass = getItemSizeClass(photo.aspect_ratio);
    if (sizeClass) {
        item.classList.add(sizeClass);
    }

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.caption || 'Photo';
    img.loading = 'lazy';

    const filter = document.createElement('div');
    filter.className = 'item-filter';
    updateFilterStyle(filter, state.filterSettings);

    if (photo.caption) {
        const caption = document.createElement('div');
        caption.className = 'grid-caption';
        caption.textContent = photo.caption;
        item.appendChild(caption);
    }

    // Only add overlay/actions if admin
    if (isAdmin) {
        const overlay = document.createElement('div');
        overlay.className = 'item-overlay';

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.06 1L15 4.94L12.56 7.38L8.62 3.44L11.06 1ZM1 11.06L7.56 4.5L11.5 8.44L4.94 15H1V11.06Z" fill="currentColor"/>
            </svg>
        `;
        editBtn.title = 'Edit details';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(photo);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4H14M6 4V2H10V4M12 4V14H4V4H12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
        `;
        deleteBtn.title = 'Delete photo';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePhoto(photo);
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        overlay.appendChild(actions);
        item.appendChild(overlay);
    }

    item.appendChild(img);
    item.appendChild(filter);

    item.addEventListener('click', () => openLightbox(photo));

    return item;
}

function getItemSizeClass(aspectRatio) {
    if (aspectRatio > 1.5) return 'wide';
    if (aspectRatio < 0.7) return 'tall';
    return '';
}

function updateFilterStyle(element, filter) {
    const rgbaColor = hexToRgba(filter.color, filter.opacity / 100);
    element.style.backgroundColor = rgbaColor;
    element.style.mixBlendMode = filter.blendMode;
}

// ===================================
// Filter Management
// ===================================
function toggleFilterPanel() {
    elements.filterPanel.classList.toggle('active');
}

function handleColorChange(e) {
    state.filterSettings.color = e.target.value;
    elements.colorValue.textContent = e.target.value;
}

function handleOpacityChange(e) {
    state.filterSettings.opacity = parseInt(e.target.value);
    elements.opacityValue.textContent = `${e.target.value}%`;
}

function handleBlendModeChange(e) {
    state.filterSettings.blendMode = e.target.value;
}

function applyFilterToAll() {
    renderGrid();
    saveFilterSettings();
    showNotification('Filter applied to all photos');
}

function resetFilter() {
    state.filterSettings = {
        color: '#667eea',
        opacity: 30,
        blendMode: 'multiply'
    };

    updateFilterControls();
    saveFilterSettings();
    renderGrid();
    showNotification('Filter reset to default');
}

function updateFilterControls() {
    elements.filterColor.value = state.filterSettings.color;
    elements.filterOpacity.value = state.filterSettings.opacity;
    elements.blendMode.value = state.filterSettings.blendMode;
    elements.opacityValue.textContent = `${state.filterSettings.opacity}%`;
    elements.colorValue.textContent = state.filterSettings.color;
}

// ===================================
// Photo Management
// ===================================
async function deletePhoto(photo) {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
        const fileName = photo.url.split('/').pop();
        const { error: storageError } = await supabase.storage
            .from('photos')
            .remove([fileName]);

        if (storageError) console.error('Storage delete error:', storageError);

        const { error: dbError } = await supabase
            .from('photos')
            .delete()
            .eq('id', photo.id);

        if (dbError) throw dbError;

        showNotification('Photo deleted');
        await fetchPhotos();
    } catch (error) {
        console.error('Error deleting photo:', error);
        showNotification('Failed to delete photo');
    }
}

// ===================================
// UI Updates
// ===================================
function updateEmptyState() {
    if (state.photos.length === 0) {
        elements.emptyState.classList.add('visible');
        elements.photoGrid.style.display = 'none';
    } else {
        elements.emptyState.classList.remove('visible');
        elements.photoGrid.style.display = 'grid';
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        font-size: 0.875rem;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===================================
// Local Storage (Filters only)
// ===================================
function saveFilterSettings() {
    localStorage.setItem('friendsta-filter', JSON.stringify(state.filterSettings));
}

function loadFilterSettings() {
    const filter = localStorage.getItem('friendsta-filter');
    if (filter) {
        state.filterSettings = JSON.parse(filter);
        updateFilterControls();
    }
}

// ===================================
// Utility Functions
// ===================================
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function extractExifData(file) {
    return new Promise((resolve, reject) => {
        EXIF.getData(file, function () {
            try {
                // Date Taken
                const dateTaken = EXIF.getTag(this, "DateTimeOriginal");
                let isoDate = null;
                if (dateTaken) {
                    // Convert "2023:05:21 14:30:00" to ISO string
                    const parts = dateTaken.split(' ');
                    const dateParts = parts[0].split(':');
                    const timeParts = parts[1].split(':');
                    const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], timeParts[2]);
                    isoDate = d.toISOString();
                }

                // Shutter Speed (ExposureTime)
                const exposureTime = EXIF.getTag(this, "ExposureTime");
                let shutterSpeed = null;
                if (exposureTime) {
                    if (exposureTime < 1) {
                        shutterSpeed = `1/${Math.round(1 / exposureTime)}`;
                    } else {
                        shutterSpeed = `${exposureTime}`;
                    }
                }

                // Aperture (FNumber)
                const fNumber = EXIF.getTag(this, "FNumber");
                const aperture = fNumber ? `f/${fNumber}` : null;

                // ISO (ISOSpeedRatings)
                const iso = EXIF.getTag(this, "ISOSpeedRatings");

                resolve({
                    date_taken: isoDate,
                    shutter_speed: shutterSpeed,
                    aperture: aperture,
                    iso: iso ? iso.toString() : null
                });
            } catch (err) {
                reject(err);
            }
        });
    });
}

// ===================================
// Lightbox Logic
// ===================================
function openLightbox(photo) {
    elements.lightboxImage.src = photo.url;
    elements.lightboxCaption.textContent = photo.caption || '';
    elements.lightboxImage.style.backgroundColor = '';
    elements.lightboxImage.style.mixBlendMode = '';

    // Populate Metadata
    const metaParts = [];
    if (photo.date_taken) {
        const date = new Date(photo.date_taken);
        metaParts.push(date.toLocaleDateString());
    }
    if (photo.aperture) metaParts.push(photo.aperture);
    if (photo.shutter_speed) metaParts.push(photo.shutter_speed);
    if (photo.iso) metaParts.push(`ISO ${photo.iso}`);

    if (metaParts.length > 0) {
        elements.lightboxMetadata.textContent = metaParts.join(' • ');
        elements.lightboxMetadata.style.display = 'block';
    } else {
        elements.lightboxMetadata.style.display = 'none';
    }

    elements.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    elements.lightbox.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        elements.lightboxImage.src = '';
    }, 300);
}

// ===================================
// Edit Modal Logic
// ===================================
function openEditModal(photo) {
    state.currentEditingPhoto = photo;
    elements.editCaptionInput.value = photo.caption || '';

    if (photo.date_taken) {
        const date = new Date(photo.date_taken);
        const localIsoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        elements.editDateInput.value = localIsoString;
    } else {
        elements.editDateInput.value = '';
    }

    elements.editShutterInput.value = photo.shutter_speed || '';
    elements.editApertureInput.value = photo.aperture || '';
    elements.editIsoInput.value = photo.iso || '';

    elements.editModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    elements.editModal.classList.remove('active');
    document.body.style.overflow = '';
    state.currentEditingPhoto = null;
}

async function savePhotoDetails() {
    if (!state.currentEditingPhoto) return;

    const newCaption = elements.editCaptionInput.value.trim();
    const newDate = elements.editDateInput.value ? new Date(elements.editDateInput.value).toISOString() : null;
    const newShutter = elements.editShutterInput.value.trim();
    const newAperture = elements.editApertureInput.value.trim();
    const newIso = elements.editIsoInput.value.trim();

    const photoId = state.currentEditingPhoto.id;

    try {
        const { error } = await supabase
            .from('photos')
            .update({
                caption: newCaption || null,
                date_taken: newDate,
                shutter_speed: newShutter || null,
                aperture: newAperture || null,
                iso: newIso || null
            })
            .eq('id', photoId);

        if (error) throw error;

        const photoIndex = state.photos.findIndex(p => p.id === photoId);
        if (photoIndex !== -1) {
            state.photos[photoIndex].caption = newCaption || null;
            state.photos[photoIndex].date_taken = newDate;
            state.photos[photoIndex].shutter_speed = newShutter || null;
            state.photos[photoIndex].aperture = newAperture || null;
            state.photos[photoIndex].iso = newIso || null;
        }

        showNotification('Changes saved');
        closeEditModal();
        renderGrid();
    } catch (error) {
        console.error('Error saving details:', error);
        if (error.code === 'PGRST204') {
            showNotification('Error: Missing database columns. Please run update_schema_metadata.sql');
        } else {
            showNotification('Failed to save changes');
        }
    }
}

// ===================================
// Initialize App
// ===================================
document.addEventListener('DOMContentLoaded', init);
