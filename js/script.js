// --- JARA QUYNH WEB INVITE MASTER CORE SYSTEM ---

// PALITAN ITO ng iyong nakuha na Web App URL mula sa Google Apps Script deployment
const scriptURL = 'https://script.google.com/macros/s/AKfycbxYNz3NPlx-3Ajg7313QC2r3E3XJnqN2qSa2j-fUZdgwu-qnP1bnrJJb0VF1Yu0Gbiq/exec';

// 🎵 BAGONG DAGDAG: Music Playlist Array (Palitan ng tamang file paths kung kailangan)
const playlist = [
    "assets/song 1.aac",
    "assets/song 2.aac",
    "assets/song3.aac"
];
let currentSongIndex = 0;

// BAGONG DAGDAG: Helper para sa Smart Scroll (Intersection Observer)
function createObserver(element, playCallback, pauseCallback) {
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                playCallback(); // I-play pag nakita sa screen
            } else {
                pauseCallback(); // I-pause pag umalis sa screen
            }
        });
    }, { threshold: 0.5 });
    observer.observe(element);
}

document.addEventListener("DOMContentLoaded", () => {
    setupRSVP();
    setupCountdown();
    setupMusicPlayer();
    setupTimelineCarousel();
    
    // Tatawagin ang setupWishesCarousel SA LOOB mismo ng fetchWishes pagkatapos mag-load ang data
    fetchWishes(); 

    /* ==========================
    REVEAL ON SCROLL
    ========================== */
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries)=>{
        entries.forEach((entry)=>{
            if(entry.isIntersecting){
                entry.target.classList.add('show');
            }
        });
    }, { threshold:.12 });

    reveals.forEach((el)=>{ observer.observe(el); });
});

// ==========================================================================
// 1. RSVP FORM CONTROLLER (Google Sheets Bridge via Fetch API)
// ==========================================================================
function setupRSVP() {
    const form = document.getElementById('rsvpForm');
    const thankYou = document.getElementById('thankYouMessage');

    if (!form) return;

    form.addEventListener('submit', e => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Sending response...';
        submitBtn.disabled = true;

        const formData = new URLSearchParams(new FormData(form));

        fetch(scriptURL, { method: 'POST', body: formData })
            .then(response => {
                form.reset();
                form.style.display = 'none';
                thankYou.style.display = 'block';
            })
            .catch(error => {
                console.error('Error submitting RSVP:', error);
                alert('Paumanhin, may kaunting problema sa koneksyon. Pakisubukan muli.');
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            });
    });
}

// ==========================================================================
// 2. COUNTDOWN TIMER CONTROLLER
// ==========================================================================
function setupCountdown() {
    const targetDate = new Date("August 8, 2026 10:00:00").getTime();
    
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (!daysEl) return;

    const timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const diff = targetDate - now;
        
        if (diff <= 0) {
            clearInterval(timerInterval);
            const display = document.querySelector('.countdown-display');
            if (display) display.innerHTML = "<h3>The Celebration Has Begun! ♥</h3>";
            return;
        }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        daysEl.innerText = String(d).padStart(2, '0');
        hoursEl.innerText = String(h).padStart(2, '0');
        minutesEl.innerText = String(m).padStart(2, '0');
        secondsEl.innerText = String(s).padStart(2, '0');
    }, 1000);
}

// ==========================================================================
// ==========================================================================
// 3. BACKGROUND MUSIC CONTROLLER (With Custom PNG Icons)
// ==========================================================================
function setupMusicPlayer() {
    const musicBtn = document.getElementById('musicToggle');
    const audio = document.getElementById('bgMusic');
    
    if (!musicBtn || !audio) return;

    // I-load ang unang kanta sa array
    audio.src = playlist[currentSongIndex];
    let isPlaying = false;

    // Set default icon pagka-load ng page
    musicBtn.innerHTML = '<img src="images/icons/play.png" class="custom-music-icon" alt="Play">';

    // Pag natapos ang kanta, lipat sa susunod
    audio.addEventListener('ended', () => {
        currentSongIndex = (currentSongIndex + 1) % playlist.length;
        audio.src = playlist[currentSongIndex];
        if (isPlaying) audio.play(); 
    });

    musicBtn.addEventListener('click', () => {
        if (isPlaying) {
            audio.pause();
            musicBtn.classList.remove('music-playing');
            // Ibalik sa Play icon kapag naka-pause
            musicBtn.innerHTML = '<img src="images/icons/play.png" class="custom-music-icon" alt="Play">';
        } else {
            audio.play().then(() => {
                musicBtn.classList.add('music-playing');
                // Palitan ng Pause icon kapag tumutugtog na (kung may pause.png ka)
                // Kung wala, pwede mong panatilihin ang play.png
                musicBtn.innerHTML = '<img src="images/icons/pause.png" class="custom-music-icon" alt="Pause">';
            }).catch(err => {
                console.log("Audio play blocked by browser policy:", err);
            });
        }
        isPlaying = !isPlaying;
    });
}

