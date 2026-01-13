console.log('Akwadra Super Builder Initialized');

// --- PRESERVED ORIGINAL FUNCTIONALITY ---
document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.card');
    if(card) {
        card.addEventListener('click', () => {
            console.log('تم النقر على البطاقة!');
            alert('أهلاً بك في عالم البناء بدون كود!');
        });
    }
    
    // Initialize Quran App
    initQuranApp();
});
// ----------------------------------------

// --- NEW QURAN APP LOGIC ---

let allSurahs = [];
let currentAudio = null;
let isPlaying = false;
let currentSurahIndex = 0;

async function initQuranApp() {
    const grid = document.getElementById('surah-grid');
    const searchInput = document.getElementById('searchInput');
    const audio = document.getElementById('audio-element');
    
    // Audio Events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
        togglePlayIcon(false);
        document.getElementById('visualizer').classList.remove('opacity-100');
    });
    audio.addEventListener('loadedmetadata', () => {
         document.getElementById('duration').textContent = formatTime(audio.duration);
    });

    // Search Functionality
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allSurahs.filter(surah => 
            surah.name.includes(term) || 
            surah.englishName.toLowerCase().includes(term) ||
            String(surah.number).includes(term)
        );
        renderSurahs(filtered);
    });

    // Player Controls
    document.getElementById('play-btn').addEventListener('click', toggleAudio);
    document.getElementById('progress-container').addEventListener('click', seekAudio);
    document.getElementById('close-reading').addEventListener('click', closeReadingView);
    document.getElementById('prev-btn').addEventListener('click', playPrev);
    document.getElementById('next-btn').addEventListener('click', playNext);

    // Fetch Data
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        if(data.code === 200) {
            allSurahs = data.data;
            renderSurahs(allSurahs);
        } else {
            grid.innerHTML = '<p class="col-span-full text-center text-red-500">فشل تحميل البيانات. يرجى المحاولة لاحقاً.</p>';
        }
    } catch (error) {
        console.error('Error loading Quran data:', error);
        grid.innerHTML = '<p class="col-span-full text-center text-red-500">حدث خطأ في الاتصال.</p>';
    }
}

function renderSurahs(surahs) {
    const grid = document.getElementById('surah-grid');
    grid.innerHTML = '';
    
    if(surahs.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">لا توجد نتائج مطابقة</div>';
        return;
    }

    surahs.forEach((surah, index) => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-emerald-50 group cursor-pointer relative overflow-hidden';
        card.onclick = () => openSurah(surah.number, index);

        card.innerHTML = `
            <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div class="relative flex justify-between items-start mb-4">
                <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold font-amiri shadow-inner">
                    ${surah.number}
                </div>
                <div class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    ${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                </div>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-1 font-amiri group-hover:text-emerald-600 transition-colors">${surah.name}</h3>
            <p class="text-sm text-gray-500 mb-4">${surah.englishName}</p>
            <div class="flex items-center justify-between text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100">
                <span>${surah.numberOfAyahs} آية</span>
                <span class="group-hover:translate-x-[-4px] transition-transform text-emerald-500">
                   اقرأ واستمع &larr;
                </span>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function openSurah(number, index) {
    const readingView = document.getElementById('reading-view');
    const title = document.getElementById('surah-title');
    const info = document.getElementById('surah-info');
    const content = document.getElementById('quran-content');
    const playerContainer = document.getElementById('audio-player-container');

    const surah = allSurahs.find(s => s.number === number);
    if(!surah) return;

    currentSurahIndex = allSurahs.findIndex(s => s.number === number);

    // Set Reading UI
    title.textContent = surah.name;
    info.textContent = `${surah.englishName} • ${surah.numberOfAyahs} آية • ${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}`;
    
    // Show Reading View
    readingView.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Show Player
    playerContainer.classList.remove('translate-y-full');
    setupAudioPlayer(surah);

    // Fetch Ayahs
    content.innerHTML = '<div class="flex justify-center py-10"><div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10"></div></div>';
    
    try {
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${number}`);
        const data = await response.json();
        
        if(data.code === 200) {
            let fullText = '';
            data.data.ayahs.forEach(ayah => {
                // Remove Bismillah from beginning of text if it's not Fatiha (since we added it manually in header)
                let text = ayah.text;
                if(number !== 1 && ayah.numberInSurah === 1) {
                    text = text.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', '').trim();
                }
                fullText += `<span class="inline-block hover:text-emerald-700 transition-colors cursor-pointer" title="آية ${ayah.numberInSurah}">${text} <span class="text-emerald-500 text-xl mx-1">۝${toArabicNumerals(ayah.numberInSurah)}</span></span> `;
            });
            content.innerHTML = fullText;
        }
    } catch (e) {
        content.innerHTML = '<p class="text-red-500 text-lg">فشل تحميل النص القرآني.</p>';
    }
}

function closeReadingView() {
    document.getElementById('reading-view').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function setupAudioPlayer(surah) {
    const audio = document.getElementById('audio-element');
    const title = document.getElementById('player-surah-name');
    const numberBadge = document.getElementById('player-surah-number');
    const playBtn = document.getElementById('play-btn');

    title.textContent = surah.name;
    numberBadge.textContent = surah.number;

    // Pad number for MP3 URL (e.g., 1 -> 001)
    const paddedNum = String(surah.number).padStart(3, '0');
    // Source: Mishary Al-Afasy
    const audioUrl = `https://server8.mp3quran.net/afs/${paddedNum}.mp3`;

    if (audio.src !== audioUrl) {
        audio.src = audioUrl;
        audio.load();
        // Auto play on open?
        togglePlayIcon(true);
        audio.play().catch(e => {
            console.log("Auto-play prevented by browser policy", e);
            togglePlayIcon(false);
        });
    }
}

function toggleAudio() {
    const audio = document.getElementById('audio-element');
    if (audio.paused) {
        audio.play();
        togglePlayIcon(true);
    } else {
        audio.pause();
        togglePlayIcon(false);
    }
}

function togglePlayIcon(isPlaying) {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const visualizer = document.getElementById('visualizer');

    if (isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        visualizer.classList.add('opacity-100');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        visualizer.classList.remove('opacity-100');
    }
}

function updateProgress() {
    const audio = document.getElementById('audio-element');
    const progressBar = document.getElementById('progress-bar');
    const currTime = document.getElementById('current-time');
    
    if(audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${percent}%`;
        currTime.textContent = formatTime(audio.currentTime);
    }
}

function seekAudio(e) {
    const audio = document.getElementById('audio-element');
    const container = document.getElementById('progress-container');
    const clickX = e.offsetX;
    const width = container.clientWidth;
    const duration = audio.duration;

    audio.currentTime = (clickX / width) * duration;
}

function playNext() {
    if (currentSurahIndex > 0) { // Since list is reversed in RTL visually? No, array order.
        // Actually wait, 'next' usually means next number (higher index)
        if (currentSurahIndex < allSurahs.length - 1) {
            openSurah(allSurahs[currentSurahIndex + 1].number, currentSurahIndex + 1);
        }
    }
}

function playPrev() {
     if (currentSurahIndex > 0) {
        openSurah(allSurahs[currentSurahIndex - 1].number, currentSurahIndex - 1);
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function toArabicNumerals(n) {
    return n.toString().replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}
