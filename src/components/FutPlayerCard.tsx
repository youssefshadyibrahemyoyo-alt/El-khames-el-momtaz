import React from 'react';
import { Info } from 'lucide-react';

type Props = {
  slotNumber: number;
  kitNumber?: number | null;
  name: string;
  photoUrl?: string | null;
  statLabel: string;
  secondaryNote?: string | null;
  isCaptain?: boolean;
  isTripleCaptain?: boolean;
  isViceCaptain?: boolean;
  isSelected?: boolean;
  isJustSwapped?: boolean;
  isSubbedOut?: boolean;
  profileLabel?: string;
  onCardClick?: () => void;
  onOpenProfile?: () => void;
  children?: React.ReactNode;
};

export default function FutPlayerCard({
  slotNumber,
  kitNumber,
  name,
  photoUrl,
  statLabel,
  secondaryNote,
  isCaptain = false,
  isTripleCaptain = false,
  isViceCaptain = false,
  isSelected = false,
  isJustSwapped = false,
  isSubbedOut = false,
  profileLabel = 'Profile',
  onCardClick,
  onOpenProfile,
  children,
}: Props) {
  const tierClass = isCaptain
    ? 'fut-gold-captain'
    : isViceCaptain
      ? 'fut-silver-vc'
      : 'fut-emerald-pro';

  const cardClasses = [
    'egypt-player',
    'fut-card',
    tierClass,
    isSelected ? 'selected' : '',
    isJustSwapped ? 'swap-flash' : '',
    isSubbedOut ? 'subbed-out-card' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const InnerTag = onCardClick ? 'button' : 'div';

  return (
    <div className={cardClasses}>
      <span className="fut-shimmer" aria-hidden="true" />

      <div className="fut-top-ribbon">
        <span className="fut-slot-tag">
          {kitNumber != null ? `👕 #${kitNumber}` : `#${slotNumber}`}
        </span>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {isCaptain && (
            <span className="fut-armband captain-armband">
              {isTripleCaptain ? '3×C' : 'C'}
            </span>
          )}
          {!isCaptain && isViceCaptain && <span className="fut-armband vc-armband">VC</span>}
          {onOpenProfile && (
            <button
              type="button"
              className="fut-info-btn"
              title={profileLabel}
              onClick={e => {
                e.stopPropagation();
                onOpenProfile();
              }}
            >
              <Info size={11} />
            </button>
          )}
        </span>
      </div>

      <InnerTag
        {...(onCardClick ? { type: 'button' as const, onClick: onCardClick } : {})}
        className="fut-card-body"
      >
        <div className="fut-avatar-ring">
          {photoUrl ? (
            <img src={photoUrl} alt={name} />
          ) : (
            <span className="fut-initial">{name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <strong className="fut-player-name">{name}</strong>
        <span className="fut-stat-pill">{statLabel}</span>
        {secondaryNote && <small className="sub-note">{secondaryNote}</small>}
      </InnerTag>

      {children && <div className="fut-card-actions">{children}</div>}
    </div>
  );
}
