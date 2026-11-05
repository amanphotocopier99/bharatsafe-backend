(() => {
  const tokenKey = 'bharatsafe_admin_token';
  const loginBox = document.getElementById('admin-login-box');
  const loginError = document.getElementById('admin-login-error');
  const loginButton = document.getElementById('admin-login-btn');
  const usernameInput = document.getElementById('admin-username');
  const passwordInput = document.getElementById('admin-password');
  const adminShell = document.querySelector('.admin-shell');
  const logoutButton = document.getElementById('admin-logout-btn');
  const postsList = document.getElementById('admin-post-list');
  const productsBody = document.getElementById('product-table-body');
  const leadsBody = document.getElementById('leads-table-body');
  const globalMessage = document.getElementById('admin-global-message');
  const statusMessages = new Map([
    ['posts', document.getElementById('form-message')],
    ['products', document.getElementById('prod-form-message')]
  ]);
  let posts = [];
  let products = [];
  let leads = [];
  let editingPostId = null;
  let editingProductId = null;
  let postCover = '';
  let productImage = '';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  async function request(url, options = {}) {
    const token = localStorage.getItem(tokenKey);
    const headers = { ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, { ...options, headers });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem(tokenKey);
      throw new Error('Your admin session expired. Please sign in again.');
    }
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
    return result;
  }

  function showMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('is-error', isError);
  }

  function setLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = message ? 'block' : 'none';
  }

  function showLogin(message = '') {
    loginBox.hidden = false;
    adminShell.style.display = 'none';
    logoutButton.hidden = true;
    setLoginError(message);
  }

  function showDashboard() {
    loginBox.hidden = true;
    adminShell.style.display = 'block';
    logoutButton.hidden = false;
    setLoginError('');
  }

  async function loadDashboard() {
    try {
      const [postData, productData, leadData] = await Promise.all([
        request('/api/content/admin/posts'),
        request('/api/content/admin/products'),
        request('/api/leads')
      ]);
      posts = postData;
      products = productData;
      leads = leadData;
      try {
        const migrated = await migrateLegacyContent();
        if (migrated) {
          [posts, products] = await Promise.all([
            request('/api/content/admin/posts'),
            request('/api/content/admin/products')
          ]);
        }
      } catch (error) {
        console.error('Legacy browser content migration failed:', error);
        globalMessage.textContent = `Some older browser-only content could not be moved to the website: ${error.message}`;
        globalMessage.hidden = false;
      }
      renderPosts();
      renderProducts();
      renderLeads();
      updateHeaderStats(document.querySelector('.admin-tab-btn.active')?.dataset.tab || 'tab-journal');
      showDashboard();
    } catch (error) {
      console.error('Admin dashboard load failed:', error);
      showLogin(error.message || 'Could not load the admin dashboard.');
    }
  }

  async function migrateLegacyContent() {
    const migrationKey = 'bharatsafe_content_migrated';
    if (localStorage.getItem(migrationKey)) return false;
    const readLegacy = (...keys) => keys.flatMap((key) => {
      try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
      } catch (error) {
        console.warn(`Could not read legacy admin data "${key}".`, error);
        return [];
      }
    });
    const currentPosts = new Set(posts.map((post) => post.slug));
    const currentProducts = new Set(products.map((product) => product.slug));
    let imported = false;

    for (const oldPost of readLegacy('bharatsafe_posts', 'bs_posts', 'bharatsafe_blog_posts')) {
      if (!oldPost || typeof oldPost !== 'object' || !oldPost.title) continue;
      const slug = slugify(oldPost.slug || oldPost.title);
      if (!slug || currentPosts.has(slug)) continue;
      await request('/api/content/admin/posts', {
        method: 'POST',
        body: JSON.stringify({
          slug,
          title: oldPost.title,
          category: oldPost.category || 'Safety',
          excerpt: oldPost.excerpt || oldPost.title,
          content: oldPost.content || oldPost.body || oldPost.excerpt || oldPost.title,
          cover: oldPost.cover || '',
          published: oldPost.published !== false
        })
      });
      currentPosts.add(slug);
      imported = true;
    }

    for (const oldProduct of readLegacy('bharatsafe_products', 'bs_products')) {
      if (!oldProduct || typeof oldProduct !== 'object' || !oldProduct.title) continue;
      const category = String(oldProduct.category || 'product').trim();
      const slug = slugify(oldProduct.slug || category);
      const price = Number(oldProduct.price);
      if (!slug || currentProducts.has(slug) || !Number.isFinite(price) || price < 1) continue;
      await request('/api/content/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          slug,
          category,
          title: oldProduct.title,
          label: oldProduct.label || category,
          shortDescription: oldProduct.shortDescription || oldProduct.description || oldProduct.desc || oldProduct.title,
          image: oldProduct.image || oldProduct.img || '',
          imageAlt: oldProduct.imageAlt || oldProduct.title,
          price,
          description: oldProduct.longDescription || oldProduct.desc || oldProduct.description || '',
          paragraphs: oldProduct.paragraphs || [],
          features: oldProduct.features || [],
          closing: oldProduct.closing || '',
          faqs: oldProduct.faqs || []
        })
      });
      currentProducts.add(slug);
      imported = true;
    }

    localStorage.setItem(migrationKey, '1');
    return imported;
  }

  loginButton.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
      setLoginError('Enter your username and password.');
      return;
    }
    loginButton.disabled = true;
    loginButton.textContent = 'Signing in…';
    try {
      const result = await request('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem(tokenKey, result.token);
      passwordInput.value = '';
      await loadDashboard();
    } catch (error) {
      setLoginError(error instanceof TypeError
        ? 'Cannot connect to the BharatSafe server.'
        : error.message || 'Sign in failed.');
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Sign in <span aria-hidden="true">↗</span>';
    }
  });
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loginButton.click();
  });
  usernameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') passwordInput.focus();
  });
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem(tokenKey);
    globalMessage.hidden = true;
    showLogin();
  });

  document.querySelectorAll('.admin-tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.admin-tab-view').forEach((view) => view.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
      updateHeaderStats(button.dataset.tab);
    });
  });

  function updateHeaderStats(tab) {
    const heading = document.getElementById('view-heading-title');
    const primary = document.getElementById('stat-primary-count');
    const primaryLabel = document.getElementById('stat-primary-label');
    const secondary = document.getElementById('stat-secondary-count');
    const secondaryLabel = document.getElementById('stat-secondary-label');
    if (tab === 'tab-journal') {
      heading.innerHTML = 'Journal<br /><em>manager.</em>';
      primary.textContent = posts.length;
      primaryLabel.textContent = 'Total stories';
      secondary.textContent = posts.filter((post) => post.published).length;
      secondaryLabel.textContent = 'Published';
    } else if (tab === 'tab-products') {
      heading.innerHTML = 'Product<br /><em>catalog.</em>';
      primary.textContent = products.length;
      primaryLabel.textContent = 'Products';
      secondary.textContent = 'Live';
      secondaryLabel.textContent = 'Storefront';
      document.getElementById('stat-active-tags').textContent = products.length;
    } else if (tab === 'tab-leads') {
      heading.innerHTML = 'Customer<br /><em>submissions.</em>';
      primary.textContent = leads.length;
      primaryLabel.textContent = 'Submissions';
      secondary.textContent = leads.filter((lead) => lead.status !== 'resolved').length;
      secondaryLabel.textContent = 'Needs attention';
    } else {
      heading.innerHTML = 'Customer<br /><em>QR tags.</em>';
      primary.textContent = '—';
      primaryLabel.textContent = 'Paid orders';
      secondary.textContent = '—';
      secondaryLabel.textContent = 'Issued tags';
    }
  }

  function renderPosts() {
    postsList.replaceChildren();
    if (!posts.length) {
      postsList.innerHTML = '<p class="empty-manager">No stories yet. Publish your first journal story above.</p>';
      return;
    }
    posts.forEach((post) => {
      const row = document.createElement('article');
      row.className = 'managed-post';
      const details = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = post.title;
      const summary = document.createElement('p');
      summary.textContent = `${post.category} · /blog#${post.slug}`;
      const status = document.createElement('span');
      status.className = `post-status${post.published ? ' is-live' : ''}`;
      status.textContent = post.published ? 'Published' : 'Draft';
      details.append(title, summary, status);
      const actions = document.createElement('div');
      actions.className = 'post-actions';
      actions.innerHTML = `<button type="button" data-action="edit" data-id="${escapeHtml(post.id)}">Edit</button><button type="button" data-action="delete" data-id="${escapeHtml(post.id)}">Delete</button>`;
      row.append(details, actions);
      postsList.append(row);
    });
  }

  function slugify(value) {
    return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      if (file.size > 2_500_000) return reject(new Error('Choose an image smaller than 2.5 MB.'));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the selected image.'));
      reader.readAsDataURL(file);
    });
  }

  const postForm = document.getElementById('post-form');
  const postTitle = document.getElementById('post-title');
  const postSlug = document.getElementById('post-slug');
  const postCoverInput = document.getElementById('post-cover');
  const postCoverPreview = document.getElementById('post-cover-preview');
  const postMessage = statusMessages.get('posts');
  postTitle.addEventListener('input', () => {
    if (!postSlug.dataset.edited) postSlug.value = slugify(postTitle.value);
  });
  postSlug.addEventListener('input', () => { postSlug.dataset.edited = 'true'; });
  postCoverInput.addEventListener('change', async () => {
    try {
      postCover = await readImage(postCoverInput.files[0]);
      postCoverPreview.src = postCover;
      postCoverPreview.style.display = postCover ? 'block' : 'none';
    } catch (error) {
      showMessage(postMessage, error.message, true);
      postCoverInput.value = '';
    }
  });

  function resetPostForm() {
    postForm.reset();
    editingPostId = null;
    postCover = '';
    postSlug.dataset.edited = '';
    postCoverPreview.style.display = 'none';
    document.getElementById('editor-title').textContent = 'Write a new story';
    document.getElementById('submit-label').textContent = 'Publish story';
    document.getElementById('cancel-edit').hidden = true;
  }

  document.getElementById('cancel-edit').addEventListener('click', resetPostForm);
  postForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = {
      title: postTitle.value.trim(),
      slug: postSlug.value.trim(),
      category: document.getElementById('post-category').value,
      cover: postCover,
      excerpt: document.getElementById('post-excerpt').value.trim(),
      content: document.getElementById('post-content').value.trim(),
      published: document.getElementById('post-published').checked
    };
    try {
      const result = await request(editingPostId
        ? `/api/content/admin/posts/${encodeURIComponent(editingPostId)}`
        : '/api/content/admin/posts', {
        method: editingPostId ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });
      if (editingPostId) posts = posts.map((post) => post.id === editingPostId ? result : post);
      else posts.unshift(result);
      resetPostForm();
      renderPosts();
      updateHeaderStats('tab-journal');
      showMessage(postMessage, 'Story saved and published to the website.');
    } catch (error) {
      showMessage(postMessage, error.message, true);
    }
  });

  postsList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const post = posts.find((item) => item.id === button.dataset.id);
    if (!post) return;
    if (button.dataset.action === 'edit') {
      editingPostId = post.id;
      postTitle.value = post.title;
      postSlug.value = post.slug;
      postSlug.dataset.edited = 'true';
      document.getElementById('post-category').value = post.category;
      document.getElementById('post-excerpt').value = post.excerpt;
      document.getElementById('post-content').value = post.content;
      document.getElementById('post-published').checked = post.published;
      postCover = post.cover || '';
      postCoverPreview.src = postCover;
      postCoverPreview.style.display = postCover ? 'block' : 'none';
      document.getElementById('editor-title').textContent = 'Edit story';
      document.getElementById('submit-label').textContent = 'Update story';
      document.getElementById('cancel-edit').hidden = false;
      postForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (confirm(`Delete "${post.title}"?`)) {
      try {
        await request(`/api/content/admin/posts/${encodeURIComponent(post.id)}`, { method: 'DELETE' });
        posts = posts.filter((item) => item.id !== post.id);
        renderPosts();
        updateHeaderStats('tab-journal');
      } catch (error) {
        showMessage(postMessage, error.message, true);
      }
    }
  });

  const productForm = document.getElementById('product-form');
  const productTitle = document.getElementById('prod-title');
  const productSlug = document.getElementById('prod-slug');
  const productImageInput = document.getElementById('prod-img');
  const productImagePreview = document.getElementById('prod-img-preview');
  const productMessage = statusMessages.get('products');
  productTitle.addEventListener('input', () => {
    if (!productSlug.dataset.edited) productSlug.value = slugify(productTitle.value);
  });
  productSlug.addEventListener('input', () => { productSlug.dataset.edited = 'true'; });
  productImageInput.addEventListener('change', async () => {
    try {
      productImage = await readImage(productImageInput.files[0]);
      productImagePreview.src = productImage;
      productImagePreview.style.display = productImage ? 'block' : 'none';
    } catch (error) {
      showMessage(productMessage, error.message, true);
      productImageInput.value = '';
    }
  });

  function renderProducts() {
    productsBody.replaceChildren();
    if (!products.length) {
      productsBody.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">No products in the catalog.</td></tr>';
      return;
    }
    products.forEach((product) => {
      const row = document.createElement('tr');
      const image = document.createElement('td');
      if (product.image) {
        const thumbnail = document.createElement('img');
        thumbnail.src = product.image;
        thumbnail.className = 'table-thumb';
        thumbnail.alt = '';
        image.append(thumbnail);
      } else image.textContent = '—';
      const name = document.createElement('td');
      name.innerHTML = `<strong>${escapeHtml(product.title)}</strong><br><small>/product-${escapeHtml(product.slug)}</small>`;
      const category = document.createElement('td');
      category.textContent = product.category;
      const price = document.createElement('td');
      price.textContent = `₹${product.price}`;
      const actions = document.createElement('td');
      actions.innerHTML = `<div class="action-btn-group"><button class="btn-sm-action" type="button" data-action="edit" data-id="${escapeHtml(product.id)}">Edit</button><button class="btn-sm-danger" type="button" data-action="delete" data-id="${escapeHtml(product.id)}">Delete</button></div>`;
      row.append(image, name, category, price, actions);
      productsBody.append(row);
    });
  }

  function resetProductForm() {
    productForm.reset();
    editingProductId = null;
    productImage = '';
    productSlug.dataset.edited = '';
    productImagePreview.style.display = 'none';
    document.getElementById('product-editor-title').textContent = 'Add new product';
    document.getElementById('prod-submit-label').textContent = 'Save product';
    document.getElementById('cancel-product-edit').hidden = true;
  }

  document.getElementById('cancel-product-edit').addEventListener('click', resetProductForm);
  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const lines = (id) => document.getElementById(id).value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const faqs = lines('prod-faqs').map((line) => {
      const separator = line.indexOf('|');
      return separator < 0 ? null : {
        question: line.slice(0, separator).trim(),
        answer: line.slice(separator + 1).trim()
      };
    }).filter(Boolean);
    const data = {
      title: productTitle.value.trim(),
      slug: productSlug.value.trim(),
      category: document.getElementById('prod-category').value.trim(),
      price: Number(document.getElementById('prod-price').value),
      image: productImage,
      imageAlt: document.getElementById('prod-image-alt').value.trim(),
      shortDescription: document.getElementById('prod-short-description').value.trim(),
      description: document.getElementById('prod-desc').value.trim(),
      paragraphs: lines('prod-paragraphs'),
      features: lines('prod-features'),
      closing: document.getElementById('prod-closing').value.trim(),
      faqs
    };
    try {
      const result = await request(editingProductId
        ? `/api/content/admin/products/${encodeURIComponent(editingProductId)}`
        : '/api/content/admin/products', {
        method: editingProductId ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });
      if (editingProductId) products = products.map((product) => product.id === editingProductId ? result : product);
      else products.push(result);
      resetProductForm();
      renderProducts();
      updateHeaderStats('tab-products');
      showMessage(productMessage, 'Product saved and updated on the website.');
    } catch (error) {
      showMessage(productMessage, error.message, true);
    }
  });

  productsBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const product = products.find((item) => item.id === button.dataset.id);
    if (!product) return;
    if (button.dataset.action === 'edit') {
      editingProductId = product.id;
      productTitle.value = product.title;
      productSlug.value = product.slug;
      productSlug.dataset.edited = 'true';
      document.getElementById('prod-category').value = product.category;
      document.getElementById('prod-price').value = product.price;
      document.getElementById('prod-image-alt').value = product.imageAlt || '';
      document.getElementById('prod-short-description').value = product.shortDescription;
      document.getElementById('prod-desc').value = product.description || '';
      document.getElementById('prod-paragraphs').value = (product.paragraphs || []).join('\n');
      document.getElementById('prod-features').value = (product.features || []).join('\n');
      document.getElementById('prod-closing').value = product.closing || '';
      document.getElementById('prod-faqs').value = (product.faqs || []).map((faq) => `${faq.question} | ${faq.answer}`).join('\n');
      productImage = product.image || '';
      productImagePreview.src = productImage;
      productImagePreview.style.display = productImage ? 'block' : 'none';
      document.getElementById('product-editor-title').textContent = 'Edit product';
      document.getElementById('prod-submit-label').textContent = 'Update product';
      document.getElementById('cancel-product-edit').hidden = false;
      productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (confirm(`Delete "${product.title}"?`)) {
      try {
        await request(`/api/content/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
        products = products.filter((item) => item.id !== product.id);
        renderProducts();
        updateHeaderStats('tab-products');
      } catch (error) {
        showMessage(productMessage, error.message, true);
      }
    }
  });

  function renderLeads() {
    leadsBody.replaceChildren();
    if (!leads.length) {
      leadsBody.innerHTML = '<tr><td colspan="7" class="admin-empty-cell">No form submissions yet.</td></tr>';
      return;
    }
    leads.forEach((lead) => {
      const row = document.createElement('tr');
      const date = new Date(lead.created_at);
      row.innerHTML = `<td>${Number.isNaN(date.getTime()) ? '—' : escapeHtml(date.toLocaleDateString('en-IN'))}</td><td><strong>${escapeHtml(lead.full_name)}</strong><br><small>${escapeHtml(lead.email)}</small></td><td>${escapeHtml(lead.phone)}</td><td>${escapeHtml(lead.emergency_contact || '—')}</td><td>${escapeHtml(lead.tag_type)}<br><small>${escapeHtml(lead.blood_group)} · ${escapeHtml(lead.address)}</small></td><td><span class="status-pill ${lead.status === 'resolved' ? 'status-resolved' : 'status-new'}">${lead.status === 'resolved' ? 'Resolved' : 'New'}</span></td><td><div class="action-btn-group"><button class="btn-sm-action" type="button" data-action="toggle" data-id="${escapeHtml(lead.id)}">${lead.status === 'resolved' ? 'Mark new' : 'Resolve'}</button><button class="btn-sm-danger" type="button" data-action="delete" data-id="${escapeHtml(lead.id)}">Delete</button></div></td>`;
      leadsBody.append(row);
    });
  }

  leadsBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const lead = leads.find((item) => item.id === button.dataset.id);
    if (!lead) return;
    try {
      if (button.dataset.action === 'delete') {
        if (!confirm('Delete this submission?')) return;
        await request(`/api/leads/${encodeURIComponent(lead.id)}`, { method: 'DELETE' });
        leads = leads.filter((item) => item.id !== lead.id);
      } else {
        lead.status = lead.status === 'resolved' ? 'new' : 'resolved';
        const updated = await request(`/api/leads/${encodeURIComponent(lead.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: lead.status })
        });
        Object.assign(lead, updated);
      }
      renderLeads();
      updateHeaderStats('tab-leads');
    } catch (error) {
      globalMessage.textContent = error.message || 'Could not update the form submission.';
      globalMessage.hidden = false;
    }
  });

  document.getElementById('export-leads-btn').addEventListener('click', () => {
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Address', 'Blood Group', 'Tag Type', 'Emergency Contact', 'Status'];
    const rows = leads.map((lead) => [
      lead.created_at, lead.full_name, lead.email, lead.phone, lead.address,
      lead.blood_group, lead.tag_type, lead.emergency_contact, lead.status
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bharatsafe-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  if (localStorage.getItem(tokenKey)) loadDashboard();
  else showLogin();
})();
