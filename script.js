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
    imageDataUrl = webcamCanvas.toDataURL('image/png');
    
    updatePreview(imageDataUrl);

    // Stop webcam
    webcamVideo.srcObject.getTracks().forEach(track => track.stop());
    webcamVideo.style.display = 'none';
    capturePhotoBtn.classList.add('hidden');
    startWebcamBtn.classList.remove('hidden');
});

// --- File Upload Function ---
uploadBtn.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imageDataUrl = e.target.result;
            updatePreview(imageDataUrl);
        };
        reader.readAsDataURL(file);
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

