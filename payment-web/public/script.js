// Konfigurasi API
const API_BASE = window.location.origin;

// State
let currentPayment = {
  id: null,
  amount: null,
  method: 'qris',
  qrCode: null
};

let countdownInterval = null;
let checkStatusInterval = null;

// DOM Elements
const amountInput = document.getElementById('amount');
const chipButtons = document.querySelectorAll('.chip');
const generateQrisBtn = document.getElementById('generate-qris');
const checkPaymentBtn = document.getElementById('check-payment-btn');
const qrisSection = document.getElementById('qris-payment-area');
const loadingQr = document.getElementById('loading-qr');
const qrisImage = document.getElementById('qris-image');
const qrisAmount = document.getElementById('qris-amount');
const orderIdSpan = document.getElementById('order-id');
const merchantName = document.getElementById('merchant-name');
const timerSpan = document.getElementById('timer');
const methodTabs = document.querySelectorAll('.method-tab');
const methodSections = document.querySelectorAll('.method-section');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const modal = document.getElementById('modal');
const paymentStatusCard = document.getElementById('payment-status-card');
const paymentStatusContent = document.getElementById('payment-status-content');

// ============= UTILITY FUNCTIONS =============
function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

function showToast(message, isSuccess = true) {
  toastMessage.textContent = message;
  toast.style.background = isSuccess ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showModal() {
  modal.classList.add('show');
}

function hideModal() {
  modal.classList.remove('show');
}

function stopAllIntervals() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (checkStatusInterval) {
    clearInterval(checkStatusInterval);
    checkStatusInterval = null;
  }
}

// ============= VALIDASI NOMINAL =============
function validateAmount(amount) {
  if (!amount || amount < 1000) {
    showToast('Minimal pembayaran Rp 1.000', false);
    return false;
  }
  if (amount > 10000000) {
    showToast('Maksimal pembayaran Rp 10.000.000', false);
    return false;
  }
  return true;
}

// ============= PAYMENT FUNCTIONS =============
async function generateQRIS(amount) {
  if (!validateAmount(amount)) return;
  
  try {
    // Show loading
    generateQrisBtn.style.display = 'none';
    qrisSection.style.display = 'block';
    loadingQr.style.display = 'flex';
    qrisImage.style.display = 'none';
    
    showToast(`Membuat QRIS ${formatRupiah(amount)}...`, true);
    
    const response = await fetch(`${API_BASE}/api/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Gagal generate QRIS');
    }
    
    const data = result.data;
    
    // Save current payment
    currentPayment = {
      id: data.id,
      amount: data.amount,
      method: 'qris',
      qrCode: data.qrCode
    };
    
    // Display QRIS
    qrisImage.src = data.qrCode;
    qrisAmount.textContent = data.amountFormatted;
    orderIdSpan.textContent = data.id;
    merchantName.textContent = data.merchant || 'QRIS Payment';
    
    // Hide loading, show QR
    loadingQr.style.display = 'none';
    qrisImage.style.display = 'block';
    
    // Start timer (15 menit = 900 detik)
    startCountdown(900);
    
    // Start checking payment status
    startCheckingStatus(data.id, data.amount);
    
    showToast('✅ QRIS berhasil dibuat!', true);
    
  } catch (error) {
    console.error('Generate QRIS error:', error);
    showToast('❌ ' + (error.message || 'Gagal generate QRIS'), false);
    
    // Reset
    generateQrisBtn.style.display = 'block';
    qrisSection.style.display = 'none';
  }
}

function startCountdown(seconds) {
  stopAllIntervals();
  
  let timeLeft = seconds;
  
  countdownInterval = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerSpan.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      timerSpan.textContent = '00:00';
      
      // Auto hide QRIS jika expired
      if (confirm('⏰ QRIS telah kadaluarsa. Buat ulang?')) {
        const amount = parseInt(amountInput.value.replace(/[^0-9]/g, ''));
        if (validateAmount(amount)) {
          generateQRIS(amount);
        }
      }
    }
    
    timeLeft--;
  }, 1000);
}

function startCheckingStatus(orderId, amount) {
  if (checkStatusInterval) {
    clearInterval(checkStatusInterval);
  }
  
  checkStatusInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/check-status?orderId=${orderId}&amount=${amount}`);
      const result = await response.json();
      
      if (result.success && result.paid) {
        // Payment success!
        clearInterval(checkStatusInterval);
        clearInterval(countdownInterval);
        
        // Show success modal
        showModal();
        
        // Update status card
        paymentStatusCard.style.display = 'block';
        paymentStatusContent.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <i class="fas fa-check-circle" style="font-size: 64px; color: #4CAF50; margin-bottom: 16px;"></i>
            <h3 style="color: #4CAF50; font-size: 24px; margin-bottom: 12px;">PEMBAYARAN BERHASIL!</h3>
            <p style="color: var(--gray); font-size: 18px; margin-bottom: 8px;">${formatRupiah(amount)}</p>
            <p style="color: var(--gray); margin-bottom: 8px;">ID: ${orderId}</p>
            <div style="background: rgba(7,20,38,0.6); padding: 16px; border-radius: 14px; margin: 20px 0;">
              <p style="color: var(--blue-sky); margin-bottom: 12px;">⬇️ KONFIRMASI SEKARANG ⬇️</p>
              <div class="support-buttons" style="display: flex; gap: 12px;">
                <a href="https://t.me/kinzxxoffcial" target="_blank" class="support-btn telegram" style="flex: 1;">
                  <i class="fab fa-telegram-plane"></i> @kinzxxoffcial
                </a>
                <a href="https://wa.me/62895379234782" target="_blank" class="support-btn whatsapp" style="flex: 1;">
                  <i class="fab fa-whatsapp"></i> 0895379234782
                </a>
              </div>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Check status error:', error);
    }
  }, 3000); // Check every 3 seconds
}

