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

// ... (init and event listeners remain the same) ...

async function processFiles(files) {
    elements.uploadZone.classList.add('uploading');

    for (const file of files) {
        try {
            const newPhoto = await uploadPhoto(file);
            // Prompt for caption immediately after upload
            if (newPhoto) {
                // We need to add it to state temporarily to edit it, 
                // but fetchPhotos will overwrite it anyway.
                // Let's just open the modal with the object we got back.
                // Wait a tiny bit for UI to settle
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
            caption: null, // Explicitly null
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

// ... (compressImage and getImageDimensions remain the same) ...

// ... (fetchPhotos, renderGrid, createGridItem, etc. remain the same) ...

// ===================================
// Edit Modal Logic
// ===================================
function openEditModal(photo) {
    state.currentEditingPhoto = photo;
    elements.editCaptionInput.value = photo.caption || '';

    // Populate metadata fields
    // Format date for datetime-local input (YYYY-MM-DDThh:mm)
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
    document.body.style.overflow = 'hidden'; // Prevent scrolling
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

        // Update the local state immediately
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
        renderGrid(); // Re-render to show updated details
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
