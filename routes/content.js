const express = require('express');
const requireAuth = require('../middleware/auth');
const ContentSeedState = require('../models/ContentSeedState');
const JournalPost = require('../models/JournalPost');
const StoreProduct = require('../models/StoreProduct');
const defaultProducts = require('../public/products');

const router = express.Router();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let defaultsReady;

const defaultPosts = [
  {
    slug: 'one-scan-can-save-a-life',
    title: 'One scan can save a life',
    category: 'Safety',
    excerpt: 'Why sharing the right emergency details before you need them is one of the simplest acts of care.',
    content: 'Emergencies are difficult enough without having to remember every important detail. BharatSafe gives families, riders, and travellers a simple way to make critical information available when every second matters.',
    published: true,
    date: new Date('2026-09-22')
  },
  {
    slug: 'a-calmer-way-to-travel',
    title: 'A calmer way to travel',
    category: 'Travel',
    excerpt: 'Small habits that help you stay ready for the unexpected, from a weekend ride to a long journey.',
    content: 'The best safety tools are the ones you set up before you need them. Keep your emergency contacts current, add useful medical notes, and make sure your BharatSafe tag is visible.',
    published: true,
    date: new Date('2026-09-20')
  }
];

function ensureDefaults() {
  if (!defaultsReady) {
    defaultsReady = (async () => {
      if (await ContentSeedState.findById('initial-content')) return;
      if (await StoreProduct.countDocuments() === 0) {
        await StoreProduct.insertMany(Object.entries(defaultProducts).map(([slug, product]) => ({
          ...product,
          slug,
          category: slug,
          label: product.label
        })));
      }
      if (await JournalPost.countDocuments() === 0) {
        await JournalPost.insertMany(defaultPosts);
      }
      await ContentSeedState.create({ _id: 'initial-content' });
    })().catch((error) => {
      defaultsReady = null;
      throw error;
    });
  }
  return defaultsReady;
}

function serializeProduct(product) {
  return { ...product, id: String(product._id || product.id) };
}

function serializePost(post) {
  return { ...post, id: String(post._id || post.id) };
}

function validateProduct(body) {
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const shortDescription = typeof body.shortDescription === 'string' ? body.shortDescription.trim() : '';
  const price = Number(body.price);
  const image = typeof body.image === 'string' ? body.image : '';
  if (!slugPattern.test(slug) || slug.length > 80 || !title || title.length > 140 || !category || category.length > 40 ||
      !shortDescription || shortDescription.length > 300 || !Number.isFinite(price) || price < 1 || price > 1000000) {
    return null;
  }
  if (image.length > 4_000_000 ||
      (image && !image.startsWith('/') && !/^https?:\/\//i.test(image) &&
       !/^data:image\/(?:png|jpe?g|webp);base64,/i.test(image))) {
    return null;
  }
  const list = (value) => Array.isArray(value)
    ? value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 30)
    : [];
  const faqs = Array.isArray(body.faqs)
    ? body.faqs.filter((faq) => faq && typeof faq.question === 'string' && typeof faq.answer === 'string')
      .map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() }))
      .filter(({ question, answer }) => question && answer).slice(0, 20)
    : [];

  return {
    slug,
    label: typeof body.label === 'string' && body.label.trim() ? body.label.trim().toUpperCase() : category.toUpperCase(),
    category,
    title,
    shortDescription,
    image,
    imageAlt: typeof body.imageAlt === 'string' ? body.imageAlt.trim().slice(0, 250) : '',
    price,
    description: typeof body.description === 'string' ? body.description.trim().slice(0, 3000) : '',
    paragraphs: list(body.paragraphs),
    features: list(body.features),
    closing: typeof body.closing === 'string' ? body.closing.trim().slice(0, 500) : '',
    faqs
  };
}

function validatePost(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const cover = typeof body.cover === 'string' ? body.cover : '';
  if (!slugPattern.test(slug) || slug.length > 80 || !title || title.length > 140 || !category || category.length > 60 ||
      !excerpt || excerpt.length > 500 || !content || content.length > 50000 || cover.length > 4_000_000) {
    return null;
  }
  if (cover && !cover.startsWith('/') && !/^https?:\/\//i.test(cover) &&
      !/^data:image\/(?:png|jpe?g|webp);base64,/i.test(cover)) {
    return null;
  }
  return { slug, title, category, excerpt, content, cover, published: body.published === true };
}

