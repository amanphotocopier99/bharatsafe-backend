const productGrid = document.querySelector('#productGrid');

function renderProductCards(products) {
  if (!productGrid) return;
  productGrid.replaceChildren();

  Object.entries(products).forEach(([slug, product]) => {
    const card = document.createElement('article');
    card.className = 'product-card';

    const image = document.createElement('img');
    image.className = 'product-card-image';
    if (product.image) image.src = product.image;
    else image.hidden = true;
    image.alt = product.imageAlt;
    image.loading = 'lazy';

    const content = document.createElement('div');
    content.className = 'product-card-content';

    const label = document.createElement('p');
    label.className = 'product-card-label';
    label.textContent = `BHARATSAFE / ${product.label}`;

    const title = document.createElement('h3');
    title.className = 'product-card-title';
    title.textContent = product.title;

    const description = document.createElement('p');
    description.className = 'product-card-description';
    description.textContent = product.shortDescription;

    const price = document.createElement('p');
    price.className = 'product-card-price';
    price.textContent = `₹${product.price}`;

    const actions = document.createElement('div');
    actions.className = 'product-card-actions';

    const detailsLink = document.createElement('a');
    detailsLink.className = 'button button-outline';
    detailsLink.href = `/product-${encodeURIComponent(slug)}`;
    detailsLink.textContent = 'View product';

    const buyLink = document.createElement('a');
    buyLink.className = 'button button-dark';
    buyLink.href = `/get-qr?type=${encodeURIComponent(slug)}`;
    buyLink.append('Buy now ', Object.assign(document.createElement('span'), {
      textContent: '↗',
      ariaHidden: 'true'
    }));

    actions.append(detailsLink, buyLink);
    content.append(label, title, description, price, actions);
    card.append(image, content);
    productGrid.append(card);
  });
}

if (productGrid) {
  renderProductCards(window.BHARATSAFE_PRODUCTS);
  window.loadBharatSafeProducts()
    .then(renderProductCards)
    .catch((error) => {
      console.error('Product catalog refresh failed:', error);
      const notice = document.createElement('p');
      notice.className = 'product-grid-error';
      notice.setAttribute('role', 'status');
      notice.textContent = 'Product details could not be refreshed. Please reload the page.';
      productGrid.before(notice);
    });
}

const heroCarousel = document.querySelector('#heroCarousel');

if (heroCarousel) {
  const slides = [...heroCarousel.querySelectorAll('.hero-slide')];
  const dots = [...document.querySelectorAll('.carousel-dot')];
  const carouselRegion = heroCarousel.closest('.hero-art') || heroCarousel;
  const previousButton = document.querySelector('#heroCarouselPrevious');
  const nextButton = document.querySelector('#heroCarouselNext');
  const pauseButton = document.querySelector('#heroCarouselPause');
  const count = document.querySelector('#heroCarouselCount');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeSlide = 0;
  let paused = reducedMotion.matches;
  let rotationTimer;

  const updatePauseButton = () => {
    if (!pauseButton) return;
    pauseButton.textContent = paused ? '▶' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', paused ? 'Play product carousel' : 'Pause product carousel');
  };

  const updateCarousel = (index, behavior = 'smooth') => {
    activeSlide = (index + slides.length) % slides.length;
    heroCarousel.scrollTo({
      left: slides[activeSlide].offsetLeft,
      behavior: reducedMotion.matches ? 'auto' : behavior
    });

    slides.forEach((slide, slideIndex) => {
      slide.setAttribute('aria-hidden', String(slideIndex !== activeSlide));
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === activeSlide);
      if (dotIndex === activeSlide) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });

    if (count) count.textContent = `${String(activeSlide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  };

  const stopRotation = () => window.clearInterval(rotationTimer);
  const startRotation = () => {
    stopRotation();
    if (paused || slides.length < 2) return;
    rotationTimer = window.setInterval(() => updateCarousel(activeSlide + 1), 3500);
  };

  previousButton?.addEventListener('click', () => {
    updateCarousel(activeSlide - 1);
  });
  nextButton?.addEventListener('click', () => {
    updateCarousel(activeSlide + 1);
  });
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      updateCarousel(index);
    });
  });
  pauseButton?.addEventListener('click', () => {
    paused = !paused;
    updatePauseButton();
    startRotation();
  });

  let scrollFrame;
  heroCarousel.addEventListener('scroll', () => {
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = window.requestAnimationFrame(() => {
      const index = Math.round(heroCarousel.scrollLeft / heroCarousel.clientWidth);
      if (index !== activeSlide && index >= 0 && index < slides.length) {
        activeSlide = index;
        slides.forEach((slide, slideIndex) => {
          slide.setAttribute('aria-hidden', String(slideIndex !== activeSlide));
        });
        dots.forEach((dot, dotIndex) => {
          dot.classList.toggle('is-active', dotIndex === activeSlide);
          if (dotIndex === activeSlide) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });
        if (count) count.textContent = `${String(activeSlide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      }
    });
  });

  carouselRegion.addEventListener('pointerenter', stopRotation);
  carouselRegion.addEventListener('pointerleave', startRotation);
  carouselRegion.addEventListener('focusin', stopRotation);
  carouselRegion.addEventListener('focusout', (event) => {
    if (!carouselRegion.contains(event.relatedTarget)) startRotation();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopRotation();
    else startRotation();
  });
  reducedMotion.addEventListener('change', (event) => {
    paused = event.matches;
    updatePauseButton();
    startRotation();
  });
  slides.forEach((slide, slideIndex) => {
    slide.setAttribute('aria-hidden', String(slideIndex !== activeSlide));
  });
  updatePauseButton();
  startRotation();
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  });
});

const testimonialTrack = document.querySelector('.testimonial-track');
const testimonialCards = document.querySelectorAll('.testimonial-card');

if (testimonialTrack && testimonialCards.length > 1) {
  let testimonialIndex = 0;
  const moveTestimonials = () => {
    testimonialIndex = (testimonialIndex + 1) % testimonialCards.length;
    testimonialTrack.style.transform = `translateX(-${testimonialIndex * 100}%)`;
  };

  setInterval(moveTestimonials, 5000);
}
