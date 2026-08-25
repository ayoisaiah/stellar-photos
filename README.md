<p align="left">
   <img src="https://ik.imagekit.io/turnupdev/stellar-banner_NTy94-aRV.png" width="400" alt="Stellar Photos">
</p>

# Beautiful hi-res photos in your browser tabs!

Experience a beautiful photo from [Unsplash](https://unsplash.com) every time
you open a new browser tab. Each image is specially curated and guaranteed to be
stunning each time.

![Screenshot of Stellar Photos on Google Chrome](https://ik.imagekit.io/turnupdev/stellar-chrome_hLlZOg4St.png)

## Install Stellar Photos

Chrome | Firefox | Edge
-------|---------|---------
<a href="https://chrome.google.com/webstore/detail/stellar-photos/dgjeipdebjigeaanhogpdjdjigogpjmo?hl=en"><img width="100" src="https://github.com/alrra/browser-logos/raw/master/src/chrome/chrome_256x256.png" alt="Chrome browser logo"></a> | <a href="https://addons.mozilla.org/en-US/firefox/addon/stellar-photos/"><img width="100" src="https://github.com/alrra/browser-logos/raw/master/src/firefox/firefox_256x256.png" alt="Firefox browser logo"></a> | <a href="https://microsoftedge.microsoft.com/addons/detail/stellar-photos/oifbedjcmofkjgmjakgbppkocdfpjpjg"><img width="100" src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/69.0.4/edge/edge_256x256.png" alt="Microsoft Edge browser logo"></a>

## Main features

- Enjoy a new, carefully curated hi-res photo every time you open a new tab - [totally free](https://unsplash.com/license) for personal or commercial use with no attribution required.
- Open new tabs instantly from a local image cache, including while offline.
- Keep the 10 most recently downloaded photos ready for a future history interface.
- Recover cleanly when Unsplash or the network is temporarily unavailable.

## Screenshots

![Screenshot of Stellar Photos on Google Chrome showing UI elements](https://ik.imagekit.io/turnupdev/stellar-chrome-2_a7muqGgMH.png)

![Screenshot of Stellar Photos on Google Chrome showing history pane](https://ik.imagekit.io/turnupdev/stellar-chrome-3_xXUBuOzp4.png)

![Screenshot of Stellar Photos on Vivaldi showing photo information](https://ik.imagekit.io/turnupdev/stellar-vivaldi_N_mCOv_Fef.png)

![Screenshot of Stellar Photos on Microsoft Edge showing UI elements](https://ik.imagekit.io/turnupdev/stellar-edge_qGV6FSutX.png)

## Supported Browsers

The current and previous stable desktop releases of Chrome/Chromium and Firefox.

## Development

The active extension is TypeScript and uses WXT with npm. Set
`UNSPLASH_ACCESS_KEY` in your environment, then run `npm run chrome:prod` or
`npm run firefox:prod`.
Browser-specific unpacked extensions are written to `dist/chrome` and
`dist/firefox`. Run `npm run check`, `npm run typecheck`, and `npm test` before
submitting changes. Use `npm run fmt` to apply Biome formatting.

The production key is deliberately embedded in the packaged extension. A future
settings interface may provide a per-user override, which will be kept in local
extension storage. The legacy `old/` directory is not part of the build.

## Contribute

Bug reports, feature requests or pull requests are much appreciated! See [CONTRIBUTING.md](https://github.com/ayoisaiah/stellar-photos/blob/master/CONTRIBUTING.md) for more details.

## Credits and Licence

- Powered by the [Unsplash API](https://unsplash.com/developers).
- Created by Ayooluwa Isaiah and released under the terms of the [MIT Licence](http://opensource.org/licenses/MIT).
