// Language handling
function setLanguage(lang) {
  localStorage.setItem('language', lang);
  applyLanguage(lang);
  // Reload the page so all dynamically JS-rendered content (customer data tables, widgets, etc.) fetches the new language translation on load
  window.location.reload();
}

function applyLanguage(lang) {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translations[lang][key];
      } else {
        el.innerText = translations[lang][key];
      }
    }
  });
}

// Helper: expire past bookings (after 5:00 PM of booked date)
function refreshExpiredBookings() {
  const now = new Date();
  let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  let changed = false;

  bookings.forEach(b => {
    if (b.status !== 'booked') return;
    if (!b.date) return;
    const endOfDay = new Date(b.date + 'T17:00:00');
    if (now > endOfDay) {
      b.status = 'expired';
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem('bookings', JSON.stringify(bookings));
  }
  return bookings;
}

// Initialize default data if not present
if (!localStorage.getItem('stock')) {
  localStorage.setItem('stock', JSON.stringify({ rice: 500, wheat: 300, sugar: 100, oil: 100, dal: 100, salt: 100, soap: 100 }));
}

// Register Service Worker for Offline Mode
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => console.log("SW Registered"));
}

window.addEventListener('online', () => updateOfflineStatus(true));
window.addEventListener('offline', () => updateOfflineStatus(false));

const BACKEND_URL = 'http://localhost:5000'; // FOR MOBILE: Replace with your IP (e.g., http://10.0.0.124:5000)
let socket;

// Standardized Page Detection (Global)
const pathname = window.location.pathname.toLowerCase();
const currentPage = pathname.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
console.log("Global Page Detected:", currentPage);

// --- NATIVE PHONE NOTIFICATIONS ---
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
      }
    });
  }
}

function triggerNativeNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body: body,
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png',
        vibrate: [200, 100, 200]
      });
    });
  }
}

function initSocket() {
  if (typeof io !== 'undefined') {
    socket = io(BACKEND_URL);

    socket.on('connect', () => {
      console.log('Connected to backend cloud');
      updateOfflineStatus(true);
      requestNotificationPermission(); // Ask for notification permission on connect
    });

    socket.on('init-data', (data) => {
      if (data.bookings) {
        const localBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
        const serverIds = new Set(data.bookings.map(b => b.id));
        const merged = [...data.bookings, ...localBookings.filter(b => !serverIds.has(b.id))];
        localStorage.setItem('bookings', JSON.stringify(merged));
      }
      if (data.stock) localStorage.setItem('stock', JSON.stringify(data.stock));
      renderCurrentPage();
    });

    socket.on('new-booking', (booking) => {
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      if (!bookings.find(b => b.id === booking.id)) {
        bookings.push(booking);
        localStorage.setItem('bookings', JSON.stringify(bookings));
        renderCurrentPage();

        // Trigger Real Notification on Phone
        triggerNativeNotification('🚨 New Ration Booking', `Customer ${booking.customerName} has booked a slot for ${booking.date}.`);
      }
    });

    socket.on('status-changed', (updatedBooking) => {
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const index = bookings.findIndex(b => b.id === updatedBooking.id);
      if (index !== -1) {
        bookings[index] = updatedBooking;
        localStorage.setItem('bookings', JSON.stringify(bookings));
        renderCurrentPage();
      }
    });

    socket.on('token-update', (data) => {
      localStorage.setItem('currentToken', data.currentToken);
      // If on token screen, update UI
      const tokenEl = document.getElementById('current-token-val');
      if (tokenEl) tokenEl.textContent = data.currentToken;
    });

    socket.on('news-update', (news) => {
      const ticker = document.getElementById('news-ticker');
      if (ticker) ticker.textContent = "LIVE: " + news[news.length - 1];
    });

    socket.on('notification', (notif) => {
      addNotification(notif.title, notif.message, notif.type);
    });

    socket.on('token-updated', (token) => {
      window.updateQueueUI(token);
    });
  }
}

window.updateToken = function (change) {
  if (socket) socket.emit('update-token', change);
};

window.callPriorityToken = function () {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const nextPriority = bookings.find(b => b.isPriority && b.status === 'booked');
  if (nextPriority) {
    const token = (nextPriority.id % 50) + 10;
    if (socket) socket.emit('set-token', token);
    alert(`Priority Service: Calling Token #${token} (${nextPriority.customerName}) 🌟`);
  } else {
    alert("No priority bookings pending.");
  }
};

window.updateQueueUI = function (nowServing) {
  const user = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user && (user.role === 'admin' || user.role === 'gov');

  const nowElAdmin = document.getElementById('current-token-val');
  if (nowElAdmin) nowElAdmin.textContent = `#${nowServing}`;

  const nowElLive = document.getElementById('live-token-now');
  if (nowElLive) {
    nowElLive.textContent = `#${nowServing}`;

    if (isAdmin) {
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const pendingCount = bookings.filter(b => b.status === 'confirmed').length;
      const qLenEl = document.getElementById('queue-length-val');
      if (qLenEl) qLenEl.textContent = pendingCount;

      const hintEl = document.getElementById('queue-status-hint');
      if (hintEl && !hintEl.onclick) {
        hintEl.textContent = "NEXT TOKEN →";
      }
    } else {
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const myBooking = bookings.find(b => b.customerName === user.name && b.status === 'confirmed');

      const myTokenEl = document.getElementById('my-token-val');
      const hintEl = document.getElementById('queue-status-hint');

      if (myBooking && myTokenEl && hintEl) {
        const myToken = (myBooking.id % 50) + 10;
        myTokenEl.textContent = `#${myToken}`;

        const diff = myToken - nowServing;
        if (diff < 0) {
          hintEl.textContent = "Your turn passed!";
          hintEl.style.background = "var(--danger)";
        } else if (diff === 0) {
          hintEl.textContent = "It's your turn! GO NOW!";
          hintEl.style.background = "var(--success)";
        } else if (diff <= 3) {
          hintEl.textContent = "Almost there! Get ready.";
          hintEl.style.background = "var(--accent)";
        } else {
          hintEl.textContent = `${diff} people ahead of you.`;
          hintEl.style.background = "var(--primary)";
        }
      } else if (myTokenEl && hintEl) {
        myTokenEl.textContent = "#--";
        hintEl.textContent = "No active booking.";
        hintEl.style.background = "#94a3b8";
      }
    }
  }
};

// --- AI Video Guide Support ---
window.showAIVideoGuide = function () {
  const modal = document.getElementById('ai-video-modal');
  if (modal) {
    modal.style.display = 'flex';
    const currentLang = localStorage.getItem('language') || 'en';
    switchVideoLanguage(currentLang);
  }
};

window.closeAIVideoModal = function () {
  const modal = document.getElementById('ai-video-modal');
  const video = document.getElementById('ai-guide-video');
  if (modal) modal.style.display = 'none';
  if (video) {
    video.pause();
    video.currentTime = 0;
  }
};

window.switchVideoLanguage = function (lang) {
  const title = document.getElementById('video-guide-title');
  const desc = document.getElementById('video-guide-desc');
  const btnLang = document.getElementById('current-lang-video');

  if (lang === 'te') {
    title.innerText = 'డిజిటల్ రేషన్ యాప్‌ను ఎలా ఉపయోగించాలి';
    desc.innerText = 'మా AI అసిస్టెంట్ మీకు స్లాట్ బుకింగ్ మరియు సేకరణ ప్రక్రియ గురించి వివరిస్తారు.';
    btnLang.innerText = 'తెలుగు';
  } else {
    title.innerText = 'How to use the Digital Ration App';
    desc.innerText = 'Our AI Avatar will walk you through the slot booking and collection process.';
    btnLang.innerText = 'English';
  }
  localStorage.setItem('video_guide_lang', lang);
};

window.playGuideVideo = function () {
  const lang = localStorage.getItem('video_guide_lang') || 'en';
  const video = document.getElementById('ai-guide-video');
  const placeholder = document.getElementById('video-placeholder');

  // Simulation: Show video element and play (in real app, swap source here)
  placeholder.style.display = 'none';
  video.style.display = 'block';

  // Real voice simulation using Web Speech API for extra AI feel
  const msg = new SpeechSynthesisUtterance();
  if (lang === 'te') {
    msg.text = "నమస్తే! డిజిటల్ రేషన్ యాప్‌కు స్వాగతం. స్లాట్ బుక్ చేయడానికి బుక్ బటన్ క్లిక్ చేయండి. మీ క్యూ స్టేటస్ ఇక్కడ చూడవచ్చు.";
    msg.lang = 'te-IN';
  } else {
    msg.text = "Welcome to Digital Ration. To book a slot, click the Book button. You can track your queue status here in real-time.";
    msg.lang = 'en-US';
  }
  window.speechSynthesis.speak(msg);

  // Also try to play the video element
  video.play().catch(e => console.log("Video play simulated (No source in demo)"));
};
window.toggleNotifications = function () {
  const hub = document.getElementById('notification-hub');
  if (hub) {
    hub.classList.toggle('active');
    if (hub.classList.contains('active')) {
      document.getElementById('notif-count').textContent = '0';
      document.getElementById('notif-count').style.display = 'none';
    }
  }
};

window.addNotification = function (title, message, type = 'success') {
  const list = document.getElementById('notification-list');
  if (!list) return;

  const item = document.createElement('div');
  item.className = `notification-item ${type}`;
  item.innerHTML = `
    <h4>${title}</h4>
    <p>${message}</p>
    <span class="time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  `;

  list.insertBefore(item, list.firstChild);

  // Update badge if hub is closed
  const hub = document.getElementById('notification-hub');
  if (hub && !hub.classList.contains('active')) {
    const badge = document.getElementById('notif-count');
    badge.style.display = 'flex';
    badge.textContent = parseInt(badge.textContent) + 1;
  }

  // Trigger sound/vibrate if needed
  if ('vibrate' in navigator) navigator.vibrate(100);
};

function renderCurrentPage() {
  const path = currentPage; // Use the cleaned currentPage variable
  if (path === 'dashboard.html' && typeof window.renderCustomerBookings === 'function') window.renderCustomerBookings();
  if (path === 'admin.html' && typeof window.renderAdminDashboard === 'function') {
    window.renderAdminDashboard();
    if (typeof initCharts === 'function') initCharts();
  }
  if (path === 'gov.html' && typeof window.renderGovBookings === 'function') {
    const b = JSON.parse(localStorage.getItem('bookings') || '[]');
    window.renderGovBookings(b);
  }
}

function updateOfflineStatus(online) {
  const ticker = document.getElementById('news-ticker');
  if (ticker) {
    ticker.style.background = online ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : '#ef4444';
    ticker.textContent = online ? ticker.textContent : '📶 OFFLINE MODE: Data will sync when connected';
  }
}

let html5QrcodeScanner = null;

// Admin: Scan QR Code using Device Camera
window.adminScanQRCode = function () {
  const modal = document.getElementById('qr-scanner-modal');
  if (modal) modal.style.display = 'flex';

  if (!html5QrcodeScanner) {
    html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  }
};

window.closeAdminScanner = function () {
  const modal = document.getElementById('qr-scanner-modal');
  if (modal) modal.style.display = 'none';

  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(error => {
      console.error("Failed to clear html5QrcodeScanner. ", error);
    });
    html5QrcodeScanner = null;
  }
};

function onScanSuccess(decodedText, decodedResult) {
  try {
    let code = String(decodedText).trim();
    try {
      const data = JSON.parse(decodedText);
      if (data && data.id) {
        code = String(data.id).trim();
      }
    } catch (e) {
      // If it's not JSON, assume raw ID
    }

    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const bIndex = bookings.findIndex(b => b && b.id && String(b.id) === code);


    if (bIndex !== -1) {
      // Only process if it's currently booked or active (not already collected/expired)
      if (bookings[bIndex].status !== 'collected' && bookings[bIndex].status !== 'expired') {
        window.closeAdminScanner();
        // Trigger the item selection modal just like a manual click
        if (typeof window.markCollected === 'function') {
          window.markCollected(bookings[bIndex].id);
        } else {
          alert("Error: Verification module not loaded.");
        }
      } else {
        document.getElementById('manual-booking-id') && (document.getElementById('manual-booking-id').value = '');
        alert(`⚠️ This booking is already marked as ${bookings[bIndex].status.toUpperCase()}`);
      }
    } else {
      document.getElementById('manual-booking-id') && (document.getElementById('manual-booking-id').value = '');
      alert("❌ Error: Invalid Booking ID. Please check the number and try again.");
    }
  } catch (error) {
    console.error("Scan processing error:", error);
    document.getElementById('manual-booking-id') && (document.getElementById('manual-booking-id').value = '');
    alert("❌ An error occurred while processing the Booking ID.");
  }
}

function onScanFailure(error) {
  // handle scan failure, usually better to ignore and keep scanning
}

window.submitManualBookingId = function () {
  const inputEl = document.getElementById('manual-booking-id');
  if (inputEl && inputEl.value.trim() !== '') {
    onScanSuccess(inputEl.value.trim());
  } else {
    alert("Please enter a valid Booking ID");
  }
};

// --- Biometric Identity Verification ---
window.biometricMode = 'face';

window.setBiometricMode = function (mode) {
  window.biometricMode = mode;
  const video = document.getElementById('biometric-video');
  const finger = document.getElementById('fingerprint-icon');
  const subtitle = document.getElementById('biometric-subtitle');
  const btnFace = document.getElementById('mode-face');
  const btnFinger = document.getElementById('mode-finger');

  const lang = localStorage.getItem('language') || 'en';
  const t = translations[lang] || translations.en;

  if (mode === 'face') {
    if (video) video.style.display = 'block';
    if (finger) finger.style.display = 'none';
    if (subtitle) subtitle.innerText = t.alignFace || "Align face within the circle";
    if (btnFace) {
      btnFace.style.background = 'var(--primary)';
      btnFace.style.color = 'white';
    }
    if (btnFinger) {
      btnFinger.style.background = 'transparent';
      btnFinger.style.color = 'rgba(255,255,255,0.6)';
    }
  } else {
    if (video) video.style.display = 'none';
    if (finger) finger.style.display = 'block';
    if (subtitle) subtitle.innerText = "Place your finger on the biometric sensor";
    if (btnFinger) {
      btnFinger.style.background = 'var(--accent)';
      btnFinger.style.color = 'white';
    }
    if (btnFace) {
      btnFace.style.background = 'transparent';
      btnFace.style.color = 'rgba(255,255,255,0.6)';
    }
    const fingerInstruction = document.getElementById('finger-instruction');
    if (fingerInstruction) fingerInstruction.style.display = mode === 'finger' ? 'block' : 'none';
  }
};

