// Trust — identitet aplikacije (nivo 1). NIJE brend korisnice.
// Znak "T veza": dva luka koja se spajaju u čvor = poverenje/oslonac.
// Pojavljuje se na prijavi, splash-u, admin konzoli — ne u radnom prostoru
// korisnice (tamo ide NJEN brend: logo + boja).

type Props = {
  size?: number; // dimenzija znaka (px)
  className?: string;
  /** Boja znaka. Default plum (Trust brend). Belo na tamnoj/plum podlozi. */
  color?: string;
  /** Boja tačke u čvoru (kontrast). Default belo. */
  dot?: string;
};

// Samo znak (bez teksta) — za favicon, app ikonu, kompaktna mesta.
export function TrustMark({ size = 40, className, color = "#ffffff", dot = "#7a3785" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      role="img"
      aria-label="Trust"
    >
      <path d="M32 34 C40 30 52 30 60 36" stroke={color} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M60 36 C68 30 80 30 88 34" stroke={color} strokeWidth="13" strokeLinecap="round" fill="none" opacity="0.6" />
      <rect x="53.5" y="40" width="13" height="46" rx="6.5" fill={color} />
      <circle cx="60" cy="40" r="7.5" fill={color} />
      <circle cx="60" cy="40" r="3" fill={dot} />
    </svg>
  );
}

// Pun lockup: znak u obojenom kvadratu + ime + (opciono) slogan.
export function TrustLogo({
  markSize = 56,
  withTagline = true,
  plum = "#7a3785",
  stacked = true,
}: {
  markSize?: number;
  withTagline?: boolean;
  plum?: string;
  stacked?: boolean;
}) {
  return (
    <div
      className={
        stacked
          ? "flex flex-col items-center gap-3.5"
          : "flex items-center gap-3"
      }
    >
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{ width: markSize, height: markSize, background: plum }}
      >
        <TrustMark size={markSize * 0.62} color="#ffffff" dot={plum} />
      </div>
      <div className={stacked ? "text-center" : ""}>
        <div
          className="font-extrabold tracking-tight leading-none"
          style={{ fontFamily: "var(--font-brand), var(--font-sans)", fontSize: stacked ? 26 : 20 }}
        >
          Trust
        </div>
        {withTagline && (
          <div className="text-muted-foreground mt-0.5" style={{ fontSize: 13 }}>
            Oslonac tvog posla.
          </div>
        )}
      </div>
    </div>
  );
}
