export interface UnsplashImage {
  base64: string;
  id: string;
  created_at: Date;
  updated_at: Date;
  promoted_at: Date;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: null;
  alt_description: string;
  urls: Urls;
  links: UnsplashLinks;
  // eslint-disable-next-line
  categories: any[];
  likes: number;
  liked_by_user: boolean;
  current_user_collections: UserCollections[];
  sponsorship: null;
  user: User;
  exif: Exif;
  location: Location;
  views: number;
  downloads: number;
}

interface Exif {
  make: null;
  model: null;
  exposure_time: null;
  aperture: null;
  focal_length: null;
  iso: null;
}

interface UnsplashLinks {
  self: string;
  html: string;
  download: string;
  download_location: string;
}

interface Location {
  title: null;
  name: null;
  city: null;
  country: null;
  position: Position;
}

interface Position {
  latitude: null;
  longitude: null;
}

interface Urls {
  raw: string;
  full: string;
  regular: string;
  small: string;
  thumb: string;
}

interface User {
  id: string;
  updated_at: Date;
  username: string;
  name: string;
  first_name: string;
  last_name: null;
  twitter_username: null;
  portfolio_url: string;
  bio: string;
  location: null;
  links: UserLinks;
  profile_image: ProfileImage;
  instagram_username: string;
  total_collections: number;
  total_likes: number;
  total_photos: number;
  accepted_tos: boolean;
}

interface UserLinks {
  self: string;
  html: string;
  photos: string;
  likes: string;
  portfolio: string;
  following: string;
  followers: string;
}

interface UserCollections {
  id: number;
  title: string;
  published_at: Date;
  last_collected_at: Date;
  updated_at: Date;
  cover_photo: null;
  user: null;
}

interface ProfileImage {
  small: string;
  medium: string;
  large: string;
}
