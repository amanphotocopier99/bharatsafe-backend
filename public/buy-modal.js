(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'buy-modal';
  dialog.setAttribute('aria-label', 'Buy a BharatSafe tag');

  const header = document.createElement('div');
  header.className = 'buy-modal__header';

  const title = document.createElement('span');
  title.textContent = 'YOUR BHARATSAFE';

  const closeButton = document.createElement('button');
  closeButton.className = 'buy-modal__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close checkout');
  closeButton.textContent = '×';

  const frame = document.createElement('iframe');
  frame.className = 'buy-modal__frame';
  frame.title = 'BharatSafe order details';
  frame.src = 'about:blank';

  header.append(title, closeButton);
  dialog.append(header, frame);
  document.body.append(dialog);

  const closeDialog = () => {
    dialog.close();
    frame.src = 'about:blank';
  };

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element
      ? event.target.closest('a[href^="/get-qr"]')
      : null;
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const checkoutUrl = new URL(link.href, window.location.href);
    if (!checkoutUrl.searchParams.has('type')) {
      const selectedType = document.querySelector('.selector-button.active')?.dataset.type;
      if (selectedType) checkoutUrl.searchParams.set('type', selectedType);
    }
    checkoutUrl.searchParams.set('embed', '1');
    frame.src = `${checkoutUrl.pathname}${checkoutUrl.search}`;
    dialog.showModal();
  });

  closeButton.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    frame.src = 'about:blank';
  });
})();
