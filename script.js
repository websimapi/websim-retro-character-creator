const webcamVideo = document.getElementById('webcam-video');
const webcamCanvas = document.getElementById('webcam-canvas');
const imagePreview = document.getElementById('image-preview');
const previewPlaceholder = document.getElementById('preview-placeholder');
const startWebcamBtn = document.getElementById('start-webcam-btn');
const capturePhotoBtn = document.getElementById('capture-photo-btn');
const uploadBtn = document.getElementById('upload-btn');
const generateBtn = document.getElementById('generate-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const resultImage = document.getElementById('result-image');
const promptContainer = document.getElementById('prompt-container');
const promptText = document.getElementById('prompt-text');
const shareControls = document.getElementById('share-controls');
const includeOriginalCheckbox = document.getElementById('include-original-checkbox');
const shareBtn = document.getElementById('share-btn');

let imageDataUrl = null;

// --- Webcam Functions ---
startWebcamBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamVideo.srcObject = stream;
        webcamVideo.style.display = 'block';
        imagePreview.style.display = 'none';
        previewPlaceholder.style.display = 'none';
        startWebcamBtn.classList.add('hidden');
        capturePhotoBtn.classList.remove('hidden');
    } catch (err) {
        console.error("Error accessing webcam: ", err);
        alert("Could not access webcam. Please check permissions.");
    }
});

capturePhotoBtn.addEventListener('click', () => {
    webcamCanvas.width = webcamVideo.videoWidth;
    webcamCanvas.height = webcamVideo.videoHeight;
    const context = webcamCanvas.getContext('2d');
    context.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
    webcamCanvas.toBlob(async (blob) => {
        try {
            const file = new File([blob], 'webcam.png', { type: 'image/png' });
            const url = await websim.upload(file);
            imageDataUrl = url;
            originalPhotoUrl = url;
            updatePreview(url);
        } catch (e) {
            console.error(e);
            alert('Failed to capture/upload image.');
        }
    }, 'image/png');
    
    // Stop webcam
    webcamVideo.srcObject.getTracks().forEach(track => track.stop());
    webcamVideo.style.display = 'none';
    capturePhotoBtn.classList.add('hidden');
    startWebcamBtn.classList.remove('hidden');
});

// --- File Upload Function ---
uploadBtn.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const url = await websim.upload(file);
            imageDataUrl = url;
            originalPhotoUrl = url;
            updatePreview(URL.createObjectURL(file));
        } catch (e) {
            console.error(e);
            alert('Upload failed. Please try again.');
        }
    }
});

function updatePreview(dataUrl) {
    imagePreview.src = dataUrl;
    imagePreview.style.display = 'block';
    previewPlaceholder.style.display = 'none';
}

// --- Generation Function ---
generateBtn.addEventListener('click', async () => {
    if (!imageDataUrl) {
        alert("Please upload or capture a photo first!");
        return;
    }

    // Show loading state
    loadingIndicator.classList.remove('hidden');
    resultImage.style.display = 'none';
    promptContainer.classList.add('hidden');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    try {
        // Get user selections
        const bitStyle = document.getElementById('bit-style').value;
        const charClass = document.getElementById('char-class').value;
        const charRace = document.getElementById('char-race').value;
        const charArmor = document.getElementById('char-armor').value;

        // 1. AI call to analyze image and create a prompt
        const analysisCompletion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert prompt engineer for a pixel art AI generator. Your task is to analyze an image of a person and user-defined character traits to create a detailed, high-quality prompt.
                    
                    Analyze the user's photo to identify key features like gender expression (masculine, feminine), hair color, hairstyle, and notable features like glasses or facial hair.
                    
                    Combine these observations with the user's choices for style, race, class, and armor.
                    
                    Construct a single, cohesive prompt that describes a full-body character sprite. The prompt should be comma-separated and include keywords like "pixel art", "2D game sprite", "full body character", "standing pose", and "white background". Emphasize the art style (e.g., 'SNES-style 16-bit pixel art').
                    
                    Respond ONLY with a JSON object in the format: { "prompt": "your_generated_prompt_here" }. Do not include any other text or explanation.`,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Generate a prompt based on these choices:
                            - Style: ${bitStyle}
                            - Race: ${charRace}
                            - Class: ${charClass}
                            - Armor: ${charArmor}`,
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageDataUrl },
                        },
                    ],
                },
            ],
            json: true,
        });

        const result = JSON.parse(analysisCompletion.content);
        const generatedPrompt = result.prompt;
        
        promptText.textContent = generatedPrompt;

        // 2. AI call to generate the image using the new prompt
        const imageResult = await websim.imageGen({
            prompt: generatedPrompt,
            aspect_ratio: "1:1",
            transparent: true,
        });

        resultImage.src = imageResult.url;
        
        // Show result
        resultImage.style.display = 'block';
        promptContainer.classList.remove('hidden');

        lastGenerated = { 
            url: imageResult.url, 
            prompt: generatedPrompt, 
            bitStyle, charClass, charRace, charArmor 
        };
        shareControls.classList.remove('hidden');

    } catch (error) {
        console.error("Error during generation:", error);
        alert("An error occurred while generating the character. Please try again.");
    } finally {
        // Hide loading state
        loadingIndicator.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.textContent = '3. Generate Character!';
    }
});

// --- Share Function ---
shareBtn.addEventListener('click', async () => {
    if (!lastGenerated) return alert('Generate a character first.');
    const includeOriginal = includeOriginalCheckbox.checked;
    try {
        const record = await room.collection('sprite_share_v1').create({
            sprite_url: lastGenerated.url,
            original_url: includeOriginal ? originalPhotoUrl : null,
            prompt: lastGenerated.prompt,
            bit_style: lastGenerated.bitStyle,
            class: lastGenerated.charClass,
            race: lastGenerated.charRace,
            armor: lastGenerated.charArmor,
        });
        includeOriginalCheckbox.checked = false;
        alert('Shared to gallery!');
    } catch (e) {
        console.error(e);
        alert('Failed to share. Please try again.');
    }
});

// --- Gallery Function ---
const galleryGrid = document.getElementById('gallery-grid');
const modalOverlay = document.getElementById('modal-overlay');
const modalImage = document.getElementById('modal-image');
const modalClose = document.getElementById('modal-close');

function renderGallery(posts) {
    galleryGrid.innerHTML = '';
    posts.forEach(p => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
            <img class="sprite" src="${p.sprite_url}" alt="Shared sprite">
            <div class="gallery-meta">
                <img class="avatar" src="https://images.websim.com/avatar/${p.username}" alt="${p.username}">
                <div>
                    <div>@${p.username}</div>
                    <div>${p.bit_style || ''} ${p.class || ''}</div>
                </div>
            </div>
            ${p.original_url ? `<button class="button view-original" data-url="${p.original_url}">View Original</button>` : ``}
        `;
        galleryGrid.appendChild(card);
    });
    galleryGrid.querySelectorAll('.view-original').forEach(btn => {
        btn.addEventListener('click', () => {
            modalImage.src = btn.dataset.url;
            modalOverlay.classList.remove('hidden');
        });
    });
}

room.collection('sprite_share_v1').subscribe(renderGallery);

modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});

const room = new WebsimSocket();
let lastGenerated = null; // { url, prompt, bitStyle, charClass, charRace, charArmor }
let originalPhotoUrl = null;