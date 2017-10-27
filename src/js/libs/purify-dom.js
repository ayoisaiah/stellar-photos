import purify from 'dompurify';

purify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'use' && node.hasAttribute('href') && !node.getAttribute('href').match(/^#/)) {
    node.remove();
  }
});

export default purify;