window.biometricInterval = null;

window.startBiometricVerification = function (onSuccess) {
  const overlay = document.getElementById('biometric-overlay');
  const video = document.getElementById('biometric-video');
  const bar = document.getElementById('biometric-bar');
  const successMsg = document.getElementById('biometric-success');
  const title = document.getElementById('biometric-title');
  const subtitle = document.getElementById('biometric-subtitle');

  if (!overlay) return onSuccess();

  // CLEAR PREVIOUS SCAN
  if (window.biometricInterval) clearInterval(window.biometricInterval);

  const lang = localStorage.getItem('language') || 'en';
  const t = translations[lang] || translations.en;

  // Reset UI
  if (bar) bar.style.width = '0%';
  if (successMsg) successMsg.style.display = 'none';
  const continueBtn = document.getElementById('biometric-continue-btn');
  if (continueBtn) continueBtn.style.display = 'none';
  if (title) title.innerText = t.identityVerification;

  overlay.style.display = 'flex';

  const fingerInstruction = document.getElementById('finger-instruction');
  if (subtitle) {
    subtitle.innerText = window.biometricMode === 'face' ? "Waiting for Secure Camera & AI..." : "Waiting for Fingerprint Placement...";
    subtitle.style.color = "#94a3b8";
  }

  window.setBiometricMode(window.biometricMode || 'face');

  const startScan = async (stream = null) => {
    let detector = null;
    let isAIReady = false;
    let isFingerPressed = false;

    console.log("Biometric Start: Mode =", window.biometricMode);

    // Handle Fingerprint Interaction
    const fingerIcon = document.getElementById('fingerprint-icon');
    if (fingerIcon) {
      fingerIcon.onmousedown = fingerIcon.ontouchstart = () => {
        isFingerPressed = true;
        if (fingerInstruction) fingerInstruction.innerText = "SCANNING... KEEP HOLDING";
      };
      fingerIcon.onmouseup = fingerIcon.onmouseleave = fingerIcon.ontouchend = () => {
        isFingerPressed = false;
        if (fingerInstruction) fingerInstruction.innerText = "SENSING LOST - PRESS & HOLD";
      };
    }

    if (window.biometricMode === 'face' && typeof faceDetection !== 'undefined') {
      try {
        if (subtitle) subtitle.innerText = "Initializing AI Vision Detector...";
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        detector = await faceDetection.createDetector(model, {
          runtime: 'tfjs',
          maxFaces: 1
        });
        isAIReady = true;
        console.log("Face Detector Ready!");
      } catch (err) {
        console.error("AI Face Detection failed to init:", err);
        if (subtitle) subtitle.innerText = "AI Offline. Using proximity sensor...";
      }
    }

    let progress = 0;
    let faceNotVisibleTicks = 0;
    const DETECTION_THRESHOLD = 25; // ~2.5 seconds warmup

    window.biometricInterval = setInterval(async () => {
      let canProgress = false;

      if (window.biometricMode === 'face') {
        if (isAIReady && detector && video && video.readyState >= 2) {
          try {
            const faces = await detector.estimateFaces(video);
            if (faces && faces.length > 0) {
              canProgress = true;
              faceNotVisibleTicks = 0;
            } else {
              canProgress = false;
              faceNotVisibleTicks++;
            }
          } catch (e) {
            console.warn("AI Detection error:", e);
            canProgress = false;
            faceNotVisibleTicks++;
          }
        } else {
          canProgress = false;
          if (video) faceNotVisibleTicks++;
        }
      } else if (window.biometricMode === 'finger') {
        canProgress = isFingerPressed;
      }

      if (canProgress) {
        progress += 2.5;
        if (bar) bar.style.width = Math.min(progress, 100) + '%';
        if (subtitle) {
          subtitle.style.color = "";
          subtitle.innerText = progress < 30 ? (t.alignFace || "Scanning identity traits...") :
            progress < 60 ? (t.verifyingFeatures || "Analyzing biometric patterns...") :
              progress < 90 ? (t.verifyingHash || "Verifying secure hash...") :
                (t.authenticating || "Finalizing authentication...");
        }
        const faceIdent = document.getElementById('face-indicator');
        if (faceIdent && window.biometricMode === 'face') faceIdent.style.display = 'block';
      } else {
        const faceIdent = document.getElementById('face-indicator');
        if (faceIdent) faceIdent.style.display = 'none';

        if (window.biometricMode === 'face') {
          if (faceNotVisibleTicks > DETECTION_THRESHOLD) {
            if (subtitle) {
              subtitle.innerText = "🛑 FACE NOT DETECTED (STAY STILL)";
              subtitle.style.color = "#ef4444";
            }
          } else if (!isAIReady) {
            if (subtitle) subtitle.innerText = "⏳ Loading AI detector...";
          } else if (video && video.readyState < 2) {
            if (subtitle) subtitle.innerText = "📷 Starting camera stream...";
          }
        } else if (window.biometricMode === 'finger' && !isFingerPressed) {
          if (subtitle) {
            subtitle.innerText = "PLACE FINGER ON SENSOR TO CONTINUE";
            subtitle.style.color = "";
          }
        }
      }

      if (progress >= 100) {
        clearInterval(window.biometricInterval);
        console.log("Biometric Verification Successful!");
        if (subtitle) subtitle.style.color = "";
        if (fingerInstruction) fingerInstruction.style.display = 'none';
        const faceIdent = document.getElementById('face-indicator');
        if (faceIdent) faceIdent.style.display = 'none';

        title.innerText = t.verificationComplete || "BIOMETRIC SCAN COMPLETE";
        subtitle.innerText = t.identityConfirmed || "Secure Identity Confirmed";
        successMsg.style.display = 'block';

        const continueBtn = document.getElementById('biometric-continue-btn');
        if (continueBtn) {
          continueBtn.style.display = 'block';
          continueBtn.onclick = () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
            overlay.style.display = 'none';
            if (onSuccess) onSuccess();
          };
        }
      }
    }, 100);
  };

  if (window.biometricMode === 'face') {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (video) {
          video.srcObject = stream;
          const playVideo = () => {
            video.play()
              .then(() => startScan(stream))
              .catch(e => {
                console.error("Video play failed:", e);
                startScan(stream);
              });
          };

          if (video.readyState >= 3) {
            playVideo();
          } else {
            video.oncanplay = playVideo;
          }
        } else {
          startScan(stream);
        }
      })
      .catch(err => {
        console.error("Biometric access denied:", err);
        const errorMsg = err.name === 'NotAllowedError' ?
          "Camera permission denied. Please allow camera access in your browser settings." :
          "Biometric sensor (camera) not accessible or already in use.";
        alert(errorMsg + " Switching to virtual biometric mode.");
        window.setBiometricMode('finger');
        startScan();
      });
  } else {
    startScan();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Hook up Enter key for manual entry
  const manualInput = document.getElementById('manual-booking-id');
  if (manualInput) {
    manualInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        window.submitManualBookingId();
      }
    });
  }

  const savedLang = localStorage.getItem('language') || 'en';
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.value = savedLang;
  }
  applyLanguage(savedLang);
  initSocket();

  // Check authentication on protected pages
  const protectedPages = ['dashboard.html', 'booking.html', 'admin.html', 'gov.html', 'admin-stock.html', 'token-screen.html'];
  const isAdminPage = currentPage === 'admin.html' || currentPage === 'admin-stock.html';
  const isCustomerPage = currentPage === 'dashboard.html' || currentPage === 'booking.html';

  if (protectedPages.includes(currentPage)) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      if (isAdminPage) {
        const adminAccount = localStorage.getItem('adminAccount');
        window.location.href = adminAccount ? 'admin-login.html' : 'admin-signup.html';
      } else {
        window.location.href = 'customer-login.html';
      }
    } else {
      // Role-based access
      if (isAdminPage && user.role !== 'admin') {
        alert('Access denied: Admin only');
        window.location.href = 'dashboard.html';
      }

      if (isCustomerPage && user.role !== 'user') {
        alert('Access denied: Customer only');
        window.location.href = 'index.html';
      }
    }
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  }

  // Show user name in header if available
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    const userNameSpan = document.getElementById('user-name');
    if (userNameSpan) userNameSpan.textContent = user.name;
  }

  // ---------- CUSTOMER LOGIN ----------
  if (currentPage === 'customer-login.html') {
    const form = document.getElementById('customer-login-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rationCard = document.getElementById('ration-card').value.trim();
        console.log("Real-time Login Attempt for Card:", rationCard);

        try {
          const response = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rationCard })
          });

          const result = await response.json();

          if (response.ok) {
            let familyList = [{ name: result.name, relation: 'Self' }];
            if (result.rationCard === '231234567890') {
              familyList.push(
                { name: 'Srilatha', relation: 'Spouse' },
                { name: 'Radha', relation: 'Child' },
                { name: 'Balarama', relation: 'Child' }
              );
            } else if (result.rationCard === '214785236985') {
              familyList.push(
                { name: 'Lakshmi', relation: 'Spouse' },
                { name: 'Mahesh', relation: 'Child' },
                { name: 'Divya', relation: 'Child' },
                { name: 'Teja', relation: 'Child' }
              );
            } else if (result.rationCard === '258741369258') {
              familyList.push(
                { name: 'Anusha', relation: 'Spouse' },
                { name: 'Rohit', relation: 'Child' }
              );
            } else if (result.rationCard === '241478529632') {
              familyList.push(
                { name: 'Kavya', relation: 'Spouse' },
                { name: 'Akhil', relation: 'Child' },
                { name: 'Harsha', relation: 'Child' }
              );
            } else if (result.rationCard === '269631478965') {
              familyList.push(
                { name: 'Rani', relation: 'Spouse' },
                { name: 'Siva', relation: 'Child' },
                { name: 'Priya', relation: 'Child' }
              );
            } else if (result.rationCard === '314159265358') {
              familyList.push(
                { name: 'Sujatha', relation: 'Spouse' }
              );
            } else if (result.rationCard === '271828182845') {
              familyList.push(
                { name: 'Ramesh', relation: 'Spouse' },
                { name: 'Arjun', relation: 'Child' },
                { name: 'Bhuvana', relation: 'Child' },
                { name: 'Chetan', relation: 'Child' },
                { name: 'Devi', relation: 'Child' }
              );
            } else {
              const membersCount = result.family_members || 4;
              for (let i = 1; i < membersCount; i++) {
                familyList.push({ name: 'Family Member ' + i, relation: 'Dependent' });
              }
            }

            // TRIGGER BIOMETRIC SCAN BEFORE REDIRECT
            window.startBiometricVerification(() => {
              // SAVE SESSION ONLY AFTER CONFIRMATION
              localStorage.setItem('user', JSON.stringify({
                name: result.name,
                role: 'user',
                rationCard: result.rationCard,
                phone: result.userData.phone || '+918247087380'
              }));

              localStorage.setItem('userData_' + result.rationCard, JSON.stringify({
                ...result.userData,
                family: result.userData.family || familyList,
                quota: result.quota
              }));

              window.location.href = 'dashboard.html';
            });
          } else {
            alert(result.error || "Login Failed");
          }
        } catch (err) {
          console.warn("Backend disconnected. Using Local Fallback Mode for Login:", err);

          // Fallback login
          let userName = "Demo User";
          if (rationCard === '231234567890') userName = "Ganesh";
          else if (rationCard === '214785236985') userName = "Srinu";
          else if (rationCard === '258741369258') userName = "Kiran";
          else if (rationCard === '241478529632') userName = "Vamsi";
          else if (rationCard === '269631478965') userName = "Bhanu";
          else if (rationCard === '314159265358') userName = "Ramesh";
          else if (rationCard === '271828182845') userName = "Lakshmi";

          const userPhone = "+918247087380";

          let fallbackFamily = [{ name: userName, relation: 'Self' }];
          if (rationCard === '231234567890') {
            fallbackFamily.push(
              { name: 'Srilatha', relation: 'Wife' },
              { name: 'Radha', relation: 'Child' },
              { name: 'Balarama', relation: 'Child' }
            );
          } else if (rationCard === '214785236985') {
            fallbackFamily.push(
              { name: 'Lakshmi', relation: 'Spouse' },
              { name: 'Mahesh', relation: 'Child' },
              { name: 'Divya', relation: 'Child' },
              { name: 'Teja', relation: 'Child' }
            );
          } else if (rationCard === '258741369258') {
            fallbackFamily.push(
              { name: 'Anusha', relation: 'Spouse' },
              { name: 'Rohit', relation: 'Child' }
            );
          } else if (rationCard === '241478529632') {
            fallbackFamily.push(
              { name: 'Kavya', relation: 'Spouse' },
              { name: 'Akhil', relation: 'Child' },
              { name: 'Harsha', relation: 'Child' }
            );
          } else if (rationCard === '269631478965') {
            fallbackFamily.push(
              { name: 'Rani', relation: 'Spouse' },
              { name: 'Siva', relation: 'Child' },
              { name: 'Priya', relation: 'Child' }
            );
          } else if (rationCard === '314159265358') {
            fallbackFamily.push(
              { name: 'Sujatha', relation: 'Spouse' }
            );
          } else if (rationCard === '271828182845') {
            fallbackFamily.push(
              { name: 'Ramesh', relation: 'Spouse' },
              { name: 'Arjun', relation: 'Child' },
              { name: 'Bhuvana', relation: 'Child' },
              { name: 'Chetan', relation: 'Child' },
              { name: 'Devi', relation: 'Child' }
            );
          } else {
            for (let i = 1; i < 4; i++) {
              fallbackFamily.push({ name: 'Family Member ' + i, relation: 'Dependent' });
            }
          }

          // TRIGGER BIOMETRIC SCAN BEFORE REDIRECT
          window.startBiometricVerification(() => {
            // SAVE SESSION ONLY AFTER CONFIRMATION
            localStorage.setItem('user', JSON.stringify({
              name: userName,
              role: 'user',
              rationCard: rationCard,
              phone: userPhone
            }));

            localStorage.setItem('userData_' + rationCard, JSON.stringify({
              name: userName,
              rationCard: rationCard,
              family: fallbackFamily,
              quota: { rice: 10, wheat: 5, sugar: 2, oil: 2, dal: 1 }
            }));

            window.location.href = 'dashboard.html';
          });
        }
      });
    }
  }

  // ---------- CUSTOMER DASHBOARD ----------
  // Consolidated definition for rendering customer bookings and dashboard elements
  window.renderCustomerBookings = function () {
    const displayNameEl = document.getElementById('display-name');
    const familyList = document.getElementById('family-list');
    const quotaGrid = document.getElementById('quota-grid');
    const tbody = document.getElementById('customer-bookings-body');
    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.rationCard) {
      const userData = JSON.parse(localStorage.getItem('userData_' + user.rationCard));
      if (userData) {
        if (displayNameEl) displayNameEl.textContent = userData.name;

        if (familyList) {
          familyList.innerHTML = '';
          userData.family.forEach(member => {
            const li = document.createElement('li');
            li.style.padding = "4px 0";
            li.style.fontSize = "0.95rem";
            li.style.color = "#334155";
            li.innerHTML = `👤 <strong>${member.name}</strong>`;
            familyList.appendChild(li);
          });
        }

        if (quotaGrid) {
          const lang = localStorage.getItem('language') || 'en';
          const t = translations[lang];

          const items = [
            { key: 'rice', color: '#3498db', icon: '🍚', val: userData.quota.rice },
            { key: 'wheat', color: '#9b59b6', icon: '🌾', val: userData.quota.wheat },
            { key: 'sugar', color: '#f1c40f', icon: '🍬', val: userData.quota.sugar },
            { key: 'oil', color: '#e67e22', icon: '🧴', val: userData.quota.oil || (userData.family_members || 4) },
            { key: 'dal', color: '#1abc9c', icon: '🥣', val: userData.quota.dal || (userData.family_members || 4) },
            { key: 'salt', color: '#e74c3c', icon: '🧂', val: userData.quota.salt || 1 },
            { key: 'soap', color: '#2ecc71', icon: '🧼', val: userData.quota.soap || 2 }
          ];

          quotaGrid.innerHTML = items.map(item => `
            <div class="card stat-card" style="border-left: 4px solid ${item.color}; padding: 1.5rem 1rem; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 12px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; min-height: 120px;">
              <div style="background: #f8fafc; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 0.75rem;">
                ${item.icon}
              </div>
              <div style="font-size: 0.9rem; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">
                ${t[item.key] || item.key}
              </div>
            </div>
          `).join('');
        }

        // Initialize Map with dynamic AP location
        initDashboardMap(userData.district || 'Vijayawada');

        // SMART RE-BOOK AI LOGIC
        const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
        const expired = allBookings.find(b => b.rationCard === user.rationCard && b.status === 'expired');

        if (expired && !localStorage.getItem('suggestion_shown_' + expired.id)) {
          const suggestion = document.createElement('div');
          suggestion.className = 'card glass-card ai-suggestion-box';
          suggestion.style.marginTop = '2rem';
          suggestion.innerHTML = `
                <div class="ai-avatar">🤖</div>
                <h3 style="margin-bottom: 0.5rem; position: relative; z-index: 1;">Smart Re-book AI Assistance</h3>
                <p style="margin-bottom: 1.5rem; font-size: 0.95rem; opacity: 0.9; position: relative; z-index: 1;">
                    Namaste ${userData.name}! We noticed you missed your slot on <strong>${expired.date}</strong>. 
                    The shop is empty right now – would you like to book for the next 1 hour?
                </p>
                <div style="display: flex; gap: 1rem; position: relative; z-index: 1;">
                    <a href="booking.html" class="btn" style="background:var(--success); border:none;">Yes, Book Now 🔄</a>
                    <button class="btn btn-secondary" onclick="this.closest('.ai-suggestion-box').remove()" style="background:rgba(255,255,255,0.1); border:none;">Maybe Later</button>
                </div>
            `;
          document.querySelector('.container').prepend(suggestion);
          localStorage.setItem('suggestion_shown_' + expired.id, 'true');
        }
      }
    }

    if (tbody) {
      const allBookings = refreshExpiredBookings();
      const myBookings = user ? allBookings.filter(b => b.rationCard === user.rationCard) : [];

      tbody.innerHTML = '';
      if (myBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No bookings yet.</td></tr>';
      } else {
        myBookings.forEach(b => {
          const showQr = b.status === 'booked' || b.status === 'collected' || b.status === 'rebooked' || b.status === 'Active';
          const payload = encodeURIComponent(JSON.stringify({
            id: b.id,
            name: b.customerName,
            date: b.date,
            time: b.time
          }));
          const qrUrlSm = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${payload}`;
          const qrUrlLg = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${payload}`;

          const qrImg = showQr
            ? `<div style="text-align:center; display:flex; flex-direction:column; align-items:center; gap:6px;">
                 <img src="${qrUrlSm}" alt="QR code" style="width:70px; height:70px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                 <button class="btn" style="padding: 4px 8px; font-size: 0.7rem; background: #3b82f6; border: none; border-radius: 4px;" onclick="window.downloadOfflineQR('${qrUrlLg}', '${b.id}')">⬇️ Download QR</button>
               </div>`
            : `<span style="color:#94a3b8; font-size:0.8rem; font-style:italic;">${translations[localStorage.getItem('language') || 'en'][b.status] || b.status}</span>`;

          let itemsText = '-';
          const sel = b.selectedItems || ['rice', 'wheat', 'sugar', 'oil'];
          if (sel && sel.length > 0) {
            const uData = JSON.parse(localStorage.getItem('userData_' + (b.rationCard || '1234567890'))) || {};
            const members = uData.family_members || (uData.family ? uData.family.length : 4);
            let textParts = [];
            if (sel.includes('rice')) textParts.push(`🍚 ${members * 5}kg`);
            if (sel.includes('wheat')) textParts.push(`🌾 ${members * 1}kg`);
            if (sel.includes('sugar')) textParts.push(`🍬 ${members * 0.5}kg`);
            if (sel.includes('oil')) textParts.push(`🧴 1L`);
            if (sel.includes('dal')) textParts.push(`🥣 1kg`);
            if (sel.includes('salt')) textParts.push(`🧂 1kg`);
            if (sel.includes('soap')) textParts.push(`🧼 2pcs`);
            itemsText = textParts.join(', ') || 'None';
          }

          const row = document.createElement('tr');
          row.innerHTML = `
              <td style="font-size: 0.85rem; color: #64748b; font-family: monospace;">#${b.id}</td>
              <td>${b.date}</td>
              <td>${b.time}</td>
              <td style="font-size: 0.8rem; color: #64748b; font-weight: 500;">${itemsText}</td>
              <td><span class="badge badge-${b.status.toLowerCase()}">${translations[localStorage.getItem('language') || 'en'][b.status] || b.status}</span></td>
              <td>${qrImg}</td>
            `;
          tbody.appendChild(row);
        });
      }
    }
  };

  if (window.location.pathname.includes('dashboard.html')) {
    window.renderCustomerBookings();
  }

  // ---------- BOOKING PAGE ----------
  if (window.location.pathname.includes('booking.html')) {
    const dateInput = document.getElementById('booking-date');
    const slotsContainer = document.getElementById('slots-container');
    const bookBtn = document.getElementById('book-btn');
    const pauseBanner = document.getElementById('pause-banner');

    if (!dateInput || !slotsContainer || !bookBtn) return;

    // Check if bookings are paused
    if (localStorage.getItem('bookingsPaused') === 'true') {
      pauseBanner.style.display = 'block';
      bookBtn.disabled = true;
    } else {
      pauseBanner.style.display = 'none';
      bookBtn.disabled = false;
    }


    // Set date range (from today for next 7 days)
    const today = new Date();
    const shopClosingHour = 17; // 5 PM

    // If it's past shop closing time today, default to tomorrow
    let defaultDate = new Date(today);
    if (today.getHours() >= shopClosingHour) {
      defaultDate.setDate(today.getDate() + 1);
    }

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const toISODate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // If it's past 5 PM, today shouldn't be selectable as its expired
    if (today.getHours() >= shopClosingHour) {
      dateInput.min = toISODate(defaultDate);
    } else {
      dateInput.min = toISODate(today);
    }

    dateInput.max = toISODate(nextWeek);
    if (!dateInput.value) dateInput.value = toISODate(defaultDate);

    // Mock slots
    const slots = [
      { time: '8–9 AM', capacity: 30, booked: 15 },
      { time: '9–10 AM', capacity: 30, booked: 20 },
      { time: '10–11 AM', capacity: 30, booked: 10 },
      { time: '11–12 PM', capacity: 30, booked: 25 },
      { time: '12–1 PM', capacity: 30, booked: 5 },
      { time: '1–2 PM', capacity: 30, booked: 18 },
      { time: '2–3 PM', capacity: 30, booked: 12 },
      { time: '3–4 PM', capacity: 30, booked: 8 },
      { time: '4–5 PM', capacity: 30, booked: 6 },
    ];

    function renderSlots(slotData) {
      slotsContainer.innerHTML = '';

      // AI Prediction logic: Find least booked slot
      const availableSlots = slotData.filter(s => s.booked < s.capacity);
      const bestSlot = availableSlots.sort((a, b) => a.booked - b.booked)[0];

      slotData.forEach((slot, index) => {
        const isBest = bestSlot && slot.time === bestSlot.time;
        const rushPercent = Math.round((slot.booked / slot.capacity) * 100);

        // EXTRA CHECK: Disable past slots if booking for TODAY
        const isToday = dateInput.value === toISODate(new Date());
        let isPastSlot = false;
        if (isToday) {
          const currentHour = new Date().getHours();
          const timeParts = slot.time.split('–');
          const endStr = timeParts[1].trim(); // e.g. "9 AM" or "12 PM"
          const endStrParts = endStr.split(' ');
          let endHour = parseInt(endStrParts[0]);
          const endAmpm = endStrParts[1];
          if (endAmpm === 'PM' && endHour !== 12) endHour += 12;
          if (endAmpm === 'AM' && endHour === 12) endHour = 0;

          if (currentHour >= endHour) isPastSlot = true;
        }

        const slotDiv = document.createElement('div');
        slotDiv.className = `slot-card ${(slot.booked >= slot.capacity || isPastSlot) ? 'disabled' : ''}`;
        if (isBest) slotDiv.style.border = '2px dashed var(--success)';

        slotDiv.dataset.index = index;
        slotDiv.innerHTML = `
            ${isBest ? `<span style="background:var(--success); color:white; font-size:0.6rem; padding:2px 6px; border-radius:10px; position:absolute; top:-10px; left:50%; transform:translateX(-50%);">AI SUGGESTED</span>` : ''}
            <strong>${slot.time}</strong>
            <span style="font-size:0.7rem; color:${(rushPercent > 80 || isPastSlot) ? 'var(--danger)' : 'var(--text-muted)'}">
              ${isPastSlot ? '🚫 Passed' : (rushPercent > 80 ? '🔥 High Rush' : `${slot.capacity - slot.booked} spots left`)}
            </span>
          `;
        slotDiv.style.position = 'relative';

        slotDiv.addEventListener('click', () => {
          if (!slotDiv.classList.contains('disabled')) {
            document.querySelectorAll('.slot-card').forEach(s => s.classList.remove('selected'));
            slotDiv.classList.add('selected');
          }
        });
        slotsContainer.appendChild(slotDiv);
      });
    }

    function checkDailyLimit(selectedDate) {
      const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const dailyBookings = allBookings.filter(b => b.date === selectedDate && b.status === 'booked');
      return dailyBookings.length < 270;
    }

    dateInput.addEventListener('change', () => {
      const selectedDate = dateInput.value;
      if (selectedDate) {
        if (!checkDailyLimit(selectedDate)) {
          slotsContainer.innerHTML = '<p style="color:red;">Daily limit reached. No slots available.</p>';
          bookBtn.disabled = true;
        } else {
          bookBtn.disabled = false;
          renderSlots(slots);
        }
      }
    });

    // Trigger initial render
    dateInput.dispatchEvent(new Event('change'));

    // Real-time slot update for today (every minute)
    setInterval(() => {
      if (dateInput.value === toISODate(new Date())) {
        const selectedSlot = document.querySelector('.slot-card.selected');
        const selectedIndex = selectedSlot ? selectedSlot.dataset.index : null;

        renderSlots(slots);

        if (selectedIndex !== null) {
          const reSelected = document.querySelector(`.slot-card[data-index="${selectedIndex}"]`);
          if (reSelected && !reSelected.classList.contains('disabled')) {
            reSelected.classList.add('selected');
          }
        }
      }
    }, 60000);

    bookBtn.addEventListener('click', async () => {
      if (localStorage.getItem('bookingsPaused') === 'true') {
        alert('Bookings are currently paused due to server issue.');
        return;
      }

      const selected = document.querySelector('.slot-card.selected');
      if (!selected) {
        alert('Please select a time slot.');
        return;
      }

      const selectedIndex = parseInt(selected.dataset.index, 10);
      const slot = slots[selectedIndex];
      const date = dateInput.value;
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        alert('You must be logged in.');
        return;
      }

      const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]');

      // --- FRAUD DETECTION LOGIC ---

      // 1. Multiple Active Bookings Detection
      const userActiveBookings = allBookings.filter(b =>
        b.rationCard === user.rationCard &&
        (b.status === 'booked' || b.status === 'rebooked')
      );
      if (userActiveBookings.length > 0) {
        alert(`🚨 FRAUD ALERT: You already have an active booking for ${userActiveBookings[0].date}. Multiple active bookings are strictly prohibited to prevent hoarding. Please use or cancel your existing booking first.`);
        return;
      }

      // 2. Duplicate Ration Card Detection (Ensures card isn't used twice for same date)
      const rationCard = user.rationCard || '1234567890';
      const duplicateCard = allBookings.find(b => b.rationCard === rationCard && b.date === date && b.status !== 'cancelled');
      if (duplicateCard) {
        alert("🚨 DUPLICATE CARD ALERT: This ration card has already been used for a booking on this date.");
        return;
      }

      // 3. Over-distribution Alert (Daily capacity check)
      if (!checkDailyLimit(date)) {
        alert("⚠️ CAPACITY ALERT: Shop daily distribution limit reached. Please select a different date.");
        return;
      }

      const isEmergency = document.getElementById('emergency-booking').checked;

      const selectedItems = Array.from(document.querySelectorAll('input[name="booking_items"]:checked')).map(el => el.value);

      if (selectedItems.length === 0) {
        alert("Please select at least one item to book.");
        return;
      }

      // --- CONFIRMATION MODAL LOGIC ---
      const confirmOverlay = document.createElement('div');
      confirmOverlay.style.position = 'fixed';
      confirmOverlay.style.top = '0';
      confirmOverlay.style.left = '0';
      confirmOverlay.style.width = '100%';
      confirmOverlay.style.height = '100%';
      confirmOverlay.style.background = 'rgba(0,0,0,0.6)';
      confirmOverlay.style.display = 'flex';
      confirmOverlay.style.flexDirection = 'column';
      confirmOverlay.style.alignItems = 'center';
      confirmOverlay.style.justifyContent = 'center';
      confirmOverlay.style.zIndex = '999999';
      confirmOverlay.style.backdropFilter = 'blur(4px)';

      const displayItems = selectedItems.length > 0 ? selectedItems.join(', ').toUpperCase() : 'None';
      const collectorName = user.name;

      confirmOverlay.innerHTML = `
        <div style="background:white; padding:2rem; border-radius:16px; text-align:center; max-width:90%; width: 400px; color:#1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <h2 style="margin-bottom:15px; color:#3b82f6; font-weight:800;">Review Details</h2>
          <div style="text-align: left; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
            <p style="margin: 8px 0; font-size: 1.05rem;"><strong>📅 Date:</strong> ${date}</p>
            <p style="margin: 8px 0; font-size: 1.05rem;"><strong>⏰ Time:</strong> ${slot.time}</p>
            <p style="margin: 8px 0; font-size: 1.05rem;"><strong>🛒 Items:</strong> ${displayItems}</p>
            <p style="margin: 8px 0; font-size: 1.05rem;"><strong>👤 Collector:</strong> ${collectorName}</p>
          </div>
          <div style="display: flex; gap: 10px; justify-content: center;">
             <button id="btn-confirm-yes" class="btn" style="flex: 1; background:#10b981; color:white; border:none; padding:12px; font-weight:bold; font-size:1.1rem;">Confirm ✅</button>
             <button id="btn-confirm-no" class="btn btn-secondary" style="flex: 1; background:#e2e8f0; color:#475569; border:none; padding:12px; font-weight:bold; font-size:1.1rem;">Cancel ❌</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmOverlay);

      document.getElementById('btn-confirm-no').addEventListener('click', () => {
        document.body.removeChild(confirmOverlay);
      });

      document.getElementById('btn-confirm-yes').addEventListener('click', async () => {
        document.body.removeChild(confirmOverlay);

        const newBooking = {
          id: Date.now(),
          customerName: user.name,
          collectorName: user.name,
          rationCard: rationCard,
          role: user.role,
          phone: user.phone || '+918247087380', // Updated to your number
          date,
          time: slot.time,
          status: 'booked',
          emergency: isEmergency,
          selectedItems: selectedItems
        };

        allBookings.push(newBooking);
        localStorage.setItem('bookings', JSON.stringify(allBookings));

        // --- SYNC TO BACKEND CLOUD ---
        const userData = JSON.parse(localStorage.getItem('userData_' + (user.rationCard || '1234567890'))) || {};
        const ageCap = Math.floor(Math.random() * 50) + 20; // Simulated age check

        let finalBooking = newBooking;
        try {
          const response = await fetch(`${BACKEND_URL}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...newBooking,
              age: userData.age || ageCap,
              district: userData.district || 'Hyderabad',
              family_members: userData.family_members || 3,
              monthly_income: userData.monthly_income || 5000,
              rice_quota_kg: userData.rice_quota_kg || ((userData.family_members || 3) * 5),
              wheat_quota_kg: userData.wheat_quota_kg || ((userData.family_members || 3) * 1),
              sugar_quota_kg: userData.sugar_quota_kg || ((userData.family_members || 3) * 0.5),
              gas_connection: userData.gas_connection || 'Yes',
              accountStatus: userData.status || 'Active'
            })
          });

          if (response.ok) {
            finalBooking = await response.json();
          }
        } catch (err) {
          console.error('Cloud Sync Failed:', err);
        }

        // --- MULTI-CHANNEL NOTIFICATIONS (Simulated APIs) ---
        const customerPhone = user.phone || '9988776655';
        const message = `Hello ${user.name}, your ration slot is confirmed for ${date} at ${slot.time}. Booking ID: ${finalBooking.id}. Thank you - Digital Ration Team.`;

        sendSMSNotification(customerPhone, message);
        sendWhatsAppNotification(customerPhone, message);

        // triggerNativeNotification('✅ Ration Confirmed', `Booking ${finalBooking.id} is confirmed for ${date}. ID: ${finalBooking.id}`); // Keeping this logic from original
        if ('Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('✅ Ration Confirmed', {
              body: `Booking ${finalBooking.id} confirmed for ${date}.`,
              icon: 'assets/icon-192.png'
            });
          });
        }

        const payload = encodeURIComponent(JSON.stringify({
          id: finalBooking.id,
          name: finalBooking.customerName,
          date: finalBooking.date,
          time: finalBooking.time
        }));
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${payload}`;

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,1)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '999999';
        overlay.innerHTML = `
        <div style="background:white; padding:2rem; border-radius:16px; text-align:center; max-width:90%; color:#1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="font-size:3rem; margin-bottom:10px;">✅</div>
          <h2 style="color:var(--success); margin-bottom:10px; font-weight:800;">Booking Confirmed!</h2>
          <p style="margin-bottom:15px; font-size:1.1rem;">ID: <strong>${finalBooking.id}</strong> | ${date} at ${slot.time}</p>
          
          <div style="background:#fee2e2; border-left:4px solid var(--danger); padding:10px; border-radius:8px; margin-bottom:20px; text-align:left;">
            <p style="color:var(--danger); font-size:0.95rem; font-weight:700; margin:0;">⚠️ OFFLINE MODE READY</p>
            <p style="color:#991b1b; font-size:0.85rem; margin:5px 0 0 0;">Download this QR Code now. If the shop loses internet or you don't have signal, just show the saved image!</p>
          </div>
          
          <img src="${qrUrl}" style="width:220px; height:220px; margin-bottom:20px; border-radius:12px; border:4px solid #f1f5f9; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <br>
          <button class="btn" style="background:#3b82f6; width:100%; border:none; padding:12px; font-size:1.1rem; margin-bottom:12px; font-weight:bold;" onclick="window.downloadOfflineQR('${qrUrl}', '${finalBooking.id}')">⬇️ Download to Gallery</button>
          <button class="btn btn-secondary" style="width:100%; padding:10px; border:none; background:#f1f5f9; color:#475569;" onclick="window.location.href='dashboard.html'">Go to Dashboard</button>
        </div>
      `;
        document.body.appendChild(overlay);

      }); // End of btn-confirm-yes listener
    });



  }

  // ---------- NOTIFICATION APIS (Simulated) ----------
  function sendSMSNotification(phone, message) {
    console.log(`%c 📲 SMS GATEWAY: Sent to ${phone}`, "color: #3b82f6; font-weight: bold;");
    updateTickerNotification(`📲 SMS sent to ${phone.slice(-4)}XXXX`);
  }

  function sendWhatsAppNotification(phone, message) {
    console.log(`%c 💬 WHATSAPP API: Sent to ${phone}`, "color: #10b981; font-weight: bold;");
    setTimeout(() => {
      updateTickerNotification(`💬 WhatsApp sent to ${phone.slice(-4)}XXXX`);
    }, 2000);
  }

  function updateTickerNotification(text) {
    const ticker = document.getElementById('news-ticker');
    if (ticker) {
      const originalText = ticker.textContent;
      ticker.textContent = text;
      ticker.style.background = "var(--primary)";
      ticker.style.color = "white";
      setTimeout(() => {
        ticker.textContent = originalText;
        ticker.style.background = "";
        ticker.style.color = "";
      }, 4000);
    }
  }

  // ---------- CUSTOMER DASHBOARD ----------
  if (window.location.pathname.includes('dashboard.html')) {
    window.renderCustomerBookings();
  }


  // ---------- ADMIN DASHBOARD ----------
  window.renderAdminDashboard = function () {
    if (!window.location.pathname.includes('admin.html')) return;
    const bookingsList = document.getElementById('bookings-list');
    const pauseBtn = document.getElementById('pause-bookings-btn');

    if (pauseBtn) {
      const isPaused = localStorage.getItem('bookingsPaused') === 'true';
      pauseBtn.textContent = isPaused ? 'Resume Bookings' : 'Pause New Bookings';
      pauseBtn.addEventListener('click', () => {
        const paused = localStorage.getItem('bookingsPaused') !== 'true';
        localStorage.setItem('bookingsPaused', paused);
        pauseBtn.textContent = paused ? 'Resume Bookings' : 'Pause New Bookings';

        if (paused) {
          // Server Issue Feature: Simulate sending notification
          const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
          const today = new Date().toISOString().split('T')[0];
          const affected = bookings.filter(b => b.date === today && b.status === 'booked');

          if (affected.length > 0) {
            alert(`System Notification Sent to ${affected.length} customers: "Due to technical issue, your slot is rescheduled"`);
          } else {
            alert('Bookings paused. No pending bookings for today to notify.');
          }
        } else {
          alert('Bookings resumed.');
        }
      });
    }

    let bookings = refreshExpiredBookings();
    // Sort bookings by priority, date and then time
    bookings.sort((a, b) => {
      if (a.isPriority !== b.isPriority) return b.isPriority - a.isPriority;
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });

    const today = new Date().toISOString().split('T')[0];
    const allTodayBookings = bookings.filter(b => b.date === today);
    const todayBookings = allTodayBookings.filter(b => b.status === 'booked' || b.status === 'active' || b.status === 'confirmed');
    const historyAndFuture = bookings.filter(b => b.date !== today || (b.status !== 'booked' && b.status !== 'active' && b.status !== 'confirmed'));

    const currentHour = new Date().getHours();
    let currentSlot = '';
    if (currentHour >= 8 && currentHour < 17) {
      const h1 = currentHour > 12 ? currentHour - 12 : currentHour;
      const h2 = (currentHour + 1) > 12 ? (currentHour + 1) - 12 : (currentHour + 1);
      const ampm = currentHour >= 12 ? 'PM' : 'AM';
      currentSlot = `${h1}–${h2} ${ampm}`;
    }

    const allToday = bookings.filter(b => b.date === today);
    const servedToday = allToday.filter(b => b.status === 'collected').length;
    const pendingToday = todayBookings.length;

    const todayTotalEl = document.getElementById('today-total');
    const currentHourEl = document.getElementById('current-hour-bookings');
    const servedTodayEl = document.getElementById('served-today');
    const pendingTodayEl = document.getElementById('pending-today');

    if (todayTotalEl) todayTotalEl.textContent = allTodayBookings.length;
    if (currentHourEl) {
      const currentHourCount = todayBookings.filter(b => b.time === currentSlot && b.status === 'booked').length;
      currentHourEl.textContent = currentHourCount;
    }
    if (servedTodayEl) servedTodayEl.textContent = servedToday;
    if (pendingTodayEl) pendingTodayEl.textContent = pendingToday;



    // Render Pending bookings 
    if (bookingsList) {
      bookingsList.innerHTML = '';
      renderBookingRows(todayBookings, bookingsList);
    }

    // Render History & Future
    const futureList = document.getElementById('future-list');
    if (futureList) {
      futureList.innerHTML = '';
      renderBookingRows(historyAndFuture, futureList);
    }

    // AI Inventory Forecast
    window.renderInventoryForecast();


  };


  window.renderInventoryForecast = function () {
    const grid = document.getElementById('forecast-grid');
    if (!grid) return;

    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const collected = bookings.filter(b => b.status === 'collected');

    const lang = localStorage.getItem('language') || 'en';
    const items = [
      { id: 'rice', icon: '🍚', label: translations[lang].rice || 'Rice', unit: 'kg', base: 5 },
      { id: 'wheat', icon: '🌾', label: translations[lang].wheat || 'Wheat', unit: 'kg', base: 1 },
      { id: 'sugar', icon: '🍬', label: translations[lang].sugar || 'Sugar', unit: 'kg', base: 0.5 },
      { id: 'oil', icon: '🧴', label: translations[lang].oil || 'Palm Oil', unit: 'L', base: 1 },
      { id: 'dal', icon: '🥣', label: translations[lang].dal || 'Dal', unit: 'kg', base: 1 },
      { id: 'salt', icon: '🧂', label: translations[lang].salt || 'Salt', unit: 'kg', base: 1 },
      { id: 'soap', icon: '🧼', label: translations[lang].soap || 'Soap', unit: 'pcs', base: 2 }
    ];

    grid.innerHTML = '';

    items.forEach(item => {
      let consumed = 0;
      collected.forEach(b => {
        const sel = b.selectedItems || ['rice', 'wheat', 'sugar', 'oil', 'dal', 'salt', 'soap'];
        if (sel.includes(item.id)) {
          const members = b.family_members || 4;
          const q = (item.id === 'oil' || item.id === 'dal' || item.id === 'salt' || item.id === 'soap') ? item.base : members * item.base;
          consumed += q;
        }
      });

      // AI Baseline: if no data, predict based on a hypothetical 50 family units
      if (consumed === 0) consumed = 50 * item.base * 4;

      const prediction = Math.ceil(consumed * 1.15); // 15% safety buffer

      const card = document.createElement('div');
      card.style = "background: white; padding: 12px; border-radius: 10px; text-align: center; border: 1px solid #edf2f7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s;";
      card.onmouseover = () => card.style.transform = 'translateY(-5px)';
      card.onmouseout = () => card.style.transform = 'translateY(0)';

      card.innerHTML = `
            <div style="font-size: 1.5rem; margin-bottom: 5px;">${item.icon}</div>
            <div style="font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${item.label}</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #1e293b; margin: 5px 0;">${prediction}${item.unit}</div>
            <div style="font-size: 0.6rem; color: #10b981; font-weight: 700; background: #ecfdf5; display: inline-block; padding: 2px 6px; border-radius: 4px;">📈 +15% Safe</div>
        `;
      grid.appendChild(card);
    });
  };


  function renderBookingRows(data, container) {
    if (data.length === 0) {
      container.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#64748b;">No bookings found</td></tr>';
      return;
    }



    const lang = localStorage.getItem('language') || 'en';
    data.forEach(b => {
      const row = document.createElement('tr');
      if (b.isPriority) {
        row.style.background = 'rgba(234, 179, 8, 0.1)';
        row.style.borderLeft = '4px solid #eab308';
      }
      const currentStatus = (b.status || 'booked').toLowerCase();
      let itemsTakenText = '-';
      if (currentStatus === 'expired') {
        itemsTakenText = '-';
      } else {
        // Robust calculation for the "Items to Distribute" column
        const uData = JSON.parse(localStorage.getItem('userData_' + (b.rationCard || '1234567890'))) || {};
        const members = uData.family_members || (uData.family ? uData.family.length : 4);

        let sel = b.selectedItems;
        // If selectedItems is missing, try to restore it from items_taken string or use defaults
        if (!sel && b.items_taken && b.items_taken !== 'none') {
          // If it's already a rich string (emojis/kg), we'll use it directly later if we can't parse it
          if (!b.items_taken.includes('🍚') && !b.items_taken.includes('kg')) {
            sel = b.items_taken.split(',').map(s => s.trim());
          } else {
            itemsTakenText = b.items_taken;
          }
        }

        if (itemsTakenText === '-') {
          // If sel is empty or contains non-standard values like "all quota", default to standard items
          if (!sel || sel.length === 0 || (sel.length === 1 && sel[0] === 'all quota')) {
            sel = ['rice', 'wheat', 'sugar', 'oil', 'dal', 'salt', 'soap'];
          }

          let textParts = [];
          if (sel.includes('rice')) textParts.push(`🍚 ${members * 5}kg`);
          if (sel.includes('wheat')) textParts.push(`🌾 ${members * 1}kg`);
          if (sel.includes('sugar')) textParts.push(`🍬 ${members * 0.5}kg`);
          if (sel.includes('oil')) textParts.push(`🧴 1L`);
          if (sel.includes('dal')) textParts.push(`🥣 ${members * 1}kg`);
          if (sel.includes('salt')) textParts.push(`🧂 ${members * 1}kg`);
          if (sel.includes('soap')) textParts.push(`🧼 2pcs`);

          itemsTakenText = textParts.join(', ') || 'None';
        }
      }

      const displayName = b.collectorName && b.collectorName !== b.customerName ?
        `${b.customerName} <br><small style="color:#64748b;">(Collecting: ${b.collectorName})</small>` :
        b.customerName;

      row.innerHTML = `
          <td>${b.isPriority ? '<span style="color:#eab308;" title="Senior Citizen Priority">⭐</span> ' : ''}${displayName}</td>
          <td style="font-size: 0.85rem; color: #64748b; font-family: monospace;">#${b.id}</td>
          <td>${b.date}</td>
          <td>${b.time}</td>
          <td><span class="badge badge-${currentStatus}">${translations[lang][currentStatus] || b.status}</span></td>
          <td style="font-size: 0.8rem; color: #64748b; font-weight: 500;">${itemsTakenText}</td>
          <td>
            ${(currentStatus === 'booked' || currentStatus === 'active' || currentStatus === 'confirmed') ? `
              <button class="btn btn-secondary" onclick="markCollected(${b.id})">${translations[lang].markCollected}</button>
              <button class="btn btn-secondary" onclick="verifyDetails(${b.id})" style="margin-left:5px; background-color:#3498db; border:none;">${translations[lang].verifyDetails}</button>
              <button class="btn btn-secondary" onclick="adminReschedule(${b.id})" style="margin-left:5px; background-color:#f39c12; border:none;">${translations[lang].reschedule}</button>
            ` : ''}
            ${currentStatus === 'collected' ? `<span style="color:var(--success); font-weight:600;">\u2705 Received</span>` : ''}
          </td>
        `;
      container.appendChild(row);
    });
  }

  window.markCollected = function (id) {
    let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    let selectedItems = booking.selectedItems;
    if (!selectedItems && booking.items_taken && booking.items_taken !== 'none') {
      selectedItems = booking.items_taken.split(',').map(s => s.trim());
    } else if (!selectedItems) {
      selectedItems = ['rice', 'wheat', 'sugar', 'oil', 'dal', 'salt', 'soap'];
    }

    const html = `
      <h2 style="margin-bottom:10px; color: var(--accent);">🛒 Select Items to Distribute</h2>
      <p style="margin-bottom: 15px; color:#64748b;">Review and confirm items to give to <strong>${booking.customerName}</strong></p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); margin-bottom: 20px; text-align: left;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #1e293b;">
          <input type="checkbox" name="dist-items" value="rice" ${selectedItems.includes('rice') ? 'checked' : ''}> 🍚 Rice
        </label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #1e293b;">
          <input type="checkbox" name="dist-items" value="wheat" ${selectedItems.includes('wheat') ? 'checked' : ''}> 🌾 Wheat
        </label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #1e293b;">
          <input type="checkbox" name="dist-items" value="sugar" ${selectedItems.includes('sugar') ? 'checked' : ''}> 🍬 Sugar
        </label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #1e293b;">
          <input type="checkbox" name="dist-items" value="oil" ${selectedItems.includes('oil') ? 'checked' : ''}> 🧴 Oil
        </label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #1e293b;">
          <input type="checkbox" name="dist-items" value="dal" ${selectedItems.includes('dal') ? 'checked' : ''}> 🥣 Dal
        </label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #1e293b;">
          <input type="checkbox" name="dist-items" value="salt" ${selectedItems.includes('salt') ? 'checked' : ''}> 🧂 Salt
        </label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #1e293b;">
          <input type="checkbox" name="dist-items" value="soap" ${selectedItems.includes('soap') ? 'checked' : ''}> 🧼 Soap
        </label>
      </div>
      <button class="btn" style="width: 100%; height: 3rem; background: var(--primary);" onclick="
        const items = Array.from(document.querySelectorAll('input[name=\\'dist-items\\']:checked')).map(el => el.value);
        if(items.length === 0) { alert('Please select at least one item.'); return; }
        window.finalizeCollection(${id}, items);
      ">✅ Confirm & Distribute</button>
      <button class="btn btn-secondary" style="width: 100%; margin-top: 10px; background: #94a3b8; border: none; color: white;" onclick="window.closeModal()">🔙 Cancel</button>
    `;

    if (typeof window.customShowModal === 'function') {
      window.customShowModal(html);
    } else {
      showModal(html);
    }
  };

  window.finalizeCollection = function (id, items) {
    let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    booking.status = 'collected';
    booking.selectedItems = items;
    booking.items_taken = items.join(', ');
    localStorage.setItem('bookings', JSON.stringify(bookings));

    // Reduce stock dynamically based on family members
    const uData = JSON.parse(localStorage.getItem('userData_' + (booking.rationCard || '1234567890'))) || {};
    const members = uData.family_members || (uData.family ? uData.family.length : 4);
    const stock = JSON.parse(localStorage.getItem('stock') || '{}');

    if (items.includes('rice')) stock.rice -= (members * 5);
    if (items.includes('wheat')) stock.wheat -= (members * 1);
    if (items.includes('sugar')) stock.sugar -= (members * 0.5);
    if (items.includes('oil') && stock.oil !== undefined) stock.oil -= 1;
    if (items.includes('dal') && stock.dal !== undefined) stock.dal -= 1;
    if (items.includes('salt') && stock.salt !== undefined) stock.salt -= 1;
    if (items.includes('soap') && stock.soap !== undefined) stock.soap -= 2;
    localStorage.setItem('stock', JSON.stringify(stock));

    // Sync with Cloud
    fetch(`${BACKEND_URL}/api/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'collected', family_members: members })
    }).catch(err => console.error('Cloud Update Failed:', err));

    if (typeof window.closeModal === 'function') window.closeModal();
    window.renderAdminDashboard();

    // Show high-tech verification animation
    const overlay = document.createElement('div');
    overlay.className = 'verification-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
    <div class="shield-container">
      <div class="shield-icon">🛡️</div>
      <div class="shield-text">Verified</div>
      <p style="color:rgba(255,255,255,0.7); margin-top:10px;">Ration Released for ${booking.customerName}</p>
    </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease-out';
      setTimeout(() => {
        overlay.remove();
        location.reload();
      }, 500);
    }, 2000);
  };

  window.verifyDetails = function (id) {
    let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    const uData = JSON.parse(localStorage.getItem('userData_' + (booking.rationCard || '1234567890'))) || {};
    let familyOptions = '';
    if (uData && uData.family && Array.isArray(uData.family)) {
      familyOptions = uData.family.map(m => `<option value="\${m.name}">\${m.name} (\${m.relation})</option>`).join('');
    } else {
      familyOptions = `<option value="\${booking.customerName}">\${booking.customerName}</option>`;
    }

    const html = `
      <h2 style="margin-bottom:10px; color: var(--accent);">👤 Verify Collector</h2>
      
      <div class="form-group" style="margin-bottom: 20px; text-align: left;">
        <label for="admin-collector-name" style="font-weight: 600; font-size: 0.95rem; color: #1e293b; display: block; margin-bottom: 8px;">Who came to collect the ration?</label>
        <select id="admin-collector-name" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; background: white; font-size: 1rem;">
          \${familyOptions}
        </select>
      </div>
      
      <div id="scanner-container" style="display: none; text-align: center; margin-bottom: 20px;">
        <div class="scanner-animation" style="width: 100px; height: 100px; border: 3px solid #3498db; border-radius: 10px; margin: 0 auto; position: relative; overflow: hidden; background: #e2e8f0;">
            <div style="position: absolute; width: 100%; height: 3px; background: #2ecc71; box-shadow: 0 0 10px #2ecc71; animation: scan 1.5s infinite linear;"></div>
            <div style="font-size: 3.5rem; line-height: 100px;">🧑</div>
        </div>
        <p style="margin-top: 10px; color: #3498db; font-weight: bold;" id="scanner-text">Scanning Face / Biometrics...</p>
      </div>

      <button id="start-verify-btn" class="btn" style="width: 100%; height: 3rem; background: #3498db; margin-bottom: 10px;" onclick="
        const collectorName = document.getElementById('admin-collector-name').value;
        document.getElementById('scanner-container').style.display = 'block';
        document.getElementById('start-verify-btn').style.display = 'none';
        document.getElementById('admin-collector-name').disabled = true;
        setTimeout(() => {
            document.getElementById('scanner-text').innerHTML = '✅ Verified Successfully!';
            document.getElementById('scanner-text').style.color = '#2ecc71';
            
            let currentBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            const bIndex = currentBookings.findIndex(b => b.id === \${id});
            if (bIndex !== -1) {
                currentBookings[bIndex].collectorName = collectorName;
                localStorage.setItem('bookings', JSON.stringify(currentBookings));
                if (typeof window.renderAdminDashboard === 'function') {
                    window.renderAdminDashboard();
                }
            }
            
            setTimeout(() => {
                window.closeModal();
            }, 1500);
        }, 3000);
      ">📷 Start Face / Biometric Scan</button>
      
      <button class="btn btn-secondary" style="width: 100%; background: #94a3b8; border: none; color: white;" onclick="window.closeModal()">🔙 Cancel</button>
      
      <style>
        @keyframes scan {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
        }
      </style>
    `;

    if (typeof window.customShowModal === 'function') {
      window.customShowModal(html);
    } else {
      showModal(html);
    }
  };

  window.adminReschedule = function (id) {
    let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    const newDate = prompt("Enter new date (YYYY-MM-DD):", booking.date);
    if (!newDate) return;

    const slots = [
      '8–9 AM', '9–10 AM', '10–11 AM', '11–12 PM',
      '12–1 PM', '1–2 PM', '2–3 PM', '3–4 PM', '4–5 PM'
    ];

    const newTime = prompt(`Enter time slot (e.g., 8–9 AM):\nAvailable: ${slots.join(', ')}`, booking.time);
    if (!newTime) return;

    if (!slots.includes(newTime)) {
      alert("Invalid time slot format. Please use exact format like '8–9 AM'.");
      return;
    }

    booking.date = newDate;
    booking.time = newTime;
    localStorage.setItem('bookings', JSON.stringify(bookings));
    window.renderAdminDashboard();
    alert(`Booking rescheduled successfully to ${newDate} ${newTime}.`);
  };

  window.verifyDetails = function (id) {
    const lang = localStorage.getItem('language') || 'en';
    const t = translations[lang];
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    const userData = JSON.parse(localStorage.getItem('userData_' + (booking.rationCard || '1234567890')));

    let familyHtml = '<ul style="list-style:none; padding:0; text-align:left; margin:20px 0;">';
    if (userData && userData.family) {
      userData.family.forEach(m => {
        familyHtml += `<li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>${m.name}</strong></li>`;
      });
    } else {
      familyHtml += `<li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>John Doe</strong></li>
                     <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Jane Doe</strong></li>
                     <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Little Doe</strong></li>`;
    }
    familyHtml += '</ul>';

    const rationCard = booking.rationCard || '1234567890';
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const userBookings = bookings.filter(b =>
      b.rationCard === rationCard &&
      b.status === 'collected' &&
      b.date.startsWith(currentMonthPrefix)
    );

    // Show items for THIS booking
    let itemsHtml = '';
    const members = (userData && userData.family_members) ? userData.family_members : (userData && userData.family ? userData.family.length : 4);

    let totalItems = {
      rice: members * 5,
      wheat: members * 1,
      sugar: members * 0.5,
      oil: 1,
      dal: 1,
      salt: 1,
      soap: 2
    };

    let selectedItems = booking.selectedItems;
    if (!selectedItems && booking.items_taken && booking.items_taken !== 'none') {
      selectedItems = booking.items_taken.split(',').map(s => s.trim());
    } else if (!selectedItems) {
      selectedItems = ['rice', 'wheat', 'sugar', 'oil', 'dal', 'salt', 'soap'];
    }

    itemsHtml = `
      <div style="background:#f8fafc; border-left:4px solid #3b82f6; padding:15px; border-radius:12px; margin-top:15px;">
        <h3 style="font-size:1rem; color:#1e293b; margin-bottom:10px;">Items to Distribute</h3>
        <ul style="list-style:none; padding:0; text-align:left;">
          ${selectedItems.includes('rice') ? `<li style="padding:4px 0; border-bottom:1px solid #eee;"><strong>🍚 Rice:</strong> ${totalItems.rice} kg</li>` : ''}
          ${selectedItems.includes('wheat') ? `<li style="padding:4px 0; border-bottom:1px solid #eee;"><strong>🌾 Wheat:</strong> ${totalItems.wheat} kg</li>` : ''}
          ${selectedItems.includes('sugar') ? `<li style="padding:4px 0; border-bottom:1px solid #eee;"><strong>🍬 Sugar:</strong> ${totalItems.sugar} kg</li>` : ''}
          ${selectedItems.includes('oil') ? `<li style="padding:4px 0; border-bottom:1px solid #eee;"><strong>🧴 Oil:</strong> ${totalItems.oil} L</li>` : ''}
          ${selectedItems.includes('dal') ? `<li style="padding:4px 0; border-bottom:1px solid #eee;"><strong>🥣 Dal:</strong> ${totalItems.dal} kg</li>` : ''}
          ${selectedItems.includes('salt') ? `<li style="padding:4px 0; border-bottom:1px solid #eee;"><strong>🧂 Salt:</strong> ${totalItems.salt} kg</li>` : ''}
          ${selectedItems.includes('soap') ? `<li style="padding:4px 0;"><strong>🧼 Soap:</strong> ${totalItems.soap} pcs</li>` : ''}
        </ul>
      </div>
    `;

    const content = `
      <h2 style="margin-bottom:10px;">${t.verificationPanel}</h2>
      <p><strong>${t.customerLabel}:</strong> ${booking.customerName}</p>
      <p><strong>${t.status}:</strong> ${t[booking.status] || booking.status}</p>
      <div style="background:#f8fafc; padding:15px; border-radius:12px; margin-top:15px;">
        <h3 style="font-size:1rem;">${t.familyDetails}</h3>
        ${familyHtml}
      </div>
      ${itemsHtml}
      <div style="margin-top:20px; color:#10b981; font-weight:700; font-size:1.1rem;">
        ${t.biometricStatus}: ${t.biometricVerified} <span style="font-size:1.5rem;">\u2705</span>
      </div>
      <button class="btn" style="margin-top:20px; width:100%; background-color:#5a67d8;" onclick="closeModal()">${t.closePanel}</button>
    `;
    showModal(content);
  };

  function showModal(html) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'custom-modal';
    overlay.innerHTML = `
      <div class="modal-content">
        ${html}
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  window.closeModal = function () {
    const modal = document.getElementById('custom-modal');
    if (modal) modal.remove();
  };

  window.showUserReportModal = function () {
    const html = `
      <h2 style="margin-bottom:10px;">Monthly User Report</h2>
      <p style="margin-bottom:15px; color:#64748b;">Enter Ration Card to view items to distribute this month:</p>
      <input type="text" id="report-ration-card" placeholder="Ration Card Number" style="width:100%; padding:10px; margin-bottom:15px; border-radius:8px; border:1px solid #ccc; font-size:1rem;">
      <button class="btn" style="background:#3b82f6; width:100%; margin-bottom:10px;" onclick="fetchUserReport()">Get Report</button>
      <div id="user-report-content"></div>
      <button class="btn btn-secondary" onclick="closeModal()" style="width:100%; margin-top:15px;">Close Panel</button>
    `;
    showModal(html);
  };

  window.fetchUserReport = function () {
    const rationCard = document.getElementById('report-ration-card').value.trim();
    if (!rationCard) return alert("Please enter a Ration Card number.");

    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g., "2024-03"

    const userBookings = bookings.filter(b =>
      b.rationCard === rationCard &&
      b.status === 'collected' &&
      b.date.startsWith(currentMonthPrefix)
    );

    const contentDiv = document.getElementById('user-report-content');

    if (userBookings.length === 0) {
      contentDiv.innerHTML = '<div style="background:#fee2e2; color:#b91c1c; padding:10px; border-radius:8px; margin-top:10px;">No items collected this month.</div>';
      return;
    }

    const userData = JSON.parse(localStorage.getItem('userData_' + rationCard)) || {};
    const members = userData.family_members || 4; // default to 4 if not available

    let totalItems = { rice: 0, wheat: 0, sugar: 0, oil: 0, dal: 0, salt: 0, soap: 0 };

    userBookings.forEach(b => {
      // Use backend logic ratio for distribution per collection
      totalItems.rice += (members * 5);
      totalItems.wheat += (members * 1);
      totalItems.sugar += (members * 0.5);
      totalItems.oil += 1;
      totalItems.dal += 1;
      totalItems.salt += 1;
      totalItems.soap += 2;
    });

    const itemsHtml = `
      <ul style="list-style:none; padding:0; margin-top:15px; text-align:left;">
        <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>🍚 Rice:</strong> ${totalItems.rice} kg</li>
        <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>🌾 Wheat:</strong> ${totalItems.wheat} kg</li>
        <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>🍬 Sugar:</strong> ${totalItems.sugar} kg</li>
        <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>🧴 Oil:</strong> ${totalItems.oil} L</li>
        <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>🥣 Dal:</strong> ${totalItems.dal} kg</li>
        <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>🧂 Salt:</strong> ${totalItems.salt} kg</li>
        <li style="padding:8px 0; border-bottom:1px solid #eee;"><strong>🧼 Soap:</strong> ${totalItems.soap} pcs</li>
      </ul>
    `;

    contentDiv.innerHTML = `
      <div style="background:#f8fafc; padding:15px; border-radius:12px; margin-top:15px;">
        <h3 style="font-size:1.1rem; color:#1e293b; margin-bottom:10px;">Distribution for ${currentMonthPrefix}</h3>
        <p style="font-size:0.95rem; margin-bottom:5px;"><strong>Customer Name:</strong> ${userBookings[0].customerName || 'Unknown'}</p>
        <p style="font-size:0.95rem; margin-bottom:5px;"><strong>Family Members:</strong> ${members}</p>
        <p style="font-size:0.95rem;"><strong>Times Collected:</strong> ${userBookings.length}</p>
        ${itemsHtml}
      </div>
    `;
  };




  // ---------- GOVERNMENT DASHBOARD ----------
  window.renderGovBookings = function (filtered) {
    if (!window.location.pathname.includes('gov.html')) return;
    const tbody = document.getElementById('gov-bookings-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No bookings in selected period.</td></tr>';
    } else {
      filtered.forEach(b => {
        const row = document.createElement('tr');
        const isValid = !!b.hash;

        row.innerHTML = `
            <td>${b.customerName}</td>
            <td>${b.date}</td>
            <td>${b.time}</td>
            <td><span class="status-badge ${b.status}">${b.status}</span></td>
            <td style="font-family: monospace; font-size: 0.7rem; color: #64748b;">${b.hash ? b.hash.substring(0, 16) + '...' : 'SEC_RECOVERY_' + Math.floor(Math.random() * 10000)}</td>
            <td style="text-align:center;">
               ${isValid ? '<span style="color:#10b981; font-weight:bold;">✅ VERIFIED</span>' : '<span style="color:#ef4444; font-weight:bold;">⚠️ TAMPERED</span>'}
            </td>
          `;
        tbody.appendChild(row);
      });
    }
  }

  function filterBookings() {
    const startInput = document.getElementById('report-start');
    const endInput = document.getElementById('report-end');
    if (!startInput || !endInput) return;

    const start = startInput.value;
    const end = endInput.value;
    let filtered = refreshExpiredBookings();
    if (start) filtered = filtered.filter(b => b.date >= start);
    if (end) filtered = filtered.filter(b => b.date <= end);
    window.renderGovBookings(filtered);
  }

  // ---------- ADMIN STOCK PAGE ----------
  if (window.location.pathname.includes('admin-stock.html')) {
    const tbody = document.querySelector('#stock-table tbody');
    const alertDiv = document.getElementById('low-stock-alert');

    function renderStock() {
      const stock = JSON.parse(localStorage.getItem('stock'));
      const lang = localStorage.getItem('language') || 'en';
      tbody.innerHTML = '';
      let lowStockItems = [];
      for (let [item, qty] of Object.entries(stock)) {
        if (item === '_id' || item === '__v') continue;
        const row = document.createElement('tr');
        const displayName = translations[lang][item] || (item.charAt(0).toUpperCase() + item.slice(1));
        const unit = item === 'soap' ? 'pcs' : 'kg';
        row.innerHTML = `
            <td style="font-weight:600; color:#1e293b;">${displayName}</td>
            <td style="text-align: right; font-weight:700; color:var(--primary); font-size:1rem;">${qty} ${unit}</td>
          `;
        tbody.appendChild(row);
        if (qty < 50) lowStockItems.push(displayName);
      }
      if (lowStockItems.length > 0) {
        alertDiv.textContent = `Low stock alert: ${lowStockItems.join(', ')}`;
      } else {
        alertDiv.textContent = '';
      }
    }

    window.updateStock = async function (item, delta) {
      const stock = JSON.parse(localStorage.getItem('stock'));
      stock[item] += delta;
      localStorage.setItem('stock', JSON.stringify(stock));

      // Sync with Cloud
      try {
        await fetch(`${BACKEND_URL}/api/admin/stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item, delta })
        });
      } catch (err) {
        console.error('Stock Sync Failed:', err);
      }

      renderStock();
    };

    renderStock();
  }

  // ---------- ADMIN SIGNUP ----------
  if (currentPage === 'admin-signup.html') {
    const adminAccount = localStorage.getItem('adminAccount');
    const user = JSON.parse(localStorage.getItem('user'));

    console.log("Admin Signup Page detected. adminAccount exists:", !!adminAccount);

    // If already logged in as admin, go to dashboard
    if (user && user.role === 'admin') {
      console.log("Admin already logged in. Redirecting to admin.html");
      window.location.href = 'admin.html';
      return;
    }

    // If account already exists, redirect to login
    if (adminAccount) {
      console.log("Admin account already exists. Redirecting to admin-login.html");
      window.location.href = 'admin-login.html';
      return;
    }

    const signupForm = document.getElementById('admin-signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-signup-email').value.trim();
        const password = document.getElementById('admin-signup-password').value.trim();
        const confirmPassword = document.getElementById('admin-signup-confirm').value.trim();

        if (password !== confirmPassword) {
          alert('Passwords do not match.');
          return;
        }

        const accountData = { email, password };
        localStorage.setItem('adminAccount', JSON.stringify(accountData));
        console.log("Admin account saved:", accountData);
        alert('Admin signup successful! Account created for: ' + email + '. Redirecting to login...');
        window.location.href = 'admin-login.html';
      });
    }
  }



  // ---------- ADMIN LOGIN ----------
  if (currentPage === 'admin-login.html') {
    const adminAccount = localStorage.getItem('adminAccount');
    const user = JSON.parse(localStorage.getItem('user'));

    console.log("Admin Login Page detected. adminAccount exists:", !!adminAccount);

    // If already logged in as admin, go to dashboard
    if (user && user.role === 'admin') {
      console.log("Admin already logged in. Redirecting to admin.html");
      window.location.href = 'admin.html';
      return;
    }

    // If no admin account exists, redirect to signup
    if (!adminAccount) {
      console.log("No admin account found. Redirecting to admin-signup.html");
      window.location.href = 'admin-signup.html';
      return;
    }

    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value.trim();

        const stored = localStorage.getItem('adminAccount');
        console.log("Attempting login with email:", email);
        console.log("Stored admin account:", stored);

        if (stored) {
          const adminAcc = JSON.parse(stored);
          if (adminAcc.email === email && adminAcc.password === password) {
            localStorage.setItem('user', JSON.stringify({ name: email, role: 'admin' }));
            window.location.href = 'admin.html';
            return;
          } else if (email !== 'admin' || password !== 'admin') {
            alert('Invalid email or password for admin.');
            return;
          }
        }

        // Demo fallback (only if no custom account matches or if explicitly using admin/admin)
        if (email === 'admin' && password === 'admin') {
          localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
          window.location.href = 'admin.html';
        } else {
          alert('Invalid credentials. Please check your email and password.');
        }
      });
    }
  }



  // AI Live News / Server Alerts Simulation
  function updateLiveNews() {
    const lang = localStorage.getItem('language') || 'en';
    const alerts = {
      en: [
        "Server maintenance scheduled for tonight at 10 PM.",
        "New distribution batch arriving tomorrow for Rice and Wheat.",
        "Daily distribution limit increased to 300 for next week.",
        "Network stable. All slots operating as scheduled.",
        "Alert: Heavy rain expected. Shops will remain open with shelter."
      ],
      hi: [
        "आज रात 10 बजे सर्वर मेंटेनेन्स निर्धारित है।",
        "चावल और गेहूं के लिए नया वितरण बैच कल आ रहा है।",
        "दैनिक वितरण सीमा अगले सप्ताह के लिए 300 कर दी गई है।",
        "नेटवर्क स्थिर है। सभी स्लॉट निर्धारित अनुसार काम कर रहे हैं।",
        "चेतावनी: भारी बारिश की उम्मीद है। आश्रय के साथ दुकानें खुली रहेंगी।"
      ],
      te: [
        "ఈ రాత్రి 10 గంటలకు సర్వర్ నిర్వహణ షెడ్యూల్ చేయబడింది.",
        "రేపు బియ్యం మరియు గోధుమల కొత్త బ్యాచ్ వస్తోంది.",
        "వచ్చే వారానికి రోజువారీ పంపిణీ పరిమితి 300 కి పెంచబడింది.",
        "నెట్‌వర్క్ స్థిరంగా ఉంది. అన్ని స్లాట్‌లు షెడ్యూల్ ప్రకారం పనిచేస్తున్నాయి.",
        "హెచ్చరిక: భారీ వర్షం పడే అవకాశం ఉంది. షెల్టర్‌తో సహా షాపులు తెరిచి ఉంటాయి."
      ],
      kn: [
        "ಇಂದು ರಾತ್ರಿ 10 ಗಂಟೆಗೆ ಸರ್ವರ್ ನಿರ್ವಹಣೆ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ.",
        "ನಾಳೆ ಅಕ್ಕಿ ಮತ್ತು ಗೋಧಿಯ ಹೊಸ ವಿತರಣಾ ಬ್ಯಾಚ್ ಬರುತ್ತಿದೆ.",
        "ಮುಂದಿನ ವಾರಕ್ಕೆ ದೈನಂದಿನ ವಿತರಣಾ ಮಿತಿಯನ್ನು 300 ಕ್ಕೆ ಹೆಚ್ಚಿಸಲಾಗಿದೆ.",
        "ನೆಟ್‌ವರ್ಕ್ ಸ್ಥಿರವಾಗಿದೆ. ಎಲ್ಲಾ ಸ್ಲಾಟ್‌ಗಳು ವೇಳಾಪಟ್ಟಿಯಂತೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ.",
        "ಎಚ್ಚರಿಕೆ: ಭಾರಿ ಮಳೆಯ ನಿರೀಕ್ಷೆಯಿದೆ. ಆಶ್ರಯದೊಂದಿಗೆ ಅಂಗಡಿಗಳು ತೆರೆದಿರುತ್ತವೆ."
      ],
      ta: [
        "இன்று இரவு 10 மணிக்கு சர்வர் பராமரிப்பு திட்டமிடப்பட்டுள்ளது.",
        "அரிசி மற்றும் கோதுமைக்கான புதிய விநியோகத் தொகுதி நாளை வருகிறது.",
        "அடுத்த வாரத்திற்கு தினசரி விநியோக வரம்பு 300 ஆக அதிகரிக்கப்பட்டுள்ளது.",
        "நெட்வொர்க் நிலையானது. அனைத்து ஸ்லாட்டுகளும் திட்டமிட்டபடி செயல்படுகின்றன.",
        "எச்சரிக்கை: பலத்த மழை எதிர்பார்க்கப்படுகிறது. தங்குமிடத்துடன் கடைகள் திறந்திருக்கும்."
      ],
      mr: [
        "आज रात्री १० वाजता सर्व्हर मेंटेनन्स नियोजित आहे.",
        "तांदूळ आणि गव्हासाठी नवीन वितरण तुकडी उद्या येत आहे.",
        "पुढील आठवड्यासाठी दैनंदिन वितरण मर्यादा 300 करण्यात आली आहे.",
        "नेटवर्क स्थिर आहे. सर्व स्लॉट नियोजित प्रमाणे काम करत आहेत.",
        "इशारा: मुसळधार पावसाची शक्यता आहे. आश्रयासह दुकाने उघडी राहतील."
      ],
      ml: [
        "ഇന്ന് രാത്രി 10 മണിക്ക് സെർവർ മെയിൻ്റനൻസ് ഷെഡ്യൂൾ ചെയ്തിട്ടുണ്ട്.",
        "അരിയുടെയും ഗോതമ്പിൻ്റെയും പുതിയ വിതരണ ബാച്ച് നാളെ വരുന്നു.",
        "അടുത്ത ആഴ്ചയിലെ പ്രതിദിന വിതരണ പരിധി 300 ആയി വർദ്ധിപ്പിച്ചു.",
        "നെറ്റ്‌വർക്ക് സ്ഥിരമാണ്. എല്ലാ സ്ലോട്ടുകളും ഷെഡ്യൂൾ ചെയ്തതുപോലെ പ്രവർത്തിക്കുന്നു.",
        "മുന്നറിയിപ്പ്: ശക്തമായ മഴ പ്രതീക്ഷിക്കുന്നു. അഭയകേന്ദ്രമുള്ള കടകൾ തുറന്നിരിക്കും."
      ]
    };

    const selectedAlerts = alerts[lang] || alerts['en'];
    const ticker = document.getElementById('news-ticker');
    if (ticker) {
      const alertMsg = selectedAlerts[Math.floor(Math.random() * selectedAlerts.length)];
      const prefix = translations[lang] && translations[lang].liveNews ? translations[lang].liveNews : "LIVE NEWS";
      ticker.textContent = prefix + ": " + alertMsg;
    }
  }

  const randomAlertsCount = 5; // Defined it just in case
  updateLiveNews();
  setInterval(updateLiveNews, 15000); // Update every 15 seconds
  renderCurrentPage();
});

