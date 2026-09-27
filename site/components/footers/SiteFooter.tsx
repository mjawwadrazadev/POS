import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import FooterBackToTop from "@site/components/footers/FooterBackToTop";
import { CommonScrollAnimated, CommonScrollAnimatedLink } from "@site/components/animations/CommonScrollAnimated";
import { mailtoHref, siteConfig, socialLinks } from "@site/content/site";
import { industries } from "@site/content/industries";

const discoverLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/industries", label: "Industries" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About us" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

function FooterTitle({ children }: { children: string }) {
  return (
    <div className="mxd-footer-nav02__title">
      <CommonScrollAnimated className="footer-data anim-uni-slide-down" as="p" animation="slideDownLine">
        <span>{children}</span>
      </CommonScrollAnimated>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <CommonScrollAnimatedLink className="anim-uni-slide-down" href={href} animation="slideDownLine">
        <span>{label}</span>
      </CommonScrollAnimatedLink>
    </li>
  );
}

function FooterAnchor({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <CommonScrollAnimated className="anim-uni-slide-down" href={href} as="a" animation="slideDownLine">
        <span>{label}</span>
      </CommonScrollAnimated>
    </li>
  );
}

export default function SiteFooter() {
  return (
    <BlurSection as="footer" className="mxd-footer">
      <div className="mxd-container grid-l-container">
        {/* Navigation */}
        <div className="mxd-block">
          <div className="container-fluid p-0">
            <div className="row g-0">
              <div className="col-12 col-xl-6 mxd-footer__item">
                <nav className="mxd-footer__nav02">
                  <div className="container-fluid p-0">
                    <div className="row g-0">
                      <div className="col-12 col-md-6 mxd-footer-nav02__item mxd-grid-item">
                        <div className="mxd-footer-nav02__block">
                          <FooterTitle>/ Discover</FooterTitle>
                          <div className="mxd-footer-nav02__list">
                            <ul>
                              {discoverLinks.map((l) => (
                                <FooterLink key={l.href} {...l} />
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="col-12 col-md-6 mxd-footer-nav02__item mxd-grid-item">
                        <div className="mxd-footer-nav02__block">
                          <FooterTitle>/ Contact</FooterTitle>
                          <div className="mxd-footer-nav02__list">
                            <ul>
                              <FooterAnchor href={mailtoHref} label={siteConfig.email} />
                              <FooterAnchor href={siteConfig.phoneHref} label={siteConfig.phone} />
                            </ul>
                          </div>
                        </div>
                        <div className="mxd-footer-nav02__block">
                          <FooterTitle>/ Already a customer?</FooterTitle>
                          <div className="mxd-footer-nav02__list">
                            <ul>
                              <FooterAnchor href={siteConfig.loginHref} label="Store login" />
                              <FooterAnchor href="/forgot-password" label="Forgot password" />
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </nav>
              </div>
              <div className="col-12 col-xl-6 mxd-footer__item mxd-grid-item">
                <div className="mxd-footer__socials-list">
                  <div className="container-fluid p-0">
                    <div className="row g-0">
                      <div className="col-12 mxd-footer-nav02__item">
                        <div className="mxd-footer-nav02__block">
                          <FooterTitle>/ Solutions</FooterTitle>
                          <div className="mxd-footer-nav02__list">
                            {industries.slice(0, 5).map((industry, idx) => (
                              <a
                                key={industry.slug}
                                className="socials-list__item slide-right-up"
                                href={`/industries/${industry.slug}`}
                              >
                                <CommonScrollAnimated
                                  className="socials-list__divider divider-top anim-uni-clip-in"
                                  as="div"
                                  animation="clipIn"
                                />
                                <div className="socials-list__info">
                                  <CommonScrollAnimated
                                    className="socials-list__number anim-uni-slide-down"
                                    as="div"
                                    animation="slideDownLine"
                                  >
                                    <span>[{String(idx + 1).padStart(2, "0")}]</span>
                                  </CommonScrollAnimated>
                                  <CommonScrollAnimated
                                    className="socials-list__name anim-uni-slide-down"
                                    as="div"
                                    animation="slideDownLine"
                                  >
                                    <span>{industry.name}</span>
                                  </CommonScrollAnimated>
                                </div>
                                <CommonScrollAnimated
                                  className="socials-list__arrow anim-uni-slide-down"
                                  as="div"
                                  animation="slideDownLine"
                                >
                                  <i>
                                    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
                                      <path d="M18,0v14.4h-3.6V7.2h-3.6V3.6H3.6V0H18z M7.2,10.8h3.6V7.2H7.2C7.2,7.2,7.2,10.8,7.2,10.8z M3.6,14.4h3.6v-3.6H3.6V14.4z M0,18h3.6v-3.6H0V18z" />
                                    </svg>
                                  </i>
                                </CommonScrollAnimated>
                                <CommonScrollAnimated
                                  className="socials-list__divider divider-bottom anim-uni-clip-in"
                                  as="div"
                                  animation="clipIn"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Controls */}
        <div className="mxd-block">
          <div className="container-fluid p-0">
            <div className="row g-0">
              <div className="col-12 col-xl-6 mxd-footer__item mxd-grid-item">
                <ul className="mxd-socials-line">
                  {socialLinks.map((s) => (
                    <li key={s.name}>
                      <a className="mxd-socials-line__link" href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-12 col-xl-6 mxd-footer__item mxd-grid-item">
                <div className="mxd-footer__controls-middle">
                  <CommonScrollAnimated className="anim-uni-slide-down" as="div" animation="slideDownLine">
                    <FooterBackToTop />
                  </CommonScrollAnimated>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Fullwidth wordmark */}
        <div className="mxd-block">
          <div className="mxd-footer__fw-mark mxd-grid-item">
            <div className="fw-mark__wrap">
              <div className="fw-mark__content">
                <CommonAnimatedText as="span" className="anim-uni-chars" animation="animChars">
                  {siteConfig.name}
                </CommonAnimatedText>
              </div>
            </div>
          </div>
        </div>
        {/* Data line */}
        <div className="mxd-block">
          <div className="mxd-footer__data">
            <div className="container-fluid p-0">
              <div className="row g-0">
                <div className="col-12 col-xl-6 mxd-footer__item mxd-grid-item">
                  <CommonScrollAnimated className="mxd-footer__data-item anim-uni-fade-in" as="div" animation="fadeIn">
                    <p className="footer-data">
                      <span>
                        Copyright {siteConfig.name} by {siteConfig.company}. All rights reserved
                      </span>
                    </p>
                  </CommonScrollAnimated>
                </div>
                <div className="col-12 col-xl-6 mxd-footer__item mxd-grid-item">
                  <CommonScrollAnimated
                    className="mxd-footer__data-item anim-uni-fade-in justify-end"
                    as="div"
                    animation="fadeIn"
                  >
                    <p className="footer-data">
                      <span>©{new Date().getFullYear()}</span>
                    </p>
                  </CommonScrollAnimated>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
