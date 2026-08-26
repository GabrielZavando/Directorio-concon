/**
 * Post-MVP placeholder — Google business rating data.
 */
export interface ValoracionGoogle {
  rating: number;
  reviewsCount: number;
  mapsLink: string;
}

export function isValidValoracionGoogle(
  value: unknown,
): value is ValoracionGoogle {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const isRatingValid =
    typeof v.rating === "number" &&
    Number.isFinite(v.rating) &&
    v.rating >= 0 &&
    v.rating <= 5;
  const isReviewsValid =
    typeof v.reviewsCount === "number" && v.reviewsCount >= 0;
  const isMapsLinkValid =
    typeof v.mapsLink === "string" && v.mapsLink.length > 0;
  return isRatingValid && isReviewsValid && isMapsLinkValid;
}