// ============= EVENT LISTENERS =============
// Format Rupiah saat input - BEBAS BERAPAPUN!
amountInput.addEventListener('input', function(e) {
  let value = this.value.replace(/[^0-9]/g, '');
  
  // Hapus leading zero
  while (value.length > 1 && value.startsWith('0')) {
    value = value.substring(1);
  }
  
  if (value) {
    const angka = parseInt(value);
    // NO LIMIT TAMPILAN, validasi hanya saat generate
    this.value = new Intl.NumberFormat('id-ID').format(angka);
  } else {
    this.value = '';
  }
});

// Quick amount chips
chipButtons.forEach(chip => {
  chip.addEventListener('click', function() {
    const amount = this.dataset.amount;
    amountInput.value = new Intl.NumberFormat('id-ID').format(amount);
  });
});

// Generate QRIS - NOMINAL BEBAS 1K - 10JT
generateQrisBtn.addEventListener('click', function() {
  const rawValue = amountInput.value.replace(/[^0-9]/g, '');
  
  if (!rawValue) {
    showToast('Masukkan nominal terlebih dahulu!', false);
    return;
  }
  
  const amount = parseInt(rawValue);
  
  // VALIDASI: 1.000 - 10.000.000
  if (amount < 1000) {
    showToast('❌ Minimal pembayaran Rp 1.000', false);
    return;
  }
  if (amount > 10000000) {
    showToast('❌ Maksimal pembayaran Rp 10.000.000', false);
    return;
  }
  
  generateQRIS(amount);
});

// Check payment button
checkPaymentBtn.addEventListener('click', async function() {
  if (!currentPayment.id || !currentPayment.amount) {
    showToast('Tidak ada pembayaran aktif', false);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/check-status?orderId=${currentPayment.id}&amount=${currentPayment.amount}`);
    const result = await response.json();
    
    if (result.success && result.paid) {
      showModal();
    } else {
      showToast('⏳ Pembayaran belum diterima', false);
    }
  } catch (error) {
    showToast('Gagal cek status', false);
  }
});

// Copy number manual
document.querySelectorAll('.copy-number').forEach(btn => {
  btn.addEventListener('click', function() {
    const number = this.dataset.number;
    navigator.clipboard.writeText(number);
    showToast('📋 Nomor berhasil disalin!');
  });
});

// Copy order ID
document.getElementById('copy-order').addEventListener('click', function() {
  const orderId = orderIdSpan.textContent;
  navigator.clipboard.writeText(orderId);
  showToast('📋 Order ID disalin!');
});

// Method tabs
methodTabs.forEach(tab => {
  tab.addEventListener('click', function() {
    const method = this.dataset.method;
    
    // Update active tab
    methodTabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    
    // Show active section
    methodSections.forEach(section => section.classList.remove('active'));
    document.getElementById(`${method}-section`).classList.add('active');
    
    // Reset QRIS section if switching to manual
    if (method === 'manual') {
      qrisSection.style.display = 'none';
      generateQrisBtn.style.display = 'block';
      stopAllIntervals();
    }
  });
});

// Modal close
document.querySelector('.modal-close').addEventListener('click', hideModal);
document.getElementById('modal-close-btn').addEventListener('click', hideModal);

// Close modal when click outside
window.addEventListener('click', function(e) {
  if (e.target === modal) {
    hideModal();
  }
});

// Prevent form submit
document.addEventListener('submit', (e) => e.preventDefault());

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Payment Gateway Ready!');
  console.log('💰 Nominal BEBAS: Rp1.000 - Rp10.000.000');
  
  // Set default amount ke 10rb
  amountInput.value = new Intl.NumberFormat('id-ID').format(10000);
});