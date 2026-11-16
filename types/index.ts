export interface Product {
  id: string;
  title: string;
  influencerName: string;
  influencerUrl: string;
  buyUrl: string;
  thumbnailUrl: string;
  categoryId: string;
  originalPrice: number;
  discountPrice: number;
  discountRate: number;
  startDate: string;
  endDate: string;
  status: "PENDING" | "OPEN" | "CLOSED";
  likeCount: number;
}

export interface Category {
  id: string;
  name: string;
}
