const productType = new URLSearchParams(window.location.search).get('type');
const product = window.BHARATSAFE_PRODUCTS[productType];
const productDetail = document.querySelector('#productDetail');
const productNotFound = document.querySelector('#productNotFound');

if (!product) {
  productNotFound.hidden = false;
} else {
  productDetail.hidden = false;
  document.title = `${product.title} | BharatSafe`;

  document.querySelector('#productBreadcrumbName').textContent = product.label;
  document.querySelector('#productDetailType').textContent = product.label;
  document.querySelector('#productDetailTitle').textContent = product.title;
  document.querySelector('#productDetailShortDescription').textContent = product.shortDescription;
  document.querySelector('#productDetailPrice').textContent = `₹${product.price}`;
  document.querySelector('#productDetailKicker').textContent = product.label;

  const image = document.querySelector('#productDetailImage');
  image.src = product.image;
  image.alt = product.imageAlt;

  const buyNowButton = document.querySelector('#productBuyNow');
  buyNowButton.href = `/get-qr?type=${encodeURIComponent(productType)}`;

  window.renderBharatSafeProductDescription(
    document.querySelector('#productDetailDescription'),
    product
  );

  const faqList = document.querySelector('#productFaqList');
  product.faqs.forEach(({ question, answer }, index) => {
    const item = document.createElement('details');
    if (index === 0) item.open = true;

    const heading = document.createElement('summary');
    heading.textContent = question;
    const response = document.createElement('p');
    response.textContent = answer;

    item.append(heading, response);
    faqList.append(item);
  });
}
