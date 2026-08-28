<p align="left">
   <img src="https://ik.imagekit.io/turnupdev/stellar-banner_NTy94-aRV.png" width="400" alt="Stellar Photos">
</p>

# Beautiful hi-res photos in your browser tabs!

Experience a beautiful high-resolution photo every time you open a new browser tab. Enjoy stunning photography from Unsplash, breathtaking satellite views from Google Earth View, or your own local photo folders.

![Screenshot of Stellar Photos on Google Chrome](https://ik.imagekit.io/turnupdev/stellar-chrome_hLlZOg4St.png)

## Install Stellar Photos

| Chrome                                                                                                                                                                                                                                   | Firefox                                                                                                                                                                                                           | Edge                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a href="https://chromewebstore.google.com/detail/stellar-photos/dgjeipdebjigeaanhogpdjdjigogpjmo"><img width="100" src="https://github.com/alrra/browser-logos/raw/master/src/chrome/chrome_256x256.png" alt="Chrome browser logo"></a> | <a href="https://addons.mozilla.org/en-US/firefox/addon/stellar-photos/"><img width="100" src="https://github.com/alrra/browser-logos/raw/master/src/firefox/firefox_256x256.png" alt="Firefox browser logo"></a> | <a href="https://microsoftedge.microsoft.com/addons/detail/stellar-photos/oifbedjcmofkjgmjakgbppkocdfpjpjg"><img width="100" src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/69.0.4/edge/edge_256x256.png" alt="Microsoft Edge browser logo"></a> |

## Main features

- **Multiple Photo Sources**: Choose from curated collections on Unsplash, satellite imagery from Google Earth View, or select photos from your local folders.
- **Custom Rotation Schedules**: Rotate photos on every new tab, every 15 minutes, hourly, daily, or pause rotation whenever you want.
- **Pin Photos**: Keep your favorite photo pinned across tabs with a single click or keyboard shortcut (`P`).
- **History Navigation**: Browse through your 10 most recent photos using on-screen controls, arrow keys, or mouse wheel scrolling.
- **Photo & Camera Details**: View photographer profiles, EXIF camera specifications (camera model, shutter speed, aperture, focal length, ISO), or satellite telemetry (coordinates, elevation, Google Maps links).
- **Display Modes & Motion**: Customise display scaling (Cover or Contain with blurred backdrop) and toggle subtle zoom motion.
- **Instant Local Caching**: Opens new tabs instantly from an offline cache with zero lag.

## Screenshots

![Screenshot of Stellar Photos on Google Chrome showing UI elements](https://ik.imagekit.io/turnupdev/stellar-chrome-2_a7muqGgMH.png)

![Screenshot of Stellar Photos on Google Chrome showing history pane](https://ik.imagekit.io/turnupdev/stellar-chrome-3_xXUBuOzp4.png)

![Screenshot of Stellar Photos on Vivaldi showing photo information](https://ik.imagekit.io/turnupdev/stellar-vivaldi_N_mCOv_Fef.png)

![Screenshot of Stellar Photos on Microsoft Edge showing UI elements](https://ik.imagekit.io/turnupdev/stellar-edge_qGV6FSutX.png)

## Supported Browsers

Compatible with modern desktop releases of Google Chrome, Mozilla Firefox, Microsoft Edge, Brave, Vivaldi, Opera, and other Chromium-based browsers.

## Development

Stellar Photos is built with TypeScript, [Lit](https://lit.dev/), and [WXT](https://wxt.dev/).

### Setup & Commands

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Development mode**:

   ```bash
   npm run chrome:dev   # or npm run firefox:dev
   ```

3. **Production build**:

   ```bash
   # Set UNSPLASH_ACCESS_KEY in your environment or .env file
   npm run build        # builds dist/chrome and dist/firefox
   ```

4. **Code quality & tests**:
   ```bash
   npm run check        # run Biome linter and formatter checks
   npm run typecheck    # run TypeScript compiler check
   npm test             # run Vitest test suite
   ```

## Contribute

Bug reports, feature requests, and pull requests are welcome! See [CONTRIBUTING.md](https://github.com/ayoisaiah/stellar-photos/blob/master/CONTRIBUTING.md) for guidelines.

## Credits & License

- Powered by [Unsplash](https://unsplash.com/developers) and [Google Earth View](https://earthview.withgoogle.com/).
- Created by [Ayooluwa Isaiah](https://github.com/ayoisaiah) and released under the [MIT License](http://opensource.org/licenses/MIT).
