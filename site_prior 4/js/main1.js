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
  });
});

// Leads submit to Netlify Forms (form name "quote-request", declared in quote.html).
// Submissions land in Netlify dashboard -> Forms, with optional email notifications you can turn on there.
function encodeFormData(data) {
  return Object.keys(data).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');
}
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

  const rateTable = [
    { match: 'House', min: 0.14, max: 0.35 },
    { match: 'Roof', min: 0.20, max: 0.45 },
    { match: 'Concrete', min: 0.12, max: 0.35 },
    { match: 'Deck', min: 0.18, max: 0.40 },
    { match: 'Commercial', min: 0.25, max: 0.50 },
  ];
  const defaultRate = { min: 0.14, max: 0.35 };

  const serviceBreakdown = selectedServices.map((s) => {
    const rate = rateTable.find((r) => s.includes(r.match)) || defaultRate;
    const minPrice = Math.max(199, Math.round(squareFootage * rate.min));
    const maxPrice = Math.max(249, Math.round(squareFootage * rate.max));
    return { name: s, minPrice, maxPrice };
  });

  const totalMin = serviceBreakdown.reduce((sum, s) => sum + s.minPrice, 0);
  const totalMax = serviceBreakdown.reduce((sum, s) => sum + s.maxPrice, 0);
  const estimatedPriceRange = `$${totalMin.toLocaleString()} - $${totalMax.toLocaleString()}`;
  const leadPayload = {
    "form-name": "quote-request",
    fullName: n, email: e, phone: p, city: c,
    services: selectedServices.join(', '),
    squareFootage: String(squareFootage),
    estimatedPriceRange,
    priceBreakdown: serviceBreakdown.map((s) => `${s.name}: $${s.minPrice.toLocaleString()} - $${s.maxPrice.toLocaleString()}`).join(' | '),
    source: "Website Instant Quote Funnel",
  };

  const btn = document.getElementById('submit-btn');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>Calculating your estimate...</span>`;
  try {
    await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeFormData(leadPayload),
    });
  } catch (err) {
    console.warn('Lead capture: could not reach Netlify Forms endpoint.', err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }

  const breakdownEl = document.getElementById('res-breakdown');
  breakdownEl.innerHTML = serviceBreakdown.map((s) => `
    <div class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span class="text-sm font-semibold text-slate-700">${s.name}</span>
      <span class="text-sm font-bold text-brand-navy">$${s.minPrice.toLocaleString()} - $${s.maxPrice.toLocaleString()}</span>
    </div>`).join('');
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
