// Элементы
const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const switchButton = document.getElementById('switch');
const startScreen = document.getElementById('startScreen');
const controlsDiv = document.getElementById('controlsDiv');
const startMainButton = document.getElementById('startMain');
const loading = document.getElementById('loading');
const snowflakesContainer = document.getElementById('snowflakes');
const garlandContainer = document.getElementById('garland');
const accessoryButtons = document.querySelectorAll('.accessory-btn');

let currentStream;
let isRunning = false;
let isFrontCamera = true;
let animationId = null;
let selectedAccessories = new Set(['hat1']);

// Изображения аксессуаров
const accessories = {
    hat1: new Image(),
    hat2: new Image(),
    beard: new Image(),
    mustache: new Image()
};

// SVG аксессуары (если файлы не загрузятся)
const accessorySVGs = {
    hat1: `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="hat1-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#ff0000"/>
                <stop offset="100%" style="stop-color:#8b0000"/>
            </radialGradient>
        </defs>
        <ellipse cx="150" cy="50" rx="120" ry="50" fill="url(#hat1-grad)"/>
        <rect x="30" y="50" width="240" height="100" fill="#8b0000"/>
        <rect x="30" y="130" width="240" height="20" fill="white"/>
        <circle cx="150" cy="30" r="20" fill="white"/>
        <circle cx="150" cy="30" r="15" fill="#ffcc00"/>
    </svg>`,
    
    hat2: `<svg width="300" height="250" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="hat2-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#00cc00"/>
                <stop offset="100%" style="stop-color:#006600"/>
            </radialGradient>
        </defs>
        <path d="M150,30 Q250,50 250,100 Q250,180 150,200 Q50,180 50,100 Q50,50 150,30" 
              fill="url(#hat2-grad)"/>
        <rect x="50" y="100" width="200" height="100" fill="#006600"/>
        <circle cx="150" cy="40" r="25" fill="white"/>
        <circle cx="150" cy="40" r="20" fill="#ff9900"/>
        <rect x="50" y="180" width="200" height="15" fill="white"/>
    </svg>`,
    
    hat3: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="beard-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#f5f5dc"/>
                <stop offset="100%" style="stop-color:#d2b48c"/>
            </radialGradient>
        </defs>
        <path d="M200,50 Q300,80 350,150 Q300,250 200,280 Q100,250 50,150 Q100,80 200,50" 
              fill="url(#beard-grad)" opacity="0.9"/>
        <path d="M200,100 Q250,120 280,150 Q250,180 200,200 Q150,180 120,150 Q150,120 200,100" 
              fill="#8b7355" opacity="0.7"/>
    </svg>`,
    
    mustache: `<svg width="300" height="150" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="mustache-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#8b4513"/>
                <stop offset="100%" style="stop-color:#654321"/>
            </radialGradient>
        </defs>
        <path d="M150,50 Q200,30 250,60 Q220,100 150,80 Q80,100 50,60 Q100,30 150,50" 
              fill="url(#mustache-grad)" opacity="0.9"/>
        <path d="M150,60 Q180,50 210,70 Q190,90 150,80 Q110,90 90,70 Q120,50 150,60" 
              fill="#5d4037" opacity="0.8"/>
    </svg>`
};

// Загружаем изображения
Object.keys(accessories).forEach(key => {
    accessories[key].src = `${key}.png`;
    accessories[key].onerror = () => {
        // Если файл не загрузился, используем SVG
        accessories[key].src = 'data:image/svg+xml;base64,' + btoa(accessorySVGs[key]);
    };
});

// Создаем снежинки
function createSnowflakes() {
    for (let i = 0; i < 50; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        const size = Math.random() * 10 + 5;
        const left = Math.random() * 100;
        const duration = Math.random() * 10 + 10;
        const delay = Math.random() * 5;
        
        snowflake.style.width = `${size}px`;
        snowflake.style.height = `${size}px`;
        snowflake.style.left = `${left}%`;
        snowflake.style.top = `-${size}px`;
        snowflake.style.opacity = Math.random() * 0.5 + 0.3;
        snowflake.style.animationDuration = `${duration}s`;
        snowflake.style.animationDelay = `${delay}s`;
        
        snowflakesContainer.appendChild(snowflake);
    }
}

// Создаем гирлянду
function createGarland() {
    const colors = ['#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'];
    const lightCount = 20;
    
    for (let i = 0; i < lightCount; i++) {
        const light = document.createElement('div');
        light.className = 'light';
        const left = (i / lightCount) * 100;
        const color = colors[i % colors.length];
        const delay = (i % 3) * 0.5;
        
        light.style.left = `${left}%`;
        light.style.backgroundColor = color;
        light.style.animationDelay = `${delay}s`;
        
        garlandContainer.appendChild(light);
    }
}

// Загружаем модель Face Mesh
const faceMesh = new FaceMesh({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

// Функция для настройки камеры
async function startCamera(facingMode = 'user') {
    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: false
        };
        
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            constraints.video.width = { ideal: 640 };
            constraints.video.height = { ideal: 480 };
            constraints.video.frameRate = { ideal: 24 };
        }
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                
                if (window.innerHeight > window.innerWidth) {
                    canvas.width = Math.min(videoWidth, window.innerWidth);
                    canvas.height = canvas.width * (videoHeight / videoWidth);
                } else {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
                
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.objectFit = 'cover';
                
                if (facingMode === 'user') {
                    video.style.transform = 'scaleX(-1)';
                } else {
                    video.style.transform = 'scaleX(1)';
                }
                
                isFrontCamera = (facingMode === 'user');
                resolve();
            };
        });
    } catch (err) {
        console.error("Ошибка камеры:", err);
        alert("Не удалось получить доступ к камере. Пожалуйста, разрешите доступ к камере в настройках браузера.");
        return Promise.reject(err);
    }
}

// Обработка результатов
function onResults(results) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем видео с учетом ориентации
    if (isFrontCamera) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        for (const landmarks of results.multiFaceLandmarks) {
            // Координаты лица
            const forehead = landmarks[10];
            const noseTip = landmarks[1];
            const chin = landmarks[152];
            const leftCheek = landmarks[454];
            const rightCheek = landmarks[234];
            const upperLip = landmarks[13];
            const lowerLip = landmarks[14];
            
            // Преобразуем в координаты canvas
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            let foreheadX, foreheadY, noseX, noseY, chinY, leftX, rightX, lipX, lipY;
            
            if (isFrontCamera) {
                foreheadX = (1 - forehead.x) * canvasWidth;
                foreheadY = forehead.y * canvasHeight;
                noseX = (1 - noseTip.x) * canvasWidth;
                noseY = noseTip.y * canvasHeight;
                chinY = (1 - chin.y) * canvasHeight;
                leftX = (1 - leftCheek.x) * canvasWidth;
                rightX = (1 - rightCheek.x) * canvasWidth;
                lipX = (1 - upperLip.x) * canvasWidth;
                lipY = upperLip.y * canvasHeight;
            } else {
                foreheadX = forehead.x * canvasWidth;
                foreheadY = forehead.y * canvasHeight;
                noseX = noseTip.x * canvasWidth;
                noseY = noseTip.y * canvasHeight;
                chinY = chin.y * canvasHeight;
                leftX = leftCheek.x * canvasWidth;
                rightX = rightCheek.x * canvasWidth;
                lipX = upperLip.x * canvasWidth;
                lipY = upperLip.y * canvasHeight;
            }
            
            const faceWidth = Math.abs(rightX - leftX);
            const faceHeight = Math.abs(chinY - foreheadY);
            
            // Рисуем выбранные аксессуары
            if (selectedAccessories.has('all') || 
                selectedAccessories.has('hat1') || 
                selectedAccessories.has('hat2')) {
                
                // Шапка 1 (красная классическая)
                if (selectedAccessories.has('hat1') || selectedAccessories.has('all')) {
                    const hatWidth = faceWidth * 1.3;
                    const hatHeight = hatWidth * 0.67;
                    const hatX = foreheadX - hatWidth / 2;
                    const hatY = foreheadY - hatHeight * 0.8;
                    
                    if (accessories.hat1.complete) {
                        ctx.save();
                        if (isFrontCamera) {
                            ctx.translate(canvasWidth, 0);
                            ctx.scale(-1, 1);
                            ctx.drawImage(accessories.hat1, canvasWidth - hatX - hatWidth, hatY, hatWidth, hatHeight);
                        } else {
                            ctx.drawImage(accessories.hat1, hatX, hatY, hatWidth, hatHeight);
                        }
                        ctx.restore();
                    }
                }
                
                // Шапка 2 (зеленая еловая)
                if (selectedAccessories.has('hat2') || selectedAccessories.has('all')) {
                    const hatWidth = faceWidth * 1.4;
                    const hatHeight = hatWidth * 0.83;
                    const hatX = foreheadX - hatWidth / 2;
                    const hatY = foreheadY - hatHeight * 0.7;
                    
                    if (accessories.hat2.complete) {
                        ctx.save();
                        if (isFrontCamera) {
                            ctx.translate(canvasWidth, 0);
                            ctx.scale(-1, 1);
                            ctx.drawImage(accessories.hat2, canvasWidth - hatX - hatWidth, hatY, hatWidth, hatHeight);
                        } else {
                            ctx.drawImage(accessories.hat2, hatX, hatY, hatWidth, hatHeight);
                        }
                        ctx.restore();
                    }
                }
            }
            
            // Борода
            if (selectedAccessories.has('beard') || selectedAccessories.has('all')) {
                const beardWidth = faceWidth * 1.5;
                const beardHeight = faceHeight * 0.8;
                const beardX = noseX - beardWidth / 2;
                const beardY = lipY - beardHeight * 0.3;
                
                if (accessories.beard.complete) {
                    ctx.save();
                    if (isFrontCamera) {
                        ctx.translate(canvasWidth, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(accessories.beard, canvasWidth - beardX - beardWidth, beardY, beardWidth, beardHeight);
                    } else {
                        ctx.drawImage(accessories.beard, beardX, beardY, beardWidth, beardHeight);
                    }
                    ctx.restore();
                }
            }
            
            // Усы
            if (selectedAccessories.has('mustache') || selectedAccessories.has('all')) {
                const mustacheWidth = faceWidth * 0.8;
                const mustacheHeight = mustacheWidth * 0.5;
                const mustacheX = noseX - mustacheWidth / 2;
                const mustacheY = lipY - mustacheHeight / 2;
                
                if (accessories.mustache.complete) {
                    ctx.save();
                    if (isFrontCamera) {
                        ctx.translate(canvasWidth, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(accessories.mustache, canvasWidth - mustacheX - mustacheWidth, mustacheY, mustacheWidth, mustacheHeight);
                    } else {
                        ctx.drawImage(accessories.mustache, mustacheX, mustacheY, mustacheWidth, mustacheHeight);
                    }
                    ctx.restore();
                }
            }
        }
    }
    
    ctx.restore();
    
    // Запрашиваем следующий кадр
    if (isRunning) {
        animationId = requestAnimationFrame(() => {
            if (video.readyState >= video.HAVE_ENOUGH_DATA) {
                faceMesh.send({image: video});
            }
        });
    }
}

// Функция для запуска обработки
async function startProcessing() {
    if (!isRunning) {
        isRunning = true;
        startButton.textContent = "ПАУЗА";
        startButton.style.background = "#ff9900";
        
        if (video.readyState >= video.HAVE_ENOUGH_DATA) {
            animationId = requestAnimationFrame(() => {
                faceMesh.send({image: video});
            });
        }
    }
}

// Функция для остановки обработки
function stopProcessing() {
    if (isRunning) {
        isRunning = false;
        startButton.textContent = "СТАРТ";
        startButton.style.background = "#ff0000";
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Обработчики кнопок аксессуаров
accessoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        
        if (type === 'all') {
            selectedAccessories.clear();
            selectedAccessories.add('all');
            accessoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        } else {
            if (selectedAccessories.has('all')) {
                selectedAccessories.clear();
                accessoryButtons.forEach(b => b.classList.remove('active'));
            }
            
            if (selectedAccessories.has(type)) {
                selectedAccessories.delete(type);
                btn.classList.remove('active');
            } else {
                selectedAccessories.add(type);
                btn.classList.add('active');
            }
            
            // Если ничего не выбрано, выбираем шапку 1
            if (selectedAccessories.size === 0) {
                selectedAccessories.add('hat1');
                document.querySelector('[data-type="hat1"]').classList.add('active');
            }
        }
    });
});

// Обработчики кнопок
startMainButton.onclick = async () => {
    try {
        startScreen.style.display = 'none';
        loading.style.display = 'block';
        
        await new Promise(resolve => setTimeout(resolve, 100));
        await startCamera();
        
        loading.style.display = 'none';
        controlsDiv.style.display = 'block';
        
        await startProcessing();
    } catch (err) {
        loading.style.display = 'none';
        startScreen.style.display = 'flex';
        controlsDiv.style.display = 'none';
    }
};

startButton.onclick = async () => {
    if (isRunning) {
        stopProcessing();
    } else {
        await startProcessing();
    }
};

stopButton.onclick = () => {
    stopProcessing();
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    controlsDiv.style.display = 'none';
    startScreen.style.display = 'flex';
    isRunning = false;
};

switchButton.onclick = async () => {
    try {
        const facingMode = isFrontCamera ? 'environment' : 'user';
        
        stopProcessing();
        controlsDiv.style.display = 'none';
        loading.style.display = 'block';
        
        await startCamera(facingMode);
        
        loading.style.display = 'none';
        controlsDiv.style.display = 'block';
        
        await startProcessing();
    } catch (err) {
        loading.style.display = 'none';
        controlsDiv.style.display = 'block';
        alert("Не удалось переключить камеру");
    }
};

// Инициализация
window.addEventListener('load', () => {
    createSnowflakes();
    createGarland();
});

window.addEventListener('resize', () => {
    if (currentStream && video.videoWidth) {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        if (window.innerHeight > window.innerWidth) {
            canvas.width = Math.min(videoWidth, window.innerWidth);
            canvas.height = canvas.width * (videoHeight / videoWidth);
        } else {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }
});
