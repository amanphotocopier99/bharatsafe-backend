const typeData = {
  bike: { ...window.BHARATSAFE_PRODUCTS.bike },
  car: { ...window.BHARATSAFE_PRODUCTS.car },
  luggage: { ...window.BHARATSAFE_PRODUCTS.luggage }
};

document.querySelectorAll('.selector-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.selector-button').forEach((item) => {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');
    const data = typeData[button.dataset.type];
    const previewType = document.querySelector('#preview-type');
    const previewTitle = document.querySelector('#preview-title');
    const previewDescription = document.querySelector('#preview-description');
    const previewImage = document.querySelector('#preview-image');
    const productPrice = document.querySelector('#productPrice');
    const buyNowButton = document.querySelector('#buyNowButton');
    const productDetailLink = document.querySelector('#productDetailLink');
    if (previewType && previewTitle && data) {
      previewType.textContent = data.label;
      previewTitle.textContent = data.title;
    }
    if (previewImage && data) {
      previewImage.src = data.image;
      previewImage.alt = data.imageAlt;
    }
    if (previewDescription && data) {
      previewDescription.textContent = data.shortDescription;
    }
    if (productPrice && data) {
      productPrice.textContent = `₹${data.price}`;
    }
    if (buyNowButton && data) {
      buyNowButton.href = `get-qr.html?type=${encodeURIComponent(button.dataset.type)}`;
    }
    if (productDetailLink && data) {
      productDetailLink.href = `product.html?type=${encodeURIComponent(button.dataset.type)}`;
      productDetailLink.setAttribute('aria-label', `View ${data.title} details`);
    }
  });
});

const initialProductType = document.querySelector('.selector-button.active')?.dataset.type;
const initialPreviewDescription = document.querySelector('#preview-description');
if (initialProductType && initialPreviewDescription) {
  initialPreviewDescription.textContent = typeData[initialProductType].shortDescription;
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
