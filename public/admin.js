/* ==========================================================================
   BHARATSAFE ADMIN PORTAL ENGINE
   ========================================================================== */

// --- UTILITY: CONVERT FILE TO BASE64 ---
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

// --- TAB ROUTING & HEADING LOGIC ---
const tabs = document.querySelectorAll(".admin-tab-btn");
const tabViews = document.querySelectorAll(".admin-tab-view");
const viewTitle = document.getElementById("view-heading-title");
const primaryStatCount = document.getElementById("stat-primary-count");
const primaryStatLabel = document.getElementById("stat-primary-label");
const secondaryStatCount = document.getElementById("stat-secondary-count");
const secondaryStatLabel = document.getElementById("stat-secondary-label");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tabViews.forEach((v) => v.classList.remove("active"));

    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById(target).classList.add("active");

    updateHeaderStats(target);
  });
});

function updateHeaderStats(activeTab) {
  if (activeTab === "tab-journal") {
    viewTitle.innerHTML = "Journal<br /><em>manager.</em>";
    const posts = getStorage("bs_posts");
    primaryStatCount.textContent = posts.length;
    primaryStatLabel.textContent = "Total posts";
    secondaryStatCount.textContent = posts.filter((p) => p.published).length;
    secondaryStatLabel.textContent = "Published";
  } else if (activeTab === "tab-products") {
    viewTitle.innerHTML = "Product<br /><em>catalog.</em>";
    const prods = getStorage("bs_products");
    primaryStatCount.textContent = prods.length;
    primaryStatLabel.textContent = "Total products";
    secondaryStatCount.textContent = prods.filter((p) => p.category === "bike").length;
    secondaryStatLabel.textContent = "Bike tags";
    document.getElementById("stat-active-tags").textContent = prods.length;
  } else if (activeTab === "tab-leads") {
    viewTitle.innerHTML = "Customer<br /><em>submissions.</em>";
    const leads = getStorage("bs_leads");
    primaryStatCount.textContent = leads.length;
    primaryStatLabel.textContent = "Submissions";
    secondaryStatCount.textContent = leads.filter((l) => l.status === "New").length;
    secondaryStatLabel.textContent = "Pending (New)";
  }
}

// Storage helpers
const getStorage = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const setStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));

/* ==========================================================================
   1. JOURNAL / BLOGS LOGIC (Preserving your original model + image upgrade)
   ========================================================================== */
const postForm = document.getElementById("post-form");
const postList = document.getElementById("admin-post-list");
const postTitleInput = document.getElementById("post-title");
const postCategoryInput = document.getElementById("post-category");
const postCoverInput = document.getElementById("post-cover");
const postCoverPreview = document.getElementById("post-cover-preview");
const postExcerptInput = document.getElementById("post-excerpt");
const postContentInput = document.getElementById("post-content");
const postPublishedInput = document.getElementById("post-published");
const cancelEditBtn = document.getElementById("cancel-edit");
const editorTitle = document.getElementById("editor-title");
const submitLabel = document.getElementById("submit-label");
const formMessage = document.getElementById("form-message");

let editingPostId = null;
let currentPostCoverBase64 = "";

postCoverInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    currentPostCoverBase64 = await fileToBase64(file);
    postCoverPreview.src = currentPostCoverBase64;
    postCoverPreview.style.display = "block";
  }
});

function renderPosts() {
  const posts = getStorage("bs_posts");
  updateHeaderStats("tab-journal");

  if (!posts.length) {
    postList.innerHTML = `<p style="opacity: 0.6; padding: 12px 0;">No stories created yet. Use the editor above to publish your first journal story.</p>`;
    return;
  }

  postList.innerHTML = posts
    .map(
      (post) => `
    <article class="post-row" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
      <div style="display: flex; gap: 14px; align-items: center;">
        ${post.cover ? `<img src="${post.cover}" class="table-thumb" alt="" />` : ""}
        <div>
          <strong style="display: block; font-size: 1rem;">${escapeHtml(post.title)}</strong>
          <small style="opacity: 0.6;">${post.category} · ${post.date} · ${post.published ? "Published" : "Draft"}</small>
        </div>
      </div>
      <div class="action-btn-group">
        <button class="btn-sm-action" onclick="editPost('${post.id}')">Edit</button>
        <button class="btn-sm-danger" onclick="deletePost('${post.id}')">Delete</button>
      </div>
    </article>
  `
    )
    .join("");
}

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const posts = getStorage("bs_posts");

  const postData = {
    id: editingPostId || Date.now().toString(),
    title: postTitleInput.value.trim(),
    category: postCategoryInput.value,
    cover: currentPostCoverBase64,
    excerpt: postExcerptInput.value.trim(),
    content: postContentInput.value.trim(),
    published: postPublishedInput.checked,
    date: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
  };

  if (editingPostId) {
    const idx = posts.findIndex((p) => p.id === editingPostId);
    if (idx !== -1) posts[idx] = postData;
  } else {
    posts.unshift(postData);
  }

  setStorage("bs_posts", posts);
  resetPostForm();
  renderPosts();
  showMessage(formMessage, "Story saved successfully.");
});

