import type { HomepageFounderProfile } from "@/types/homepage";
import { MarketingBackgroundMedia } from "../MarketingBackgroundMedia";

type Props = {
  founders: HomepageFounderProfile[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Section id; `/about` uses `about-team` so homepage `#founders` still targets `/`. */
  id?: string;
  /**
   * Homepage mentors stay as portrait cards.
   * About **Our Team** uses a full-bleed band so a group photo can span the viewport.
   */
  layout?: "mentors" | "team";
};

export function MentorCard({ founder }: { founder: HomepageFounderProfile }) {
  const photoUrl = founder.photoUrl?.trim() || "";
  const roleBadge = founder.roleBadge?.trim() || "";
  const title = founder.title?.trim() || "";
  const companyLine =
    title && title.toLowerCase() !== roleBadge.toLowerCase() ? title : "";

  return (
    <article className="sa-mentor-card sa-reveal-item">
      <div className="sa-mentor-card__photo">
        {photoUrl ? (
          <MarketingBackgroundMedia src={photoUrl} />
        ) : (
          <span className="sa-mentor-card__initial" aria-hidden>
            {founder.name.charAt(0)}
          </span>
        )}
      </div>
      {roleBadge ? <p className="sa-mentor-card__badge">{roleBadge}</p> : null}
      <h3 className="sa-item-title sa-mentor-card__name">{founder.name}</h3>
      {companyLine ? <p className="sa-mentor-card__role">{companyLine}</p> : null}
    </article>
  );
}

function TeamPhotoBand({ founders }: { founders: HomepageFounderProfile[] }) {
  const withPhotos = founders.filter((f) => f.photoUrl?.trim());
  if (withPhotos.length === 0) return null;

  const single = founders.length === 1 && withPhotos.length === 1;
  return (
    <div
      className={
        single
          ? "sa-mentors__team-bleed sa-mentors__team-bleed--single sa-reveal-item"
          : "sa-mentors__team-bleed sa-mentors__team-bleed--grid sa-reveal-item"
      }
    >
      {withPhotos.map((founder) => {
        const src = founder.photoUrl!.trim();
        const name = founder.name?.trim() || "";
        const role = founder.roleBadge?.trim() || "";
        return (
          <figure key={`${founder.name}-${src}`} className="sa-mentors__team-figure">
            <div className="sa-mentors__team-media">
              <MarketingBackgroundMedia src={src} />
            </div>
            {name || role ? (
              <figcaption className="sa-mentors__team-caption">
                {name ? <strong className="sa-mentors__team-name">{name}</strong> : null}
                {role ? <span className="sa-mentors__team-role">{role}</span> : null}
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}

export function MentorsSection({
  founders,
  eyebrow = "Our Mentors",
  title = "Meet Our Expert Mentors",
  subtitle = "Learn from the best in the industry—our mentors bring years of experience, knowledge, and passion to guide you on your learning journey.",
  id = "founders",
  layout = "mentors",
}: Props) {
  if (founders.length === 0) return null;

  const isTeam = layout === "team";
  const teamHasPhotos = isTeam && founders.some((f) => f.photoUrl?.trim());

  return (
    <section
      className={isTeam ? "sa-mentors sa-mentors--team sa-reveal" : "sa-mentors sa-reveal"}
      id={id}
    >
      <div className="sa-mentors__header sa-reveal-item">
        <span className="sa-mentors__badge">{eyebrow}</span>
        <h2 className="sa-section-title sa-mentors__title">{title}</h2>
        {subtitle ? <p className="sa-mentors__subtitle">{subtitle}</p> : null}
      </div>
      {teamHasPhotos ? (
        <TeamPhotoBand founders={founders} />
      ) : (
        <div className="sa-mentors__track-wrap">
          <div className="sa-mentors__track sa-mentors__track--center">
            {founders.map((founder) => (
              <MentorCard key={founder.name} founder={founder} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
