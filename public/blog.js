function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function renderPosts(posts) {
  const grid = document.querySelector('#post-grid');
  document.querySelector('#post-count').textContent = `${posts.length} ${posts.length === 1 ? 'story' : 'stories'}`;
  grid.replaceChildren();

  if (!posts.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-posts';
    const heading = document.createElement('h2');
    heading.textContent = 'Stories are on their way.';
    const message = document.createElement('p');
    message.textContent = 'Check back soon for new stories.';
    empty.append(heading, message);
    grid.append(empty);
    return;
  }

  posts.forEach((post, index) => {
    const card = document.createElement('article');
    card.className = `post-card ${index === 0 ? 'featured-post' : ''}`;
    card.id = post.slug;

    const artwork = document.createElement('div');
    artwork.className = `post-art post-art-${index % 3}`;
    if (post.cover) {
      const cover = document.createElement('img');
      cover.src = post.cover;
      cover.alt = '';
      cover.loading = 'lazy';
      artwork.append(cover);
    }
    const categoryBadge = document.createElement('strong');
    categoryBadge.textContent = post.category;
    artwork.append(categoryBadge);

    const meta = document.createElement('div');
    meta.className = 'post-meta';
    const category = document.createElement('span');
    category.textContent = post.category;
    const date = document.createElement('span');
    date.textContent = formatDate(post.date);
    meta.append(category, date);

    const title = document.createElement('h2');
    title.textContent = post.title;
    const excerpt = document.createElement('p');
    excerpt.textContent = post.excerpt;

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Read story ↗';
    const content = document.createElement('div');
    content.className = 'story-content';
    String(post.content || '').split(/\r?\n/).filter(Boolean).forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      content.append(paragraph);
    });
    details.append(summary, content);
    card.append(artwork, meta, title, excerpt, details);
    grid.append(card);
  });
}

(async () => {
  const grid = document.querySelector('#post-grid');
  try {
    const response = await fetch('/api/content/posts');
    if (!response.ok) throw new Error('Could not load journal stories.');
    renderPosts(await response.json());
  } catch (error) {
    console.error('Journal load failed:', error);
    const message = document.createElement('p');
    message.className = 'empty-posts';
    message.textContent = 'Journal stories are temporarily unavailable. Please try again later.';
    grid.replaceChildren(message);
  }
})();