window.editPost = (id) => {
  const posts = getStorage("bs_posts");
  const post = posts.find((p) => p.id === id);
  if (!post) return;

  editingPostId = post.id;
  postTitleInput.value = post.title;
  postCategoryInput.value = post.category;
  postExcerptInput.value = post.excerpt;
  postContentInput.value = post.content;
  postPublishedInput.checked = post.published;
  currentPostCoverBase64 = post.cover || "";

  if (currentPostCoverBase64) {
    postCoverPreview.src = currentPostCoverBase64;
    postCoverPreview.style.display = "block";
  }

  editorTitle.textContent = "Edit story";
  submitLabel.textContent = "Update story";
  cancelEditBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deletePost = (id) => {
  if (!confirm("Are you sure you want to delete this story?")) return;
  let posts = getStorage("bs_posts");
  posts = posts.filter((p) => p.id !== id);
  setStorage("bs_posts", posts);
  renderPosts();
};

cancelEditBtn.addEventListener("click", resetPostForm);

function resetPostForm() {
  postForm.reset();
  editingPostId = null;
  currentPostCoverBase64 = "";
  postCoverPreview.style.display = "none";
  editorTitle.textContent = "Write a new story";
  submitLabel.textContent = "Publish story";
  cancelEditBtn.hidden = true;
}

/* ==========================================================================
   2. PRODUCTS MANAGEMENT LOGIC
   ========================================================================== */
const productForm = document.getElementById("product-form");
const productTableBody = document.getElementById("product-table-body");
const prodTitleInput = document.getElementById("prod-title");
const prodCategoryInput = document.getElementById("prod-category");
const prodPriceInput = document.getElementById("prod-price");
const prodImgInput = document.getElementById("prod-img");
const prodImgPreview = document.getElementById("prod-img-preview");
const prodDescInput = document.getElementById("prod-desc");
const cancelProdEditBtn = document.getElementById("cancel-product-edit");
const prodSubmitLabel = document.getElementById("prod-submit-label");
const prodFormMessage = document.getElementById("prod-form-message");

let editingProdId = null;
let currentProdImageBase64 = "";

prodImgInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    currentProdImageBase64 = await fileToBase64(file);
    prodImgPreview.src = currentProdImageBase64;
    prodImgPreview.style.display = "block";
  }
});

