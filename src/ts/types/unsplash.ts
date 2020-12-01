import * as r from 'runtypes';

const Exif = r.Record({
  make: r.Union(r.String, r.Null),
  model: r.Union(r.String, r.Null),
  exposure_time: r.Union(r.String, r.Null),
  aperture: r.Union(r.String, r.Null),
  focal_length: r.Union(r.String, r.Null),
  iso: r.Union(r.Number, r.Null),
});

const UnsplashLinks = r.Record({
  self: r.String,
  html: r.String,
  download: r.String,
  download_location: r.String,
});

const ProfileImage = r.Record({
  small: r.Union(r.String, r.Null),
  medium: r.Union(r.String, r.Null),
  large: r.Union(r.String, r.Null),
});

const Urls = r.Record({
  raw: r.String,
  full: r.String,
  regular: r.String,
  small: r.String,
  thumb: r.String,
});

const User = r.Record({
  first_name: r.Union(r.String, r.Null),
  last_name: r.Union(r.String, r.Null),
  profile_image: ProfileImage,
  links: r.Record({
    html: r.String,
  }),
});

const Location = r.Record({
  title: r.Union(r.String, r.Null),
  name: r.Union(r.String, r.Null),
  city: r.Union(r.String, r.Null),
  country: r.Union(r.String, r.Null),
});

const UnsplashImage = r
  .Record({
    id: r.String,
    updated_at: r.String,
    created_at: r.String,
    width: r.Number,
    height: r.Number,
    likes: r.Number,
    links: UnsplashLinks,
    urls: Urls,
    user: User,
  })
  .And(
    r.Partial({
      location: Location,
      downloads: r.Number,
      exif: Exif,
      base64: r.String,
      views: r.Number,
      description: r.Union(r.String, r.Null),
      timestamp: r.Number,
    })
  );

const UnsplashSearch = r.Record({
  total: r.Number,
  total_pages: r.Number,
  results: r.Array(UnsplashImage),
});

type UnsplashImage = r.Static<typeof UnsplashImage>;

type UnsplashSearch = r.Static<typeof UnsplashSearch>;

export { UnsplashImage, UnsplashSearch };
