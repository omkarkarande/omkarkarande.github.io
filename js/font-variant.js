// Explicit preview variants share the same content and layout.
(() => {
  const fonts = { transcity: 'Transcity', quivert: 'Quivert', runiga: 'Runiga', mending: 'Mending' };
  const key = new URLSearchParams(location.search).get('font');
  if (Object.hasOwn(fonts, key)) {
    document.documentElement.style.setProperty('--serif', `'${fonts[key]}', 'Fraunces', Georgia, serif`);
  }
})();