function renderProducts() {
  const products = getStorage("bs_products");
  updateHeaderStats("tab-products");

  if (!products.length) {
    productTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; opacity: 0.6; padding: 24px;">No products added yet.</td></tr>`;
    return;
  }

  productTableBody.innerHTML = products
    .map(
      (prod) => `
    <tr>
      <td>
        <img src="${prod.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'/%3E"}" class="table-thumb" alt="" />
      </td>
      <td><strong>${escapeHtml(prod.title)}</strong><br/><small style="opacity: 0.6;">${escapeHtml(prod.description || "")}</small></td>
      <td style="text-transform: capitalize;">${prod.category}</td>
      <td><strong>₹${prod.price}</strong></td>
      <td>
        <div class="action-btn-group">
          <button class="btn-sm-action" onclick="editProduct('${prod.id}')">Edit</button>
          <button class="btn-sm-danger" onclick="deleteProduct('${prod.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

productForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const products = getStorage("bs_products");

  const productData = {
    id: editingProdId || Date.now().toString(),
    title: prodTitleInput.value.trim(),
    category: prodCategoryInput.value,
    price: prodPriceInput.value.trim(),
    description: prodDescInput.value.trim(),
    image: currentProdImageBase64,
  };

  if (editingProdId) {
    const idx = products.findIndex((p) => p.id === editingProdId);
    if (idx !== -1) products[idx] = productData;
  } else {
    products.unshift(productData);
  }

  setStorage("bs_products", products);
  resetProductForm();
  renderProducts();
  showMessage(prodFormMessage, "Product saved successfully.");
});

window.editProduct = (id) => {
  const products = getStorage("bs_products");
  const prod = products.find((p) => p.id === id);
  if (!prod) return;

  editingProdId = prod.id;
  prodTitleInput.value = prod.title;
  prodCategoryInput.value = prod.category;
  prodPriceInput.value = prod.price;
  prodDescInput.value = prod.description || "";
  currentProdImageBase64 = prod.image || "";

  if (currentProdImageBase64) {
    prodImgPreview.src = currentProdImageBase64;
    prodImgPreview.style.display = "block";
  }

  prodSubmitLabel.textContent = "Update product";
  cancelProdEditBtn.hidden = false;
};

window.deleteProduct = (id) => {
  if (!confirm("Are you sure you want to delete this product?")) return;
  let products = getStorage("bs_products");
  products = products.filter((p) => p.id !== id);
  setStorage("bs_products", products);
  renderProducts();
};

cancelProdEditBtn.addEventListener("click", resetProductForm);

function resetProductForm() {
  productForm.reset();
  editingProdId = null;
  currentProdImageBase64 = "";
  prodImgPreview.style.display = "none";
  prodSubmitLabel.textContent = "Save product";
  cancelProdEditBtn.hidden = true;
}

/* ==========================================================================
   3. CUSTOMER FORM SUBMISSIONS / LEADS LOGIC
   ========================================================================== */
const leadsTableBody = document.getElementById("leads-table-body");
const exportLeadsBtn = document.getElementById("export-leads-btn");

function renderLeads() {
  const leads = getStorage("bs_leads");
  updateHeaderStats("tab-leads");

  if (!leads.length) {
    leadsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; opacity: 0.6; padding: 24px;">No customer activations or inquiries recorded yet.</td></tr>`;
    return;
  }

  leadsTableBody.innerHTML = leads
    .map(
      (lead, index) => `
    <tr>
      <td>${lead.date || "—"}</td>
      <td><strong>${escapeHtml(lead.name || "N/A")}</strong></td>
      <td>${escapeHtml(lead.phone || "N/A")}</td>
      <td>${escapeHtml(lead.emergencyPhone || "—")}</td>
      <td>${escapeHtml(lead.category || "General")}</td>
      <td>
        <span class="status-pill ${lead.status === "Resolved" ? "status-resolved" : "status-new"}">
          ${lead.status || "New"}
        </span>
      </td>
      <td>
        <div class="action-btn-group">
          <button class="btn-sm-action" onclick="toggleLeadStatus(${index})">Toggle</button>
          <button class="btn-sm-danger" onclick="deleteLead(${index})">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

window.toggleLeadStatus = (index) => {
  const leads = getStorage("bs_leads");
  leads[index].status = leads[index].status === "Resolved" ? "New" : "Resolved";
  setStorage("bs_leads", leads);
  renderLeads();
};

window.deleteLead = (index) => {
  if (!confirm("Delete this submission record?")) return;
  const leads = getStorage("bs_leads");
  leads.splice(index, 1);
  setStorage("bs_leads", leads);
  renderLeads();
};

exportLeadsBtn.addEventListener("click", () => {
  const leads = getStorage("bs_leads");
  if (!leads.length) return alert("No lead data to export.");

  const headers = ["Date", "Name", "Phone", "Emergency Phone", "Category", "Status"];
  const rows = leads.map((l) => [
    `"${l.date || ""}"`,
    `"${l.name || ""}"`,
    `"${l.phone || ""}"`,
    `"${l.emergencyPhone || ""}"`,
    `"${l.category || ""}"`,
    `"${l.status || "New"}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `BharatSafe_Submissions_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Helpers
function escapeHtml(str) {
  const div = document.createElement("div");
  div.innerText = str;
  return div.innerHTML;
}

function showMessage(el, text) {
  el.textContent = text;
  el.style.opacity = "1";
  setTimeout(() => {
    el.style.opacity = "0";
  }, 3000);
}

// Initial Boot
renderPosts();
renderProducts();
renderLeads();
/* ============================================================
   BharatSafe Admin — Journal, Products, Leads
   ============================================================ */

/* ---------- Storage helpers ---------- */
const STORAGE_POSTS    = 'bharatsafe_posts';
const STORAGE_PRODUCTS = 'bharatsafe_products';

function loadPosts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_POSTS) || '[]'); }
  catch { return []; }
}
function savePosts(posts) {
  localStorage.setItem(STORAGE_POSTS, JSON.stringify(posts));
}
function loadProducts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PRODUCTS) || '[]'); }
  catch { return []; }
}
function saveProducts(products) {
  localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
}

