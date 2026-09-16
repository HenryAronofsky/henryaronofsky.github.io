(function(){
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  if(!toggle || !mobileNav) return;

  function closeMenu(){
    toggle.setAttribute('aria-expanded','false');
    mobileNav.classList.remove('open');
  }
  function openMenu(){
    toggle.setAttribute('aria-expanded','true');
    mobileNav.classList.add('open');
  }

  toggle.addEventListener('click', function(){
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if(isOpen){ closeMenu(); } else { openMenu(); }
  });

  mobileNav.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeMenu(); }
  });

  window.addEventListener('resize', function(){
    if(window.innerWidth > 720){ closeMenu(); }
  });
})();
