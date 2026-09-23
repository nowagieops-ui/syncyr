const email = 'info@syncyr.com';
const copy = document.querySelector('#copy-email');
const status = document.querySelector('#copy-status');
let statusTimer;
copy.addEventListener('click', async () => {
  clearTimeout(statusTimer);
  try {
    await navigator.clipboard.writeText(email);
    status.textContent = 'Email address copied.';
  } catch {
    status.textContent = 'Select the email address to copy it.';
    const selection = window.getSelection();
    const range = document.createRange();
    const address = document.querySelector('.email-link').firstChild;
    range.setStart(address, 0); range.setEnd(address, email.length);
    selection.removeAllRanges(); selection.addRange(range);
  }
  statusTimer = setTimeout(() => { status.textContent = ''; }, 5000);
});

const hero = document.querySelector('.hero');
const art = document.querySelector('.signal-art');
const toggle = document.querySelector('#motion-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = false, visible = true, targetX = 0, targetY = 0, x = 0, y = 0, frame = 0;
function tick() {
  frame = 0;
  if (paused || reduced.matches || !visible || document.hidden) return;
  x += (targetX - x) * .045; y += (targetY - y) * .045;
  art.style.setProperty('--signal-x', `${x.toFixed(2)}px`);
  art.style.setProperty('--signal-y', `${y.toFixed(2)}px`);
  if (Math.abs(targetX-x) + Math.abs(targetY-y) > .02) frame = requestAnimationFrame(tick);
}
function requestTick() { if (!frame && !paused && !reduced.matches && visible && !document.hidden) frame = requestAnimationFrame(tick); }
hero.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  const bounds = hero.getBoundingClientRect();
  targetX = ((event.clientX-bounds.left)/bounds.width-.5)*30;
  targetY = ((event.clientY-bounds.top)/bounds.height-.5)*22;
  requestTick();
}, {passive:true});
hero.addEventListener('pointerleave', () => { targetX=0; targetY=0; requestTick(); });
function motionState() {
  document.body.classList.toggle('motion-paused', paused || reduced.matches || !visible || document.hidden);
  if (paused || reduced.matches || !visible || document.hidden) { cancelAnimationFrame(frame); frame=0; }
  else requestTick();
}
toggle.addEventListener('click', () => {
  paused = !paused;
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.querySelector('.motion-label').textContent = paused ? 'Resume motion' : 'Pause motion';
  toggle.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
  motionState();
});
reduced.addEventListener('change', motionState);
document.addEventListener('visibilitychange', motionState);
new IntersectionObserver(entries => { visible=entries[0].isIntersecting; motionState(); }, {threshold:0}).observe(hero);
motionState();
