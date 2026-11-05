const productDetail = document.querySelector('#productDetail');
const productNotFound = document.querySelector('#productNotFound');

(async () => {
  const slugFromPath = window.location.pathname.match(/^\/product-(.+)$/)?.[1];
  const productSlug = slugFromPath || new URLSearchParams(window.location.search).get('type');
  let products;
  try {
    products = await window.loadBharatSafeProducts();
  } catch (error) {
    console.error('Product detail load failed:', error);
    productNotFound.hidden = false;
    productNotFound.querySelector('h1').textContent = 'Product details are unavailable.';
    return;
  }
  const product = products[productSlug];

  if (!product) {
    productNotFound.hidden = false;
    return;
  }

  productDetail.hidden = false;
  document.title = `${product.title} | BharatSafe`;

  document.querySelector('#productBreadcrumbName').textContent = product.label;
  document.querySelector('#productDetailType').textContent = product.label;
  document.querySelector('#productDetailTitle').textContent = product.title;
  document.querySelector('#productDetailShortDescription').textContent = product.shortDescription;
  document.querySelector('#productDetailPrice').textContent = `₹${product.price}`;
  document.querySelector('#productDetailKicker').textContent = product.label;

  const image = document.querySelector('#productDetailImage');
  if (product.image) image.src = product.image;
  else image.hidden = true;
  image.alt = product.imageAlt;

  const buyNowButton = document.querySelector('#productBuyNow');
  buyNowButton.href = `/get-qr?type=${encodeURIComponent(product.slug)}`;

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
})();
