(function(){
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if(!toggle || !mobileNav) return;

  function closeMenu(){
    toggle.setAttribute('aria-expanded','false');
    mobileNav.classList.remove('open');
  }
  function openMenu(){
    toggle.setAttribute('aria-expanded','true');
    mobileNav.classList.add('open');
  }

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if(isOpen){ closeMenu(); } else { openMenu(); }
  });

  mobileNav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ closeMenu(); }
  });

  window.addEventListener('resize', () => {
    if(window.innerWidth > 720){ closeMenu(); }
  });
})();
