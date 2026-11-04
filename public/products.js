(function () {
  const products = {
    bike: {
      title: 'BharatSafe Bike Emergency QR Safety Sticker',
      description: 'Ride with an extra layer of safety with the BharatSafe Bike Emergency QR Sticker.',
      paragraphs: [
        'Designed for motorcycles and scooters, this smart QR sticker helps people connect with your emergency contacts when you need assistance. Simply place the sticker on your bike, and let others scan the QR code using their smartphone camera.'
      ],
      features: [
        'Unique QR code linked to your BharatSafe profile.',
        'Quick access to emergency contact information.',
        'Helps connect accident responders with your family.',
        'Easy-to-apply, compact and durable sticker.',
        'Suitable for motorcycles and scooters.',
        'Scan using any standard smartphone QR scanner.'
      ],
      closing: 'Stay safe. Ride smart. Let your family stay connected.'
    },
    car: {
      title: 'BharatSafe Car Emergency QR Safety Sticker',
      description: "Your family's safety matters, even when you are away from home.",
      paragraphs: [
        'The BharatSafe Car Emergency QR Sticker is designed to provide quick access to your emergency contact details when an unexpected situation occurs.',
        'Stick it on your car in a visible location. In an emergency, anyone can scan the QR code using their smartphone and access the emergency contact information linked to your BharatSafe profile.'
      ],
      features: [
        'Unique QR code for your vehicle.',
        'Quick access to emergency contact details.',
        'Helps responders reach your family.',
        'Easy-to-apply and convenient design.',
        'Suitable for cars, SUVs and other personal vehicles.',
        'Compatible with standard smartphone QR scanners.'
      ],
      closing: "Your car's safety companion. Because every second matters."
    },
    luggage: {
      title: 'BharatSafe Smart Luggage QR Safety Sticker',
      description: 'Travel with confidence using the BharatSafe Smart Luggage QR Sticker.',
      paragraphs: [
        'Whether you are travelling by flight, train, bus or road, your luggage deserves an extra layer of protection.',
        'The BharatSafe Luggage QR Sticker allows someone who finds your lost or unattended bag to scan the QR code and access the contact information linked to your BharatSafe profile.',
        'Simply attach the sticker to your suitcase, backpack or travel bag and make your luggage easier to identify and return.'
      ],
      features: [
        'Unique QR code linked to your BharatSafe profile.',
        'Helps finders contact the luggage owner.',
        'Ideal for suitcases, backpacks and travel bags.',
        'Easy-to-apply and travel-friendly design.',
        'Quick scanning using a smartphone camera.',
        'Helps improve the chances of recovering misplaced luggage.'
      ],
      closing: 'Travel worry-free. Your luggage stays connected to you.'
    }
  };

  function renderDescription(container, product) {
    container.replaceChildren();

    const introduction = document.createElement('p');
    introduction.textContent = product.description;
    container.append(introduction);

    product.paragraphs.forEach((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      container.append(paragraph);
    });

    const heading = document.createElement('strong');
    heading.textContent = 'Key Features:';
    container.append(heading);

    const list = document.createElement('ul');
    product.features.forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    });
    container.append(list);

    const closing = document.createElement('p');
    closing.className = 'product-description-closing';
    closing.textContent = product.closing;
    container.append(closing);
  }

  window.BHARATSAFE_PRODUCTS = products;
  window.renderBharatSafeProductDescription = renderDescription;
})();