// ==========================================================================
// 4. HARD-DUTY TIMELINE CAROUSEL CONTROLLER (Swipe + Autoplay + Controls)
// ==========================================================================
function setupTimelineCarousel() {
    const carousel = document.getElementById("timelineCarousel");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const dotsContainer = document.getElementById('carouselDots');

    if (!carousel) return;

    const totalCards = carousel.querySelectorAll('.timeline-item').length;
    dotsContainer.innerHTML = '';
    
    for(let i=0; i<totalCards; i++) {
        dotsContainer.innerHTML += '<button class="dot"></button>';
    }
    const dots = document.querySelectorAll('#carouselDots .dot');

    let autoPlay = null;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    /* CARD WIDTH */
    function getStep() {
        const item = carousel.querySelector(".timeline-item");
        if (!item) return 320;
        const gap = parseFloat(getComputedStyle(carousel).gap) || 24;
        return (item.getBoundingClientRect().width + gap);
    }

    /* DOTS */
    function updateDots() {
        const step = getStep();
        const index = Math.round(carousel.scrollLeft / step);
        dots.forEach((dot,i) => {
            dot.classList.toggle('active', i===index);
        });
    }

    /* MOVE */
    function move(direction) {
        const step = getStep();
        const max = carousel.scrollWidth - carousel.clientWidth;
        let target = carousel.scrollLeft + (direction*step);

        /* LOOP */
        if(target >= max) target = 0;
        if(target < 0) target = max;
        carousel.scrollTo({ left: target, behavior:'smooth' });
    }

    /* BUTTONS */
    prevBtn?.addEventListener("click", () => {
        restartAuto();
        move(-1);
    });

    nextBtn?.addEventListener("click", () => {
        restartAuto();
        move(1);
    });

    /* DOT CLICK */
    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            restartAuto();
            carousel.scrollTo({ left: index * getStep(), behavior: "smooth" });
        });
    });

    /* AUTOPLAY */
    function startAuto() {
        stopAuto();
        autoPlay = setInterval(()=>{
            const step = getStep();
            const max = carousel.scrollWidth - carousel.clientWidth;
            const next = carousel.scrollLeft + step;

            /* LOOP SA DULO */
            if(next >= max){
                carousel.scrollTo({ left:0, behavior:'smooth' });
            } else {
                carousel.scrollBy({ left:step, behavior:'smooth' });
            }
        }, 4500);
    }

    function stopAuto() {
        clearInterval(autoPlay);
    }

    function restartAuto() {
        stopAuto();
        startAuto();
    }

    /* DESKTOP DRAG */
    carousel.addEventListener("mousedown", e => {
        dragging = true;
        stopAuto();
        carousel.classList.add("dragging");
        startX = e.pageX;
        startScroll = carousel.scrollLeft;
    });

    window.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        carousel.classList.remove("dragging");
        restartAuto();
    });

    window.addEventListener("mousemove", e => {
        if (!dragging) return;
        e.preventDefault();
        const walk = (e.pageX - startX) * 1.3;
        carousel.scrollLeft = startScroll - walk;
    });

    /* MOBILE */
    carousel.addEventListener("touchstart", stopAuto);
    carousel.addEventListener("touchend", restartAuto);

    /* HOVER */
    carousel.addEventListener("mouseenter", stopAuto);
    carousel.addEventListener("mouseleave", () => {
        dragging = false;
        carousel.classList.remove("dragging");
        restartAuto();
    });

    /* UPDATE */
    carousel.addEventListener('scroll', ()=>{
        window.requestAnimationFrame(()=>{
            updateDots();
        });
    });

    window.addEventListener("resize", updateDots);

    updateDots();
    
    // UPDATED: Gamitin ang observer para hindi mag-play kung hindi nakikita sa screen!
    createObserver(carousel, startAuto, stopAuto);
}

// ==========================================================================
// ==========================================================================
// 5. WISHES FOR JARA - FETCH MULA GOOGLE SHEETS
// ==========================================================================
async function fetchWishes() {
    const wallContainer = document.getElementById('guestWallContainer');
    if (!wallContainer) return;
    
    try {
        const response = await fetch(scriptURL);
        const data = await response.json();
        
        // Linisin ang container bago lagyan ng bago
        wallContainer.innerHTML = '';
        
        // Gamitin ang .filter para tanggalin ang mga walang laman
        const validWishes = data.filter(item => {
            const msg = item.message ? item.message.toString().trim() : "";
            // Tumatanggap lang kung may laman na hindi quotation marks lang
            return msg !== "" && msg !== '""';
        });

        if (validWishes.length === 0) {
            wallContainer.innerHTML = '<p>No wishes yet. Be the first to greet Jara!</p>';
        } else {
            validWishes.forEach(item => {
                const card = document.createElement('div');
                card.className = 'wish-card';
                card.innerHTML = `
                    <p class="wish-msg">"${item.message}"</p>
                    <h4 class="wish-author">— ${item.name}</h4>
                `;
                wallContainer.appendChild(card);
            });
        }
        
        // I-initiate ang carousel animation matapos mailagay ang data
        setupWishesCarousel();
        
    } catch (error) {
        console.error("Error fetching wishes:", error);
    }
}

function setupWishesCarousel() {
    const track = document.getElementById('guestWallContainer');
    if (!track) return;

    let autoTimer;

    const getScrollDistance = () => {
        const item = track.querySelector('.wish-card');
        if (!item) return 300;
        return item.offsetWidth + 20; // Lapad ng card + 20px gap
    };

    const runAutoPlay = () => {
        if(autoTimer) clearInterval(autoTimer);
        autoTimer = setInterval(() => {
            const step = getScrollDistance();
            
            // Kung sagad na sa dulo, ibalik sa simula
            if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 15) {
                track.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                track.scrollBy({ left: step, behavior: 'smooth' });
            }
        }, 5000); // 5 seconds bago lumipat sa susunod na mensahe
    };

    const pauseAutoPlay = () => {
        clearInterval(autoTimer);
    };

    // Hihinto ang auto-scroll kapag binabasa (tinapatan ng mouse o hinawakan sa screen)
    track.addEventListener('mouseenter', pauseAutoPlay);
    track.addEventListener('mouseleave', runAutoPlay);
    track.addEventListener('touchstart', pauseAutoPlay);
    track.addEventListener('touchend', runAutoPlay);

    // UPDATED: Gamitin ang observer para hindi mag-play kung hindi nakikita sa screen!
    createObserver(track, runAutoPlay, pauseAutoPlay);
}