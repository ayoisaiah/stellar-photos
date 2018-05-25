import purify from 'dompurify';

purify.addHook('afterSanitizeAttributes', node => {
  if (
    node.tagName === 'use' &&
    node.hasAttribute('href') &&
    !node.getAttribute('href').match(/^#/)
  ) {
    node.remove();
  }

  if ('target' in node) {
    node.setAttribute('target', '_blank');
  }
});

export default purify;