router.get('/products', async (req, res) => {
  try {
    await ensureDefaults();
    const products = await StoreProduct.find().sort({ created_at: 1, _id: 1 }).lean();
    res.json(products.map(serializeProduct));
  } catch (error) {
    console.error('Fetch storefront products failed:', error.message);
    res.status(500).json({ error: 'Could not load products.' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    await ensureDefaults();
    const posts = await JournalPost.find({ published: true }).sort({ date: -1, _id: -1 }).lean();
    res.json(posts.map(serializePost));
  } catch (error) {
    console.error('Fetch journal posts failed:', error.message);
    res.status(500).json({ error: 'Could not load journal stories.' });
  }
});

router.use(requireAuth);

router.get('/admin/posts', async (req, res) => {
  try {
    await ensureDefaults();
    res.json((await JournalPost.find().sort({ date: -1, _id: -1 }).lean()).map(serializePost));
  } catch (error) {
    console.error('Fetch admin posts failed:', error.message);
    res.status(500).json({ error: 'Could not load journal stories.' });
  }
});

router.post('/admin/posts', async (req, res) => {
  const post = validatePost(req.body || {});
  if (!post) return res.status(400).json({ error: 'Enter a valid title, slug, category, excerpt, and story.' });
  try {
    await ensureDefaults();
    const created = await JournalPost.create(post);
    res.status(201).json(serializePost(created.toObject()));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'That story slug is already in use.' });
    console.error('Create journal post failed:', error.message);
    res.status(500).json({ error: 'Could not save the journal story.' });
  }
});

router.put('/admin/posts/:id', async (req, res) => {
  const post = validatePost(req.body || {});
  if (!post) return res.status(400).json({ error: 'Enter a valid title, slug, category, excerpt, and story.' });
  try {
    const updated = await JournalPost.findByIdAndUpdate(req.params.id, post, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Journal story not found.' });
    res.json(serializePost(updated.toObject()));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'That story slug is already in use.' });
    console.error('Update journal post failed:', error.message);
    res.status(500).json({ error: 'Could not update the journal story.' });
  }
});

router.delete('/admin/posts/:id', async (req, res) => {
  try {
    const deleted = await JournalPost.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Journal story not found.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete journal post failed:', error.message);
    res.status(500).json({ error: 'Could not delete the journal story.' });
  }
});

router.get('/admin/products', async (req, res) => {
  try {
    await ensureDefaults();
    res.json((await StoreProduct.find().sort({ created_at: 1, _id: 1 }).lean()).map(serializeProduct));
  } catch (error) {
    console.error('Fetch admin products failed:', error.message);
    res.status(500).json({ error: 'Could not load products.' });
  }
});

router.post('/admin/products', async (req, res) => {
  const product = validateProduct(req.body || {});
  if (!product) return res.status(400).json({ error: 'Enter a valid product title, slug, price, category, and short description.' });
  try {
    await ensureDefaults();
    const created = await StoreProduct.create(product);
    res.status(201).json(serializeProduct(created.toObject()));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'That product slug is already in use.' });
    console.error('Create product failed:', error.message);
    res.status(500).json({ error: 'Could not save the product.' });
  }
});

router.put('/admin/products/:id', async (req, res) => {
  const product = validateProduct(req.body || {});
  if (!product) return res.status(400).json({ error: 'Enter a valid product title, slug, price, category, and short description.' });
  try {
    const updated = await StoreProduct.findByIdAndUpdate(req.params.id, product, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Product not found.' });
    res.json(serializeProduct(updated.toObject()));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'That product slug is already in use.' });
    console.error('Update product failed:', error.message);
    res.status(500).json({ error: 'Could not update the product.' });
  }
});

router.delete('/admin/products/:id', async (req, res) => {
  try {
    const deleted = await StoreProduct.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete product failed:', error.message);
    res.status(500).json({ error: 'Could not delete the product.' });
  }
});

module.exports = router;
