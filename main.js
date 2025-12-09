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

let currentStream;
let isRunning = false;
let cameraInstance = null;
let isFrontCamera = true;
let animationId = null;

// Создаем изображение шапки
let hatImage = new Image();
hatImage.src = 'my_hat.png';

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

// Функция для настройки камеры под мобильные устройства
async function startCamera(facingMode = 'user') {
    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        // Определяем поддерживаемые размеры
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: false
        };
        
        // Для мобильных устройств используем оптимальные настройки
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            constraints.video.width = { ideal: 640 };
            constraints.video.height = { ideal: 480 };
            constraints.video.frameRate = { ideal: 24 };
        }
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                // Устанавливаем размер canvas под размер видео
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                
                // Для мобильных устройств подгоняем под экран
                if (window.innerHeight > window.innerWidth) {
                    // Портретная ориентация
                    canvas.width = Math.min(videoWidth, window.innerWidth);
                    canvas.height = canvas.width * (videoHeight / videoWidth);
                } else {
                    // Ландшафтная ориентация
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
                
                // Центрируем canvas
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.objectFit = 'cover';
                
                // Настраиваем зеркальное отображение для фронтальной камеры
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
        // Для фронтальной камеры - зеркальное отображение
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Сбрасываем трансформацию
    } else {
        // Для задней камеры - как есть
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        for (const landmarks of results.multiFaceLandmarks) {
            // Находим точки лица для позиционирования шапки
            // Используем точки для определения размера головы
            const forehead = landmarks[10];  // точка на лбу
            const chin = landmarks[152];     // точка на подбородке
            const leftTemple = landmarks[234];
            const rightTemple = landmarks[454];
            
            // Преобразуем в координаты canvas
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            let foreheadX, foreheadY, chinY, leftX, rightX;
            
            if (isFrontCamera) {
                // Для зеркального отображения инвертируем X координату
                foreheadX = (1 - forehead.x) * canvasWidth;
                foreheadY = forehead.y * canvasHeight;
                chinY = (1 - chin.y) * canvasHeight;
                leftX = (1 - leftTemple.x) * canvasWidth;
                rightX = (1 - rightTemple.x) * canvasWidth;
            } else {
                foreheadX = forehead.x * canvasWidth;
                foreheadY = forehead.y * canvasHeight;
                chinY = chin.y * canvasHeight;
                leftX = leftTemple.x * canvasWidth;
                rightX = rightTemple.x * canvasWidth;
            }
            
            // Вычисляем размеры лица
            const faceWidth = Math.abs(rightX - leftX);
            const faceHeight = Math.abs(chinY - foreheadY);
            
            // Размер шапки: ширина = ширина лица * 1.2 (было 1.8)
            // Высота рассчитывается пропорционально оригинальному изображению 750x712
            const originalHatRatio = 750 / 712; // ≈ 1.05
            const hatWidth = faceWidth * 1.2;
            const hatHeight = hatWidth / originalHatRatio; // Сохраняем пропорции
            
            // Позиционирование шапки: выше лба
            const hatX = foreheadX - hatWidth / 2;
            const hatY = foreheadY - hatHeight * 0.8; // Поднимаем выше (было 0.6)
            
            // Рисуем шапку
            if (hatImage.complete) {
                ctx.save();
                if (isFrontCamera) {
                    // Для зеркального отображения шапки тоже
                    ctx.translate(canvasWidth, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(hatImage, canvasWidth - hatX - hatWidth, hatY, hatWidth, hatHeight);
                } else {
                    ctx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
                }
                ctx.restore();
                
                // Для отладки: показать контрольные точки
                if (false) { // поменяйте на true для отладки
                    ctx.fillStyle = 'red';
                    ctx.fillRect(foreheadX - 5, foreheadY - 5, 10, 10);
                    ctx.fillStyle = 'blue';
                    ctx.fillRect(leftX - 5, foreheadY - 5, 10, 10);
                    ctx.fillRect(rightX - 5, foreheadY - 5, 10, 10);
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
        
        // Запускаем обработку кадров
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

// Обработчики кнопок
startMainButton.onclick = async () => {
    try {
        // Показываем индикатор загрузки
        startScreen.style.display = 'none';
        loading.style.display = 'block';
        
        // Даем время на отрисовку
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Запускаем камеру
        await startCamera();
        
        // Скрываем индикатор загрузки, показываем управление
        loading.style.display = 'none';
        controlsDiv.style.display = 'block';
        
        // Запускаем обработку
        await startProcessing();
    } catch (err) {
        // Если ошибка - показываем стартовый экран снова
        loading.style.display = 'none';
        startScreen.style.display = 'flex';
        controlsDiv.style.display = 'none';
        console.error("Ошибка запуска:", err);
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
    
    // Показываем стартовый экран
    controlsDiv.style.display = 'none';
    startScreen.style.display = 'flex';
    isRunning = false;
};

switchButton.onclick = async () => {
    try {
        const facingMode = isFrontCamera ? 'environment' : 'user';
        
        // Останавливаем текущую обработку
        stopProcessing();
        
        // Показываем загрузку
        controlsDiv.style.display = 'none';
        loading.style.display = 'block';
        
        // Переключаем камеру
        await startCamera(facingMode);
        
        // Скрываем загрузку, показываем управление
        loading.style.display = 'none';
        controlsDiv.style.display = 'block';
        
        // Запускаем обработку снова
        await startProcessing();
    } catch (err) {
        console.error("Ошибка при переключении камеры:", err);
        loading.style.display = 'none';
        controlsDiv.style.display = 'block';
        alert("Не удалось переключить камеру");
    }
};

// Обработка ошибок загрузки изображения шапки
hatImage.onerror = () => {
    console.error("Ошибка загрузки изображения шапки");
    // Создаем fallback изображение
    hatImage.src = 'my_hat.png';
};

// Обработка изменения ориентации
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

// Предотвращаем стандартное поведение жестов
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

// Отключаем контекстное меню на длительное нажатие
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});
