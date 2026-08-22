document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('[data-nav-path]').forEach((link) => {
    const linkPath = link.getAttribute('data-nav-path');
    if (linkPath === path || (linkPath !== '/' && path.startsWith(linkPath))) link.classList.add('is-active');
  });

  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const isOpen = !mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden', isOpen);
      menuBtn.setAttribute('aria-expanded', String(!isOpen));
    });
  }
  document.querySelectorAll('[data-accordion-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.getAttribute('data-accordion-toggle'));
      if (panel) panel.classList.toggle('hidden');
      const icon = btn.querySelector('[data-accordion-icon]');
      if (icon) icon.classList.toggle('rotate-45');
    });
  });

  document.querySelectorAll('.ba-slider').forEach((slider) => {
    const afterImg = slider.querySelector('.ba-after');
    const handle = slider.querySelector('.ba-handle');
    let dragging = false;
    const setPos = (clientX) => {
      const rect = slider.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      afterImg.style.clipPath = `inset(0 0 0 ${pct}%)`;
      handle.style.left = pct + '%';
    };
    handle.addEventListener('pointerdown', (e) => { dragging = true; handle.setPointerCapture(e.pointerId); });
    window.addEventListener('pointerup', () => { dragging = false; });
    slider.addEventListener('pointermove', (e) => { if (dragging) setPos(e.clientX); });
    slider.addEventListener('click', (e) => setPos(e.clientX));
  });

  document.querySelectorAll('.map-pin').forEach((pin) => {
    pin.addEventListener('click', () => { window.location.href = pin.getAttribute('data-href'); });
    pin.addEventListener('keypress', (e) => { if (e.key === 'Enter') window.location.href = pin.getAttribute('data-href'); });
  });

  // Item 2: auto-scrolling review carousel
  const track = document.getElementById('review-track');
  if (track) {
    let offset = 0;
    let paused = false;
    track.addEventListener('mouseenter', () => paused = true);
    track.addEventListener('mouseleave', () => paused = false);
    function step() {
      if (!paused) {
        offset -= 0.5;
        const resetPoint = -(track.scrollWidth / 2);
        if (offset <= resetPoint) offset = 0;
        track.style.transform = `translateX(${offset}px)`;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Item 7: service plans popup, shows once per session
  const popup = document.getElementById('plans-popup');
  if (popup && !sessionStorage.getItem('plansPopupShown')) {
    setTimeout(() => {
      popup.classList.remove('hidden');
      sessionStorage.setItem('plansPopupShown', '1');
    }, 2500);
  }
  const popupClose = document.getElementById('plans-popup-close');
  if (popupClose) popupClose.addEventListener('click', () => popup.classList.add('hidden'));
});

const CRM_ENDPOINT = "https://api.therealpressure.com/leads"; // TODO: point this at your live CRM/webhook
let selectedServices = [];
let squareFootage = 2500;

function validateStep1() {
  const checks = document.querySelectorAll('.q-check:checked');
  if (checks.length === 0) { document.getElementById('q-error-1').classList.remove('hidden'); return; }
  document.getElementById('q-error-1').classList.add('hidden');
  selectedServices = Array.from(checks).map((c) => c.value);
  squareFootage = parseInt(document.getElementById('q-sqft').value, 10);
  goToQuoteStep(2);
}

async function submitQuote() {
  const n = document.getElementById('q-name').value.trim();
  const e = document.getElementById('q-email').value.trim();
  const p = document.getElementById('q-phone').value.trim();
  const c = document.getElementById('q-city-select').value;
  if (!n || !e || !p || !c || !e.includes('@')) { document.getElementById('q-error-2').classList.remove('hidden'); return; }
  document.getElementById('q-error-2').classList.add('hidden');

  let minRate = 0, maxRate = 0;
  selectedServices.forEach((s) => {
    if (s.includes('House')) { minRate += 0.14; maxRate += 0.35; }
    else if (s.includes('Roof')) { minRate += 0.20; maxRate += 0.45; }
    else if (s.includes('Concrete')) { minRate += 0.12; maxRate += 0.35; }
    else if (s.includes('Deck')) { minRate += 0.18; maxRate += 0.40; }
    else if (s.includes('Commercial')) { minRate += 0.25; maxRate += 0.50; }
    else if (s.includes('Window')) { minRate += 0.10; maxRate += 0.25; }
    else { minRate += 0.14; maxRate += 0.35; }
  });
  if (minRate === 0) { minRate = 0.14; maxRate = 0.35; }

  const minPrice = Math.max(199, Math.round(squareFootage * minRate));
  const maxPrice = Math.max(249, Math.round(squareFootage * maxRate));
  const estimatedPriceRange = `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`;
  const leadPayload = { businessName: "Under Pressure", fullName: n, email: e, phone: p, city: c, services: selectedServices, squareFootage, estimatedPriceRange, source: "Website Instant Quote Funnel", timestamp: new Date().toISOString() };

  const btn = document.getElementById('submit-btn');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>Calculating your estimate...</span>`;
  try {
    await fetch(CRM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(leadPayload) });
  } catch (err) {
    console.warn('Lead capture: could not reach CRM endpoint, captured client-side only.', err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }

  document.getElementById('res-services').innerText = selectedServices.join(', ');
  document.getElementById('res-sqft').innerText = `${squareFootage.toLocaleString()} SQ FT`;
  document.getElementById('res-price').innerText = estimatedPriceRange;
  document.getElementById('res-name').innerText = n.split(' ')[0];
  document.getElementById('res-email').innerText = e;
  goToQuoteStep(3);
}

function goToQuoteStep(step) {
  [1, 2, 3].forEach((i) => document.getElementById('q-step-' + i).classList.add('hidden'));
  document.getElementById('q-step-' + step).classList.remove('hidden');
  [1, 2, 3].forEach((i) => {
    const tab = document.getElementById('q-tab-' + i);
    if (!tab) return;
    const circle = tab.querySelector('span');
    if (i < step) { tab.className = 'text-green-500 flex flex-col items-center gap-1'; circle.className = 'w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold'; circle.innerHTML = '&#10003;'; }
    else if (i === step) { tab.className = 'text-brand-coral flex flex-col items-center gap-1'; circle.className = 'w-8 h-8 rounded-full bg-brand-coral text-white flex items-center justify-center font-bold'; circle.innerHTML = String(i); }
    else { tab.className = 'text-slate-400 flex flex-col items-center gap-1'; circle.className = 'w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold'; circle.innerHTML = String(i); }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Item 5: simple "describe what you want quoted" form (separate submission path)
async function submitDescribeForm(ev) {
  ev.preventDefault();
  const form = ev.target;
  const name = form.querySelector('#df-name').value.trim();
  const email = form.querySelector('#df-email').value.trim();
  const phone = form.querySelector('#df-phone').value.trim();
  const details = form.querySelector('#df-details').value.trim();
  const status = document.getElementById('df-status');
  if (!name || !email || !details) { status.textContent = 'Please fill in your name, email, and what you need quoted.'; status.className = 'text-sm font-bold text-red-600 mt-3'; return; }
  const payload = { businessName: "Under Pressure", fullName: name, email, phone, details, source: "Describe It Yourself Form", timestamp: new Date().toISOString() };
  try {
    await fetch(CRM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch (err) {
    console.warn('Lead capture: could not reach CRM endpoint.', err);
  }
  status.textContent = "Thanks! We'll review what you sent and follow up with pricing shortly.";
  status.className = 'text-sm font-bold text-green-600 mt-3';
  form.reset();
}
