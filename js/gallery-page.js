document.addEventListener('DOMContentLoaded', async () => {
  await I18n.init();

  // --- Mobile Menu Toggle ---
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.navbar-menu');

  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navMenu.classList.toggle('open');
  });

  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      navMenu.classList.remove('open');
    });
  });

  // --- Language Switcher ---
  const langBtn = document.querySelector('.lang-btn');
  const langDropdown = document.querySelector('.lang-dropdown');

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    langDropdown.classList.remove('open');
  });

  langDropdown.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = btn.dataset.lang;
      I18n.loadLanguage(lang);
      langDropdown.classList.remove('open');
    });
  });

  // --- Gallery Images ---
  // Add image filenames here. Each entry becomes a gallery item.
  // Example: const GALLERY_IMAGES = ['gallery-1.jpg', 'gallery-2.jpg'];
  const GALLERY_IMAGES = [];

  const grid = document.getElementById('gallery-page-grid');

  if (GALLERY_IMAGES.length > 0) {
    grid.innerHTML = GALLERY_IMAGES.map((src, i) => `
      <div class="gallery-page-item" data-index="${i}">
        <img src="images/gallery/${src}" alt="Gallery image ${i + 1}" loading="lazy">
      </div>
    `).join('');

    // --- Lightbox ---
    const lightbox = document.createElement('div');
    lightbox.className = 'gallery-lightbox';
    lightbox.innerHTML = `
      <button class="gallery-lightbox-close" aria-label="Close">&times;</button>
      <button class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="Previous">&#x2039;</button>
      <img src="" alt="">
      <button class="gallery-lightbox-nav gallery-lightbox-next" aria-label="Next">&#x203A;</button>
    `;
    document.body.appendChild(lightbox);

    const lbImg = lightbox.querySelector('img');
    let currentIndex = 0;

    function openLightbox(index) {
      currentIndex = index;
      lbImg.src = `images/gallery/${GALLERY_IMAGES[currentIndex]}`;
      lightbox.classList.add('open');
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
    }

    function navigate(dir) {
      currentIndex = (currentIndex + dir + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
      lbImg.src = `images/gallery/${GALLERY_IMAGES[currentIndex]}`;
    }

    grid.querySelectorAll('.gallery-page-item').forEach(item => {
      item.addEventListener('click', () => openLightbox(parseInt(item.dataset.index)));
    });

    lightbox.querySelector('.gallery-lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.gallery-lightbox-prev').addEventListener('click', () => navigate(-1));
    lightbox.querySelector('.gallery-lightbox-next').addEventListener('click', () => navigate(1));

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });
  }

  // --- Navbar background on scroll ---
  const navbar = document.querySelector('.navbar');

  // --- Back to Top Button ---
  const backToTop = document.querySelector('.back-to-top');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.style.boxShadow = '0 2px 20px rgba(13,92,63,0.5)';
    } else {
      navbar.style.boxShadow = '0 2px 15px rgba(13,92,63,0.4)';
    }

    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