/* ---------- Tab switching ---------- */
(function initTabs() {
  const buttons = document.querySelectorAll('.admin-tab-btn');
  const views   = document.querySelectorAll('.admin-tab-view');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
})();

/* ============================================================
   TAB 1 — JOURNAL
   ============================================================ */
(function initJournal() {
  const form       = document.getElementById('post-form');
  const list       = document.getElementById('admin-post-list');
  if (!form || !list) return;

  const titleInput = document.getElementById('post-title');
  const catInput   = document.getElementById('post-category');
  const coverInput = document.getElementById('post-cover');
  const coverPrev  = document.getElementById('post-cover-preview');
  const excerptIn  = document.getElementById('post-excerpt');
  const contentIn  = document.getElementById('post-content');
  const pubInput   = document.getElementById('post-published');
  const submitLbl  = document.getElementById('submit-label');
  const cancelBtn  = document.getElementById('cancel-edit');
  const editorTtl  = document.getElementById('editor-title');
  const msg        = document.getElementById('form-message');

  let editingId = null;
  let coverData = null;

  coverInput.addEventListener('change', () => {
    const file = coverInput.files[0];
    if (!file) { coverData = null; coverPrev.style.display = 'none'; return; }
    const reader = new FileReader();
    reader.onload = e => {
      coverData = e.target.result;
      coverPrev.src = coverData;
      coverPrev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  function renderPosts() {
    const posts = loadPosts();
    if (!posts.length) {
      list.innerHTML = `<p style="opacity:.5;padding:20px 0;">No stories yet.</p>`;
      return;
    }
    list.innerHTML = '';
    posts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'detail-card';
      card.style.marginBottom = '12px';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div>
            <strong>${escapeHtml(p.title)}</strong>
            <div style="font-size:.85rem;opacity:.7;">${escapeHtml(p.category)} · ${p.published ? 'Published' : 'Draft'}</div>
          </div>
          <div class="action-btn-group">
            <button class="btn-sm-action" data-action="edit" data-id="${p.id}">Edit</button>
            <button class="btn-sm-danger" data-action="delete" data-id="${p.id}">Delete</button>
          </div>
        </div>`;
      list.appendChild(card);
    });
  }

  list.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    const posts = loadPosts();
    const post = posts.find(p => p.id === id);
    if (!post) return;

    if (action === 'delete') {
      if (!confirm('Delete this story?')) return;
      savePosts(posts.filter(p => p.id !== id));
      renderPosts();
    } else if (action === 'edit') {
      editingId = id;
      titleInput.value   = post.title;
      catInput.value     = post.category;
      excerptIn.value    = post.excerpt;
      contentIn.value    = post.content;
      pubInput.checked   = post.published;
      coverData          = post.cover || null;
      if (coverData) { coverPrev.src = coverData; coverPrev.style.display = 'block'; }
      editorTtl.textContent = 'Edit story';
      submitLbl.textContent = 'Update story';
      cancelBtn.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  cancelBtn.addEventListener('click', resetEditor);

  function resetEditor() {
    editingId = null;
    coverData = null;
    form.reset();
    coverPrev.style.display = 'none';
    editorTtl.textContent = 'Write a new story';
    submitLbl.textContent = 'Publish story';
    cancelBtn.hidden = true;
    msg.textContent = '';
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const posts = loadPosts();
    const data = {
      id: editingId || 'post_' + Date.now(),
      title: titleInput.value.trim(),
      category: catInput.value,
      excerpt: excerptIn.value.trim(),
      content: contentIn.value.trim(),
      published: pubInput.checked,
      cover: coverData,
      updatedAt: new Date().toISOString()
    };
    if (editingId) {
      const i = posts.findIndex(p => p.id === editingId);
      if (i > -1) posts[i] = data; else posts.unshift(data);
    } else {
      posts.unshift(data);
    }
    savePosts(posts);
    msg.textContent = editingId ? 'Story updated.' : 'Story published.';
    resetEditor();
    renderPosts();
  });

  renderPosts();
})();

/* ============================================================
   TAB 2 — PRODUCTS
   ============================================================ */
(function initProducts() {
  const form       = document.getElementById('product-form');
  const tbody      = document.getElementById('product-table-body');
  if (!form || !tbody) return;

  const titleIn  = document.getElementById('prod-title');
  const catIn    = document.getElementById('prod-category');
  const priceIn  = document.getElementById('prod-price');
  const imgIn    = document.getElementById('prod-img');
  const imgPrev  = document.getElementById('prod-img-preview');
  const descIn   = document.getElementById('prod-desc');
  const submitLb = document.getElementById('prod-submit-label');
  const cancelBt = document.getElementById('cancel-product-edit');
  const editorTt = document.getElementById('product-editor-title');
  const msg      = document.getElementById('prod-form-message');
  const statTags = document.getElementById('stat-active-tags');

  let editingId = null;
  let imgData   = null;

  imgIn.addEventListener('change', () => {
    const file = imgIn.files[0];
    if (!file) { imgData = null; imgPrev.style.display = 'none'; return; }
    const reader = new FileReader();
    reader.onload = e => {
      imgData = e.target.result;
      imgPrev.src = imgData;
      imgPrev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  function renderProducts() {
    const products = loadProducts();
    tbody.innerHTML = '';
    if (statTags) statTags.textContent = products.length;
    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;opacity:.5;padding:24px;">No products yet.</td></tr>`;
      return;
    }
    products.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.img ? `<img src="${p.img}" class="table-thumb" alt="">` : '—'}</td>
        <td>${escapeHtml(p.title)}</td>
        <td>${escapeHtml(p.category)}</td>
        <td>₹${escapeHtml(String(p.price))}</td>
        <td>
          <div class="action-btn-group">
            <button class="btn-sm-action" data-action="edit" data-id="${p.id}">Edit</button>
            <button class="btn-sm-danger" data-action="delete" data-id="${p.id}">Delete</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    if (!p) return;

    if (action === 'delete') {
      if (!confirm('Delete this product?')) return;
      saveProducts(products.filter(x => x.id !== id));
      renderProducts();
    } else if (action === 'edit') {
      editingId = id;
      titleIn.value = p.title;
      catIn.value   = p.category;
      priceIn.value = p.price;
      descIn.value  = p.desc || '';
      imgData       = p.img || null;
      if (imgData) { imgPrev.src = imgData; imgPrev.style.display = 'block'; }
      editorTt.textContent = 'Edit product';
      submitLb.textContent = 'Update product';
      cancelBt.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  cancelBt.addEventListener('click', resetProduct);
  function resetProduct() {
    editingId = null;
    imgData = null;
    form.reset();
    imgPrev.style.display = 'none';
    editorTt.textContent = 'Add new product / QR tag';
    submitLb.textContent = 'Save product';
    cancelBt.hidden = true;
    msg.textContent = '';
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const products = loadProducts();
    const data = {
      id: editingId || 'prod_' + Date.now(),
      title: titleIn.value.trim(),
      category: catIn.value,
      price: Number(priceIn.value),
      desc: descIn.value.trim(),
      img: imgData,
      updatedAt: new Date().toISOString()
    };
    if (editingId) {
      const i = products.findIndex(x => x.id === editingId);
      if (i > -1) products[i] = data; else products.unshift(data);
    } else {
      products.unshift(data);
    }
    saveProducts(products);
    msg.textContent = editingId ? 'Product updated.' : 'Product added.';
    resetProduct();
    renderProducts();
  });

  renderProducts();
})();

/* ============================================================
   TAB 3 — FORM SUBMISSIONS (backend + login form)
   ============================================================ */
(function initLeadsTab() {
  const tbody = document.getElementById('leads-table-body');
  if (!tbody) return;

  const TOKEN_KEY = 'bharatsafe_admin_token';
  let leads = [];

  const loginBox  = document.getElementById('admin-login-box');
  const leadsSect = document.getElementById('admin-leads-section');
  const userInput = document.getElementById('admin-username');
  const passInput = document.getElementById('admin-password');
  const loginBtn  = document.getElementById('admin-login-btn');
  const loginErr  = document.getElementById('admin-login-error');
  const logoutBtn = document.getElementById('admin-logout-btn');

  function showLogin() {
    if (loginBox)  loginBox.style.display = 'block';
    if (leadsSect) leadsSect.style.display = 'none';
    const adminShell = document.querySelector('.admin-shell');
    if (adminShell) adminShell.style.display = 'none';
  }
  function showLeads() {
    if (loginBox)  loginBox.style.display = 'none';
    if (leadsSect) leadsSect.style.display = 'block';
    const adminShell = document.querySelector('.admin-shell');
    if (adminShell) adminShell.style.display = 'block';
  }

  async function doLogin() {
    if (!userInput || !passInput) return;
    loginErr.style.display = 'none';

    const username = userInput.value.trim();
    const password = passInput.value;

    if (!username || !password) {
      loginErr.textContent = 'Please enter username and password.';
      loginErr.style.display = 'block';
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 404) {
          throw new Error('Admin API not found. Open this page from the BharatSafe backend server, not a static preview.');
        }
        throw new Error(err.error || 'Invalid credentials');
      }
      const { token } = await res.json();
      localStorage.setItem(TOKEN_KEY, token);
      passInput.value = '';
      await loadLeads();
    } catch (err) {
      loginErr.textContent = err instanceof TypeError
        ? 'Cannot reach the BharatSafe server. Start the backend and open this page from its address.'
        : err.message || 'Login failed.';
      loginErr.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign in <span aria-hidden="true">↗</span>';
    }
  }

  async function loadLeads() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { showLogin(); return; }

    try {
      const res = await fetch('/api/leads', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        showLogin();
        return;
      }
      if (res.status === 404) {
        throw new Error('Admin API not found. Open this page from the BharatSafe backend server, not a static preview.');
      }
      if (!res.ok) throw new Error(`Could not load admin data (HTTP ${res.status}).`);
      leads = await res.json();
      render();
      showLeads();
    } catch (err) {
      console.error(err);
      showLogin();
      loginErr.textContent = err instanceof TypeError
        ? 'Cannot reach the BharatSafe server. Start the backend and open this page from its address.'
        : err.message || 'Could not load admin data.';
      loginErr.style.display = 'block';
    }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function render() {
    tbody.innerHTML = '';
    if (!leads.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;opacity:.5;padding:24px;">No form submissions yet.</td></tr>`;
      return;
    }
    leads.forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(l.created_at)}</td>
        <td>${esc(l.full_name)}<br><small style="opacity:.6">${esc(l.email)}</small></td>
        <td>${esc(l.phone)}</td>
        <td>${esc(l.emergency_contact || '—')}</td>
        <td>${esc((l.tag_type || '').toUpperCase())}<br><small style="opacity:.6">${esc(l.blood_group)} · ${esc(l.address)}</small></td>
        <td>
          <span class="status-pill ${l.status === 'resolved' ? 'status-resolved' : 'status-new'}">
            ${l.status === 'resolved' ? 'Resolved' : 'New'}
          </span>
        </td>
        <td>
          <div class="action-btn-group">
            <button class="btn-sm-action" data-action="toggle" data-id="${l.id}">
              ${l.status === 'resolved' ? 'Mark new' : 'Resolve'}
            </button>
            <button class="btn-sm-danger" data-action="delete" data-id="${l.id}">Delete</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  tbody.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const lead = leads.find(l => String(l.id) === String(id));
    if (!lead) return;
    const token = localStorage.getItem(TOKEN_KEY);

    if (btn.dataset.action === 'toggle') {
      const newStatus = lead.status === 'resolved' ? 'new' : 'resolved';
      const r = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ status: newStatus })
      });
      if (r.ok) { lead.status = newStatus; render(); }
    } else if (btn.dataset.action === 'delete') {
      if (!confirm('Delete this submission?')) return;
      const r = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      });
      if (r.ok) { leads = leads.filter(l => String(l.id) !== String(id)); render(); }
    }
  });

  if (loginBtn) loginBtn.addEventListener('click', doLogin);
  if (passInput) passInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  if (userInput) userInput.addEventListener('keydown', e => { if (e.key === 'Enter') passInput.focus(); });

  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
  });

  const exportBtn = document.getElementById('export-leads-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!leads.length) return alert('No leads to export.');
      const headers = ['Date','Name','Email','Phone','Address','Blood Group','Tag Type','Emergency Contact','Status'];
      const rows = leads.map(l => [
        l.created_at, l.full_name, l.email, l.phone, l.address,
        l.blood_group, l.tag_type, l.emergency_contact, l.status
      ]);
      const csv = [headers, ...rows]
        .map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bharatsafe-leads-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Initial load — silently checks if a token exists.
  // If not, shows the login form (no popup!).
  loadLeads();
})();
