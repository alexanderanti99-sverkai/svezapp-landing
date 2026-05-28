import './Footer.css';

const footerLinks = [
  { href: '#search', label: 'Поиск' },
  { href: '#brands', label: 'Марки' },
  { href: '#how-it-works', label: 'Как работает' },
  { href: '#benefits', label: 'Преимущества' },
  { href: '#contacts', label: 'Контакты' },
];

export function Footer() {
  return (
    <footer className="site-footer" data-tune="footer" data-tune-label="Footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand" data-tune-layer="footer-brand">
          <a href="#top" className="site-footer__logo">
            SVE<span>Ж</span>ZAPP
          </a>
          <p>Автозапчасти по артикулу</p>
          <a href="tel:+79999999999">Телефон: +7 (XXX) XXX-XX-XX</a>
        </div>
        <nav className="site-footer__nav" aria-label="Навигация в футере" data-tune-layer="footer-nav">
          {footerLinks.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
