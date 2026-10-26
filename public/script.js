const typeData = {
  bike: { label: 'BIKE', title: 'SCAN TO<br />GET ME HOME' },
  car: { label: 'CAR', title: 'SCAN TO<br />REACH MY FAMILY' },
  luggage: { label: 'LUGGAGE', title: 'SCAN TO<br />SEND ME HOME' }
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
    const buyNowButton = document.querySelector('#buyNowButton');
    if (previewType && previewTitle && data) {
      previewType.textContent = data.label;
      previewTitle.innerHTML = data.title;
    }
    if (buyNowButton && data) {
      buyNowButton.href = `get-qr.html?type=${encodeURIComponent(button.dataset.type)}`;
    }
  });
});

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
