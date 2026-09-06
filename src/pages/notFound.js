/** A wrong address, answered in the same vocabulary as the rest of the site. */
const { el, tx } = require('../lib/html');
const { button } = require('../lib/layout');

module.exports = function notFound() {
  return {
    id: '404',
    titleKey: 'meta.notFound.title',
    descKey: 'meta.notFound.desc',
    canonical: '404.html',
    bodyClass: 'nf-page',
    body: `
  <section class="nf" aria-labelledby="nf-title">
    <div class="wrap">
      <div class="nf-board" data-board="nf" aria-hidden="true"></div>
      ${el('p', 'nf.eyebrow', { class: 'kicker' })}
      <h1 class="page-h1" id="nf-title" data-i18n="nf.title">${tx('nf.title')}</h1>
      ${el('p', 'nf.body', { class: 'page-lede' })}
      <div class="hero-ctas">
        ${button('nf.home', 'index.html')}
        ${button('nf.games', 'index.html#shelf', { variant: 'ghost' })}
      </div>
    </div>
  </section>`,
  };
};
