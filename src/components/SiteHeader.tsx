import { Link, useLocation } from 'react-router-dom'

export function SiteHeader() {
  const { pathname } = useLocation()
  const onStorage = pathname === '/' || pathname.startsWith('/products')

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__logo" to="/">Forma Home</Link>
        <nav className="site-header__nav">
          <a href="#">Living Room</a>
          <a href="#">Bedroom</a>
          <a href="#" className={onStorage ? 'active' : ''}>Storage</a>
          <a href="#">Outdoor</a>
        </nav>
        <div className="site-header__actions">
          <button className="icon-btn" aria-label="Search">⌕</button>
          <button className="icon-btn" aria-label="Wishlist">♡</button>
          <button className="icon-btn" aria-label="Cart">⊡ 2</button>
        </div>
      </div>
    </header>
  )
}
