(function () {
  const products = {
    bike: {
      label: 'BIKE',
      title: 'BharatSafe Bike Emergency QR Safety Sticker',
      shortDescription: 'Help responders reach your emergency contacts with one quick scan.',
      image: '/bharatsafebike.png.png',
      imageAlt: 'BharatSafe bike QR tag attached to a motorcycle',
      price: 399,
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
      closing: 'Stay safe. Ride smart. Let your family stay connected.',
      faqs: [
        {
          question: 'Where should I place the bike sticker?',
          answer: 'Place it in a visible, clean, flat area on your motorcycle or scooter where it can be scanned easily.'
        },
        {
          question: 'Do people need an app to scan the sticker?',
          answer: 'No. A smartphone camera or standard QR scanner can scan the code.'
        },
        {
          question: 'What information appears when it is scanned?',
          answer: 'The scanner opens the BharatSafe profile linked to your QR code and shows the emergency contact details you have chosen to share.'
        }
      ]
    },
    car: {
      label: 'CAR',
      title: 'BharatSafe Car Emergency QR Safety Sticker',
      shortDescription: 'Make it easier for people to reach your family in an emergency.',
      image: '/bharatsafecar.png.png',
      imageAlt: 'BharatSafe car QR tag attached to a car',
      price: 500,
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
      closing: "Your car's safety companion. Because every second matters.",
      faqs: [
        {
          question: 'Where should I place the car sticker?',
          answer: 'Place it in a visible location on your car so it can be found and scanned when needed.'
        },
        {
          question: 'Can the QR sticker be scanned without an app?',
          answer: 'Yes. A smartphone camera or standard QR scanner can scan it.'
        },
        {
          question: 'What happens when someone scans it?',
          answer: 'They can view the emergency contact information linked to your BharatSafe profile and reach your family.'
        }
      ]
    },
    luggage: {
      label: 'LUGGAGE',
      title: 'BharatSafe Smart Luggage QR Safety Sticker',
      shortDescription: 'Help a finder contact you if your travel bag gets misplaced.',
      image: '/bhararsafeluggage.png.png',
      imageAlt: 'BharatSafe QR tag attached to luggage',
      price: 399,
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
      closing: 'Travel worry-free. Your luggage stays connected to you.',
      faqs: [
        {
          question: 'What kinds of bags can I use this sticker on?',
          answer: 'It is suitable for suitcases, backpacks and other travel bags.'
        },
        {
          question: 'Do finders need a special app to scan it?',
          answer: 'No. The QR code can be scanned using a smartphone camera or standard QR scanner.'
        },
        {
          question: 'What happens when someone scans my luggage sticker?',
          answer: 'They can access the contact information linked to your BharatSafe profile to get in touch about your bag.'
        }
      ]
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