// Global functions for buttons
window.cancelBooking = function (id) {
  let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const index = bookings.findIndex(b => b.id === id);
  if (index !== -1) {
    bookings[index].status = 'cancelled';
    localStorage.setItem('bookings', JSON.stringify(bookings));
    alert('Booking cancelled.');
    location.reload();
  }
};

window.rescheduleBooking = function (id) {
  window.location.href = `booking.html?reschedule=${id}`;
};

window.downloadReceipt = function (bookingId) {
  const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;

  const receiptContent = `
      AUTOMATED TIME SLOT BOOKING SYSTEM WITH REAL-TIME AVAILABILITY
      ===========================
      Booking ID: ${booking.id}
      Customer: ${booking.customerName}
      Date: ${booking.date}
      Time Slot: ${booking.time}
      Status: ${booking.status}
      ===========================
      Thank you for using Digital Ration.
    `;

  const blob = new Blob([receiptContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt_${bookingId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------- RE-BOOKING PAGE ----------
if (currentPage === 'rebook.html') {
  const slotsContainer = document.getElementById('rebook-slots-container');
  const rebookBtn = document.getElementById('rebook-confirm-btn');
  const lastDayDisplay = document.getElementById('last-day-display');

  if (slotsContainer && rebookBtn) {
    const today = new Date();
    // Calculate last day of current month
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const lastDayStr = lastDay.toISOString().split('T')[0];

    if (lastDayDisplay) {
      lastDayDisplay.textContent = lastDayStr;
    }

    const slots = [
      { time: '8–9 AM', capacity: 30, booked: 25 },
      { time: '9–10 AM', capacity: 30, booked: 28 },
      { time: '10–11 AM', capacity: 30, booked: 15 },
      { time: '11–12 PM', capacity: 30, booked: 30 },
      { time: '12–1 PM', capacity: 30, booked: 5 },
      { time: '1–2 PM', capacity: 30, booked: 10 },
      { time: '2–3 PM', capacity: 30, booked: 12 },
      { time: '3–4 PM', capacity: 30, booked: 8 },
      { time: '4–5 PM', capacity: 30, booked: 2 },
    ];

    function renderRebookSlots() {
      slotsContainer.innerHTML = '';
      slots.forEach((slot, index) => {
        const slotDiv = document.createElement('div');
        slotDiv.className = `slot-card ${slot.booked >= slot.capacity ? 'disabled' : ''}`;
        slotDiv.innerHTML = `
          <strong>${slot.time}</strong>
          <span>Available: ${slot.capacity - slot.booked}</span>
        `;
        slotDiv.addEventListener('click', () => {
          if (!slotDiv.classList.contains('disabled')) {
            document.querySelectorAll('.slot-card').forEach(s => s.classList.remove('selected'));
            slotDiv.classList.add('selected');
          }
        });
        slotsContainer.appendChild(slotDiv);
      });
    }

    rebookBtn.addEventListener('click', () => {
      const selectedSlot = document.querySelector('.slot-card.selected');
      if (!selectedSlot) {
        alert('Please select a time slot.');
        return;
      }

      const user = JSON.parse(localStorage.getItem('user'));
      const newBooking = {
        id: Date.now(),
        customerName: user.name,
        rationCard: user.rationCard || '1234567890',
        phone: user.phone || '+918247087380',
        date: lastDayStr,
        time: selectedSlot.querySelector('strong').textContent,
        status: 'booked',
        type: 'rebooked'
      };

      const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      allBookings.push(newBooking);
      localStorage.setItem('bookings', JSON.stringify(allBookings));

      // --- SYNC TO BACKEND CLOUD ---
      fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      }).catch(err => console.error('Cloud Sync Failed:', err));

      alert('Re-booking successful! Your slot is confirmed for the final day of the month.');
      window.location.href = 'dashboard.html';
    });

    renderRebookSlots();
  }
}
// ---------- GOVERNMENT AUTO-REPORTING SYSTEM ----------
window.simulateEmailReport = function () {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const today = new Date().toLocaleDateString();
  const fraudsBlocked = Math.floor(Math.random() * 5) + 1;

  console.log("%c 📫 AUTO-REPORT: Syncing daily logs with gov.reports@gmail.com...", "color: #4f46e5; font-weight: bold;");
};
setTimeout(simulateEmailReport, 10000);
setInterval(simulateEmailReport, 180000);

// ---------- ADMIN EXPORT UTILITIES (PDF / EXCEL) ----------
window.adminExportPDF = function () {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);

  if (todayBookings.length === 0) {
    return alert('No transactions found for today to export.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text(`Daily Ration Booking Report - ${today}`, 14, 15);

  const tableColumn = ["Booking ID", "Name", "Date", "Slot", "Status", "Card", "Priority"];
  const tableRows = [];

  todayBookings.forEach(b => {
    const row = [
      b.id,
      b.customerName,
      b.date,
      b.time,
      b.status,
      b.predictedCardType || 'N/A',
      b.isPriority ? 'Yes' : 'No'
    ];
    tableRows.push(row);
  });

  doc.autoTable({
    startY: 20,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }
  });

  doc.save(`Daily_Report_${today}.pdf`);
  console.log('📄 PDF successfully generated and downloaded.');
};

window.adminExportExcel = function () {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);

  if (todayBookings.length === 0) {
    return alert('No transactions found for today to export.');
  }

  const formattedData = todayBookings.map(b => ({
    "Booking ID": b.id,
    "Customer Name": b.customerName,
    "Card Class": b.predictedCardType || 'N/A',
    "Date": b.date,
    "Time Slot": b.time,
    "Status": b.status
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Bookings");

  XLSX.writeFile(workbook, `Daily_Report_${today}.xlsx`);
  console.log('📊 Excel document successfully generated and downloaded.');
};

// Government Dashboard: Update Sync Timestamp
if (currentPage === 'gov.html') {
  setInterval(() => {
    const syncSpan = document.getElementById('last-sync-time');
    if (syncSpan) {
      const now = new Date();
      syncSpan.textContent = now.toLocaleTimeString();
    }
  }, 5000);
}

// ---------- AI CHATBOT & FEEDBACK SYSTEM ----------
let currentRating = 0;

window.setRating = function (n) {
  currentRating = n;
  const stars = document.querySelectorAll('.rating-stars span');
  stars.forEach((star, i) => {
    star.style.color = (i < n) ? '#f39c12' : '#f1c40f';
  });
};

window.submitFeedback = async function () {
  const user = JSON.parse(localStorage.getItem('user'));
  const comment = document.getElementById('feedback-comment').value;

  if (currentRating === 0) return alert('Please select a rating.');

  const feedbackData = {
    customerName: user ? user.name : 'Anonymous',
    rating: currentRating,
    comment: comment
  };

  const showSuccessUI = (sentimentMsg) => {
    document.getElementById('feedback-form').innerHTML = `
        <div style="text-align:center;">
          <p style="color: green; font-weight: bold; font-size: 1.1rem;">✅ Thank you for your feedback!</p>
          <div style="margin-top:10px; padding:10px; background:#f1f5f9; border-radius:10px;">
            <span style="font-size:0.8rem; color:var(--text-muted);">AI Sentiment Result:</span><br>
            <strong style="font-size:1.2rem;">${sentimentMsg}</strong>
          </div>
          <button onclick="resetFeedbackForm()" class="btn btn-secondary" style="margin-top: 15px; padding: 8px 16px; font-size: 0.9rem;">Submit New Feedback</button>
        </div>
      `;
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('feedbackSubmitted', 'true');
      localStorage.setItem('feedbackSentiment', data.sentiment);
      showSuccessUI(data.sentiment);
    }
  } catch (err) {
    console.error('Feedback failed:', err);
    // Offline / Backend disconnected fallback
    localStorage.setItem('feedbackSubmitted', 'true');
    const dummySentiment = currentRating > 3 ? "Happy 😊 (Offline Mode)" : "Neutral 😐 (Offline Mode)";
    localStorage.setItem('feedbackSentiment', dummySentiment);
    showSuccessUI(dummySentiment);
  }
};

window.resetFeedbackForm = function () {
  localStorage.removeItem('feedbackSubmitted');
  localStorage.removeItem('feedbackSentiment');
  currentRating = 0;

  document.getElementById('feedback-form').innerHTML = `
        <div class="form-group">
          <label data-i18n="experience">How was your experience?</label>
          <div class="rating-stars" style="font-size: 1.5rem; cursor: pointer; color: #f1c40f;">
            <span onclick="setRating(1)">★</span><span onclick="setRating(2)">★</span><span
              onclick="setRating(3)">★</span><span onclick="setRating(4)">★</span><span onclick="setRating(5)">★</span>
          </div>
        </div>
        <div class="form-group">
          <textarea id="feedback-comment" data-i18n="tellMore" placeholder="Tell us more..."
            style="width:100%; height:80px;"></textarea>
        </div>
        <button class="btn" onclick="submitFeedback()" data-i18n="submit">Submit Feedback</button>
    `;
};

// Check if feedback was already submitted on page load
document.addEventListener('DOMContentLoaded', () => {
  if (currentPage === 'dashboard.html') {
    if (localStorage.getItem('feedbackSubmitted') === 'true') {
      const savedSentiment = localStorage.getItem('feedbackSentiment') || 'Recorded';
      const formObj = document.getElementById('feedback-form');
      if (formObj) {
        formObj.innerHTML = `
                  <div style="text-align:center;">
                    <p style="color: green; font-weight: bold; font-size: 1.1rem;">✅ Thank you for your feedback!</p>
                    <div style="margin-top:10px; padding:10px; background:#f1f5f9; border-radius:10px;">
                      <span style="font-size:0.8rem; color:var(--text-muted);">AI Sentiment Result:</span><br>
                      <strong style="font-size:1.2rem;">${savedSentiment}</strong>
                    </div>
                    <button onclick="resetFeedbackForm()" class="btn btn-secondary" style="margin-top: 15px; padding: 8px 16px; font-size: 0.9rem;">Submit New Feedback</button>
                  </div>
                `;
      }
    }
  }
});

window.startVoiceRecognition = function () {
  if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
    alert("Speech recognition is not supported in your browser. Try Chrome.");
    return;
  }

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = localStorage.getItem('language') === 'te' ? 'te-IN' : 'en-US';
  recognition.interimResults = false;

  const micBtn = document.querySelector('button[onclick="startVoiceRecognition()"]');
  micBtn.textContent = '🛑';
  micBtn.style.background = 'var(--danger)';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('chat-input').value = transcript;
    sendChatMessage();
  };

  recognition.onend = () => {
    micBtn.textContent = '🎤';
    micBtn.style.background = 'var(--accent)';
  };

  recognition.onerror = () => {
    micBtn.textContent = '🎤';
    micBtn.style.background = 'var(--accent)';
    alert("Error occurred in recognition. Please check your mic permissions.");
  };

  recognition.start();
};

window.toggleChatbot = function () {
  const bot = document.getElementById('ai-chatbot');
  if (bot) bot.classList.toggle('chatbot-collapsed');
};

window.sendChatMessage = function () {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  const chatBody = document.getElementById('chatbot-messages');
  chatBody.innerHTML += `<div class="msg user">${msg}</div>`;
  input.value = '';

  // AI Reply Simulation
  setTimeout(() => {
    let reply = "I'm not sure about that. Try asking about 'rice stock', 'how to book', or 'emergency'.";
    const Lmsg = msg.toLowerCase();

    if (Lmsg.includes('rice') || Lmsg.includes('wheat')) reply = "Current stocks are available on the Admin page. We have plenty of Rice and Wheat for this month.";
    if (Lmsg.includes('book') || Lmsg.includes('slot')) reply = "You can book a slot by logging in as a Customer and clicking 'Book Slot'.";
    if (Lmsg.includes('emergency')) reply = "Emergency slots are for seniors and disabled citizens. Select 'Emergency' when booking.";
    if (Lmsg.includes('hi') || Lmsg.includes('hello')) reply = "Hello! 👋 I am your Ration Assistant. How can I help you book or check rations today?";

    chatBody.innerHTML += `<div class="msg bot">${reply}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 1000);
};

function initDashboardMap(district) {
  const mapIframe = document.getElementById('map-iframe');
  const shopAddress = document.getElementById('shop-address-val');
  const shopName = document.getElementById('shop-name-val');

  if (!mapIframe) return;

  const locations = {
    'Vijayawada': {
      q: 'Vijayawada, Andhra Pradesh',
      addr: 'Benz Circle, MG Road, Vijayawada, AP 520010',
      id: 'VJA-401'
    },
    'Ongole': {
      q: 'Ongole, Andhra Pradesh',
      addr: 'Kurnool Road, Near Collector Office, Ongole, AP 523002',
      id: 'ONG-882'
    },
    'Guntur': {
      q: 'Guntur, Andhra Pradesh',
      addr: 'Lodge Centre, Main Road, Guntur, AP 522002',
      id: 'GNT-112'
    },
    'Komminenivaripalem': {
      q: 'Komminenivaripalem, Andhra Pradesh',
      addr: 'Main Bazaar, Komminenivaripalem, AP 523261',
      id: 'KMN-930'
    },
    'Addanki': {
      q: 'Addanki, Andhra Pradesh',
      addr: 'Bhavanamvari Subbarao Road, Addanki, AP 523201',
      id: 'ADK-554'
    }
  };

  const loc = locations[district] || locations['Vijayawada'];

  mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(loc.q)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  if (shopAddress) shopAddress.textContent = loc.addr;
  if (shopName) shopName.textContent = `Civil Supplies Fair Price Shop #${loc.id}`;
}



window.downloadOfflineQR = async function (url, id) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `digital_ration_booking_${id}_offline.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("✅ QR Code safely downloaded to your device gallery!\nYou can now use it at the shop even without internet.");
  } catch (e) {
    alert("Error saving image directly. Please take a screenshot of this page instead!");
  }
};

window.showCustomerReportModal = function () {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'user') return;

  const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const myCollections = allBookings.filter(b => b.rationCard === user.rationCard && b.status === 'collected');

  // Sort by date descending
  myCollections.sort((a, b) => new Date(b.date) - new Date(a.date));

  const uData = JSON.parse(localStorage.getItem('userData_' + (user.rationCard || '1234567890'))) || {};
  const members = uData.family_members || (uData.family ? uData.family.length : 4);

  let historyHtml = '';
  if (myCollections.length === 0) {
    historyHtml = '<p style="text-align:center; color:#64748b; margin-top: 1rem;">No collection history found.</p>';
  } else {
    myCollections.forEach(b => {
      const selectedItems = b.selectedItems || ['rice', 'wheat', 'sugar', 'oil', 'dal', 'salt', 'soap'];

      let itemsList = [];
      if (selectedItems.includes('rice')) itemsList.push(`🍚 Rice (${members * 5}kg)`);
      if (selectedItems.includes('wheat')) itemsList.push(`🌾 Wheat (${members * 1}kg)`);
      if (selectedItems.includes('sugar')) itemsList.push(`🍬 Sugar (${members * 0.5}kg)`);
      if (selectedItems.includes('oil')) itemsList.push(`🧴 Oil (1L)`);
      if (selectedItems.includes('dal')) itemsList.push(`🥣 Dal (1kg)`);
      if (selectedItems.includes('salt')) itemsList.push(`🧂 Salt (1kg)`);
      if (selectedItems.includes('soap')) itemsList.push(`🧼 Soap (2pcs)`);

      const itemsStr = itemsList.join(', ');

      const dateObj = new Date(b.date);
      const monthYear = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      historyHtml += `
        <div style="background:#f8fafc; padding:15px; border-radius:12px; margin-bottom:15px; border-left:4px solid #3b82f6; text-align:left;">
          <h4 style="margin:0 0 5px 0; color:#1e293b;">${monthYear}</h4>
          <p style="margin:0 0 5px 0; font-size:0.95rem;"><strong>📅 Date:</strong> ${b.date} | <strong>⏰ Time:</strong> ${b.time}</p>
          <p style="margin:0; font-size:0.9rem; color:#475569;"><strong>🛒 Items:</strong> ${itemsStr}</p>
        </div>
      `;
    });
  }

  const html = `
    <h2 style="margin-bottom:15px; color:#1e293b;">📊 My Monthly Collection Report</h2>
    <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
      ${historyHtml}
    </div>
    <button class="btn btn-secondary" style="width:100%; margin-top:20px; padding:10px; background:#e2e8f0; color:#475569;" onclick="document.getElementById('monthly-report-modal').remove()">Close Report</button>
  `;

  const overlay = document.createElement('div');
  overlay.id = 'monthly-report-modal';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '999999';
  overlay.style.backdropFilter = 'blur(4px)';

  overlay.innerHTML = `
    <div style="background:white; padding:2rem; border-radius:16px; text-align:center; max-width:90%; width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      ${html}
    </div>
  `;

  document.body.appendChild(overlay);
};


// --- Spot Registration for Elderly ---
window.openSpotRegistrationModal = function () {
  document.getElementById('spot-registration-modal').style.display = 'flex';
  document.getElementById('spot-step-1').style.display = 'block';
  document.getElementById('spot-step-2').style.display = 'none';
};

window.closeSpotRegistrationModal = function () {
  document.getElementById('spot-registration-modal').style.display = 'none';
  if (window.spotStream) {
    window.spotStream.getTracks().forEach(track => track.stop());
  }
  if (window.spotInterval) clearInterval(window.spotInterval);
};

window.verifySpotRation = async function () {
  const rationCard = document.getElementById('spot-ration-card').value.trim();

  if (rationCard.length < 10) {
    alert("Please enter a valid Ration Card number");
    return;
  }

  // Simulate lookup
  document.getElementById('spot-step-1').style.display = 'none';
  document.getElementById('spot-step-2').style.display = 'block';
  window.startSpotBiometricScan();
};

window.setSpotBiometricMode = function (mode) {
  const video = document.getElementById('spot-video');
  const finger = document.getElementById('spot-fingerprint-icon');
  const btnFace = document.getElementById('spot-mode-face');
  const btnFinger = document.getElementById('spot-mode-finger');
  const status = document.getElementById('spot-biometric-status');

  if (mode === 'face') {
    video.style.display = 'block';
    finger.style.display = 'none';
    btnFace.style.background = 'var(--primary)';
    btnFinger.style.background = 'transparent';
    status.innerText = "Align face to verify...";
    if (!window.spotStream) window.startSpotBiometricScan();
  } else {
    video.style.display = 'none';
    finger.style.display = 'block';
    btnFace.style.background = 'transparent';
    btnFinger.style.background = 'var(--accent)';
    status.innerText = "Place finger on sensor...";
  }
};

window.startSpotBiometricScan = function () {
  const video = document.getElementById('spot-video');
  const bar = document.getElementById('spot-biometric-bar');
  const status = document.getElementById('spot-biometric-status');
  const successActions = document.getElementById('spot-success-actions');

  bar.style.width = '0%';
  successActions.style.display = 'none';

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      window.spotStream = stream;
      video.srcObject = stream;

      let progress = 0;
      window.spotInterval = setInterval(() => {
        progress += 5;
        bar.style.width = progress + '%';

        const lang = localStorage.getItem('language') || 'en';
        const spoofActive = translations[lang].antiSpoofing || "Anti-Spoofing ACTIVE";

        if (progress >= 30 && progress < 60) {
          status.innerHTML = `<span style="color: #4f46e5; font-weight: bold; font-size: 0.8rem;">🛡️ ${spoofActive}</span><br>Analyzing Liveness...`;
        } else if (progress >= 60 && progress < 90) {
          status.innerText = "Verifying biometric hash...";
        } else if (progress >= 90 && progress < 100) {
          status.innerText = "Authentication successful!";
        }

        if (progress >= 100) {
          clearInterval(window.spotInterval);
          status.innerText = "✅ IDENTITY VERIFIED";
          status.style.color = "var(--success)";
          successActions.style.display = 'block';
          // stream.getTracks().forEach(track => track.stop());
        }
      }, 150);
    })
    .catch(err => {
      console.error("Camera error:", err);
      status.innerText = "Camera not found. Using Virtual Fingerprint mode.";
      window.setSpotBiometricMode('finger');

      let progress = 0;
      window.spotInterval = setInterval(() => {
        progress += 5;
        bar.style.width = progress + '%';
        if (progress >= 100) {
          clearInterval(window.spotInterval);
          status.innerText = "✅ IDENTITY VERIFIED";
          status.style.color = "var(--success)";
          successActions.style.display = 'block';
        }
      }, 150);
    });
};

window.submitSpotRegistration = async function () {
  const rationCard = document.getElementById('spot-ration-card').value.trim();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.getHours() + ":" + String(now.getMinutes()).padStart(2, '0');

  // Booking data
  const bookingId = Math.floor(Math.random() * 900000) + 100000;
  const selectedItems = Array.from(document.querySelectorAll('input[name="spot-items"]:checked')).map(el => el.value);

  if (selectedItems.length === 0) {
    alert("Please select at least one item to distribute.");
    return;
  }

  const newBooking = {
    id: bookingId,
    customerName: "Spot Registration (Elderly)",
    phone: "0000000000",
    rationCard: rationCard,
    date: dateStr,
    time: timeStr,
    status: "booked",
    isPriority: true,
    family_members: 4,
    selectedItems: selectedItems,
    hash: 'spot_' + Date.now()
  };

  try {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    bookings.push(newBooking);
    localStorage.setItem('bookings', JSON.stringify(bookings));

    if (socket && socket.connected) {
      fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newBooking, age: 70, district: 'Spot Registered' })
      }).catch(e => console.log("Failed to sync spot registration to cloud:", e));
    }

    alert("✅ Spot Registration Successful!\nToken #" + (bookingId % 50 + 10) + " issued for Priority Collection.");
    window.closeSpotRegistrationModal();
    window.renderAdminDashboard();
    location.reload();
  } catch (e) {
    console.error(e);
    alert("Error during spot registration.");
  }
};




