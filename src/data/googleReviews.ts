/**
 * Real Google Maps reviews — Sara Royal Boutique, Kharar
 * https://maps.app.goo.gl/tcAPThvx9ABb6VbC9
 */

export const SARA_ROYAL_GOOGLE_MAPS_URL =
  "https://maps.app.goo.gl/tcAPThvx9ABb6VbC9";

export type GoogleReviewSeed = {
  id: string;
  customerName: string;
  reviewText: string;
  rating: number;
  image: string;
  sortOrder: number;
  isActive: boolean;
};

/** Avatar matching Google-style initial badges (add googleusercontent.com URL in image when available). */
export const getReviewAvatarUrl = (name: string, bgHex = "C9A84C") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=${bgHex}&color=0a0f18&bold=true&format=png`;

export const GOOGLE_REVIEWS: GoogleReviewSeed[] = [
  {
    id: "google-vandana-kakran",
    customerName: "vandana kakran",
    reviewText:
      "The stitching is excellent and the dresses fit beautifully. The owner is extremely friendly and cooperative, making the entire experience pleasant. The stitching charges are also quite reasonable. I would highly recommend this boutique.",
    rating: 5,
    image: getReviewAvatarUrl("vandana kakran", "7D6608"),
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "google-nahe-singh",
    customerName: "Nahe Singh",
    reviewText:
      "Very nice stitching work and perfect fitting. My suit was ready on time and finishing quality is very good. Staff is cooperative and prices are reasonable. Best ladies tailor and boutique in Kharar.",
    rating: 5,
    image: getReviewAvatarUrl("Nahe Singh", "4285F4"),
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "google-amandeep-kaur",
    customerName: "Amandeep kaur",
    reviewText:
      "I had a very good experience at Sara Royal Boutique. Stitching quality is excellent and fitting is perfect. The owner is very polite and cooperative.",
    rating: 5,
    image: getReviewAvatarUrl("Amandeep kaur", "E91E8C"),
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "google-nancy-sharma",
    customerName: "nancy sharma",
    reviewText:
      "Perfect suit/dress fitting. Am very satisfied with sara royal boutique. Prices are also very reasonable.",
    rating: 5,
    image: getReviewAvatarUrl("nancy sharma", "9C27B0"),
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "google-sumit-sharma",
    customerName: "Sumit sharma",
    reviewText:
      "Sara Royal Boutique has really lovely collections. Quality is good and prices are reasonable.",
    rating: 5,
    image: getReviewAvatarUrl("Sumit sharma", "1A237E"),
    sortOrder: 5,
    isActive: true,
  },
  {
    id: "google-shivani-mehra",
    customerName: "shivani mehra",
    reviewText:
      "Absolutely loved this boutique! Beautiful collection, great quality, and amazing service.",
    rating: 5,
    image: getReviewAvatarUrl("shivani mehra", "B8956A"),
    sortOrder: 6,
    isActive: true,
  },
  {
    id: "google-prabhjot-kaur",
    customerName: "Prabhjot kaur Dhiman",
    reviewText:
      "I had a wonderful experience at Sara Royal Boutique. I was really impressed with the service and quality at Sara Royal Boutique.",
    rating: 5,
    image: getReviewAvatarUrl("Prabhjot kaur", "43A047"),
    sortOrder: 7,
    isActive: true,
  },
  {
    id: "google-preet-vilkhu",
    customerName: "Preet vilkhu",
    reviewText:
      "Awesome boutique, good and creative designs, punctual & reasonable price to all designs",
    rating: 5,
    image: getReviewAvatarUrl("Preet vilkhu", "8E24AA"),
    sortOrder: 8,
    isActive: true,
  },
  {
    id: "google-kanchan-thakur",
    customerName: "Kanchan Thakur",
    reviewText: "Very Good Experience. Thank you so Much Sara Royal Boutique.",
    rating: 5,
    image: getReviewAvatarUrl("Kanchan Thakur", "C62828"),
    sortOrder: 9,
    isActive: true,
  },
  {
    id: "google-manisha-rampal",
    customerName: "Manisha Rampal",
    reviewText: "My experience at sara Royal Boutique was fantastic, I loved everything about it.",
    rating: 5,
    image: getReviewAvatarUrl("Manisha Rampal", "00897B"),
    sortOrder: 10,
    isActive: true,
  },
  {
    id: "google-kiranjeet-kaur",
    customerName: "Kiranjeet Kaur",
    reviewText: "Very good experience with sara royal boutique.",
    rating: 5,
    image: getReviewAvatarUrl("Kiranjeet Kaur", "616161"),
    sortOrder: 11,
    isActive: true,
  },
  {
    id: "google-priyankshi-matharu",
    customerName: "Priyankshi Matharu",
    reviewText: "Must go...",
    rating: 5,
    image: getReviewAvatarUrl("Priyankshi Matharu", "D4AF37"),
    sortOrder: 12,
    isActive: true,
  },
  {
    id: "google-navdeep-kaur",
    customerName: "Navdeep Kaur",
    reviewText: "Very satisfied with the stitching and overall service",
    rating: 5,
    image: getReviewAvatarUrl("Navdeep Kaur", "43A047"),
    sortOrder: 13,
    isActive: true,
  },
  {
    id: "google-neha-rana",
    customerName: "Neha Rana",
    reviewText: "Very good experience. Neat work and nice finishing.",
    rating: 5,
    image: getReviewAvatarUrl("Neha Rana", "E53935"),
    sortOrder: 14,
    isActive: true,
  },
  {
    id: "google-satinderdeep-kaur",
    customerName: "Satinderdeep Kaur",
    reviewText: "Great stitching and perfect fitting. Really happy with the work.",
    rating: 5,
    image: getReviewAvatarUrl("Satinderdeep Kaur", "9C27B0"),
    sortOrder: 15,
    isActive: true,
  },
];
