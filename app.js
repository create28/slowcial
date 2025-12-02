// ===================================
// State Management
// ===================================
const state = {
    photos: [],
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
    resetFilter: document.getElementById('resetFilter')
};

// ===================================
// Initialization
// ===================================
function init() {
    loadFromLocalStorage();
    setupEventListeners();
    renderGrid();
    updateEmptyState();
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

function processFiles(files) {
    elements.uploadZone.classList.add('uploading');
    
    files.forEach(file => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const photo = {
                    id: Date.now() + Math.random(),
                    src: e.target.result,
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height,
                    filter: { ...state.filterSettings }
                };
                
                state.photos.push(photo);
                saveToLocalStorage();
                renderGrid();
                updateEmptyState();
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    });
    
    setTimeout(() => {
        elements.uploadZone.classList.remove('uploading');
    }, 500);
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
    
    // Determine size class based on aspect ratio
    const sizeClass = getItemSizeClass(photo.aspectRatio);
    if (sizeClass) {
        item.classList.add(sizeClass);
    }
    
    // Create image
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = 'Photo';
    
    // Create filter overlay
    const filter = document.createElement('div');
    filter.className = 'item-filter';
    updateFilterStyle(filter, photo.filter);
    
    // Create overlay with actions
    const overlay = document.createElement('div');
    overlay.className = 'item-overlay';
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4H14M6 4V2H10V4M12 4V14H4V4H12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
    `;
    deleteBtn.title = 'Delete photo';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePhoto(photo.id);
    });
    
    actions.appendChild(deleteBtn);
    overlay.appendChild(actions);
    
    item.appendChild(img);
    item.appendChild(filter);
    item.appendChild(overlay);
    
    return item;
}

function getItemSizeClass(aspectRatio) {
    // Wide photos (landscape): aspect ratio > 1.5
    if (aspectRatio > 1.5) {
        return 'wide';
    }
    // Tall photos (portrait): aspect ratio < 0.7
    else if (aspectRatio < 0.7) {
        return 'tall';
    }
    // Square-ish photos: no special class
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
    state.photos.forEach(photo => {
        photo.filter = { ...state.filterSettings };
    });
    
    saveToLocalStorage();
    renderGrid();
    showNotification('Filter applied to all photos');
}

function resetFilter() {
    state.filterSettings = {
        color: '#667eea',
        opacity: 30,
        blendMode: 'multiply'
    };
    
    elements.filterColor.value = state.filterSettings.color;
    elements.filterOpacity.value = state.filterSettings.opacity;
    elements.blendMode.value = state.filterSettings.blendMode;
    elements.opacityValue.textContent = `${state.filterSettings.opacity}%`;
    elements.colorValue.textContent = state.filterSettings.color;
    
    showNotification('Filter reset to default');
}

// ===================================
// Photo Management
// ===================================
function deletePhoto(id) {
    state.photos = state.photos.filter(photo => photo.id !== id);
    saveToLocalStorage();
    renderGrid();
    updateEmptyState();
    showNotification('Photo deleted');
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
    // Create notification element
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
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===================================
// Local Storage
// ===================================
function saveToLocalStorage() {
    try {
        localStorage.setItem('friendsta-photos', JSON.stringify(state.photos));
        localStorage.setItem('friendsta-filter', JSON.stringify(state.filterSettings));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const photos = localStorage.getItem('friendsta-photos');
        const filter = localStorage.getItem('friendsta-filter');
        
        if (photos) {
            state.photos = JSON.parse(photos);
        }
        
        if (filter) {
            state.filterSettings = JSON.parse(filter);
            elements.filterColor.value = state.filterSettings.color;
            elements.filterOpacity.value = state.filterSettings.opacity;
            elements.blendMode.value = state.filterSettings.blendMode;
            elements.opacityValue.textContent = `${state.filterSettings.opacity}%`;
            elements.colorValue.textContent = state.filterSettings.color;
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
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
// Initialize App
// ===================================
document.addEventListener('DOMContentLoaded', init);
