// ===================================
// State Management
// ===================================
const state = {
    photos: [],
    currentEditingPhoto: null,
    filterSettings: {
        color: '#667eea',
        opacity: 30,
        blendMode: 'multiply'
    }
};

// ===================================
// DOM Elements
// ===================================
const elements = {
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    photoGrid: document.getElementById('photoGrid'),
    emptyState: document.getElementById('emptyState'),
    filterPanel: document.getElementById('filterPanel'),
    filterToggle: document.getElementById('filterToggle'),
    filterColor: document.getElementById('filterColor'),
    filterOpacity: document.getElementById('filterOpacity'),
    blendMode: document.getElementById('blendMode'),
    opacityValue: document.getElementById('opacityValue'),
    colorValue: document.querySelector('.color-value'),
    applyFilter: document.getElementById('applyFilter'),
    resetFilter: document.getElementById('resetFilter'),
    lightbox: document.getElementById('lightbox'),
    lightboxImage: document.getElementById('lightboxImage'),
    lightboxCaption: document.getElementById('lightboxCaption'),
    lightboxClose: document.getElementById('lightboxClose'),
    // Edit Modal
    editModal: document.getElementById('editModal'),
    editModalClose: document.getElementById('editModalClose'),
    editCaptionInput: document.getElementById('editCaptionInput'),
    editDateInput: document.getElementById('editDateInput'),
    editShutterInput: document.getElementById('editShutterInput'),
    editApertureInput: document.getElementById('editApertureInput'),
    editIsoInput: document.getElementById('editIsoInput'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveEditBtn: document.getElementById('saveEditBtn')
};

// ===================================
// Initialization
// ===================================
async function init() {
    loadFilterSettings();
    setupEventListeners();
    await fetchPhotos();
}

// ===================================
// Event Listeners
// ===================================
function setupEventListeners() {
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
        }
    });

    // Edit Modal
    elements.editModalClose.addEventListener('click', closeEditModal);
    elements.cancelEditBtn.addEventListener('click', closeEditModal);
    elements.saveEditBtn.addEventListener('click', savePhotoDetails);
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) closeEditModal();
    });

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
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
            date_taken: null,
            shutter_speed: null,
            aperture: null,
            iso: null
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
    const { data, error } = await supabase
        .from('photos')
        .select('*')
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
function renderGrid() {
    elements.photoGrid.innerHTML = '';

    state.photos.forEach(photo => {
        const gridItem = createGridItem(photo);
        elements.photoGrid.appendChild(gridItem);
    });
}

function createGridItem(photo) {
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

    item.appendChild(img);
    item.appendChild(filter);
    item.appendChild(overlay);

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

// ===================================
// Lightbox Logic
// ===================================
function openLightbox(photo) {
    elements.lightboxImage.src = photo.url;
    elements.lightboxCaption.textContent = photo.caption || '';
    elements.lightboxImage.style.backgroundColor = '';
    elements.lightboxImage.style.mixBlendMode = '';
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
