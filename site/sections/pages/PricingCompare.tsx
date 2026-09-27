import Link from "next/link";
import BlurSection from "@site/components/animations/BlurSection";
import SectionTitle from "@site/sections/SectionTitle";
import { featureGroups, plans } from "@site/content/pricing";

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <svg className="site-compare__yes" viewBox="0 0 18 18" role="img" aria-label="Included">
        <path d="M18,6.8h-4.5v4.5h-4.5v4.5h-4.5v-4.5h4.5v-4.5h4.5V2.3h4.5v4.5ZM0,6.7v4.5h4.5v-4.5H0Z" />
      </svg>
    );
  }
  if (value === false) return <span className="site-compare__no" aria-label="Not included">—</span>;
  return <span className="site-compare__text">{value}</span>;
}

/** Every feature, plan by plan. The cards' "View all features" link scrolls here. */
export default function PricingCompare() {
  return (
    <BlurSection id="compare" className="mxd-section padding-top-number padding-bottom-default">
      <div className="mxd-container grid-l-container">
        <SectionTitle
          number="P/02"
          title={
            <>
              Compare
              <br />
              all features
            </>
          }
        />
        <div className="mxd-block">
          <div className="mxd-grid-item site-compare">
            <table>
              <thead>
                <tr>
                  <th scope="col" className="site-compare__feature">
                    Features
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} scope="col" className={p.featured ? "is-featured" : undefined}>
                      <span className="site-compare__plan">{p.name}</span>
                      <span className="site-compare__price">
                        Rs {p.price}
                        <small>{p.period}</small>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              {featureGroups.map((group) => (
                <tbody key={group.title}>
                  <tr className="site-compare__group">
                    <th colSpan={plans.length + 1} scope="colgroup">
                      {group.title}
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row" className="site-compare__feature">
                        {row.name}
                      </th>
                      {plans.map((p) => (
                        <td key={p.id} className={p.featured ? "is-featured" : undefined}>
                          <Cell value={row.values[p.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
              <tfoot>
                <tr>
                  <th />
                  {plans.map((p) => (
                    <td key={p.id} className={p.featured ? "is-featured" : undefined}>
                      <Link className="btn btn-line btn-line-small btn-line-default" href={`/contact?plan=${p.id}`}>
                        <span className="btn-caption">{p.buttonText}</span>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
