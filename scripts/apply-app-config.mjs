// Pushes app.config.json (appId, appName) into the generated iOS project. Run after editing app.config.json:
//   npm run apply-app-config && npm run cap:sync
import { readFileSync, writeFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync('app.config.json', 'utf8'));
const pbx = 'ios/App/App.xcodeproj/project.pbxproj';
writeFileSync(pbx, readFileSync(pbx, 'utf8').replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${cfg.appId};`));
const plist = 'ios/App/App/Info.plist';
writeFileSync(plist, readFileSync(plist, 'utf8').replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${cfg.appName}$2`));
console.log(`iOS project set to ${cfg.appId} / "${cfg.appName}". Also update ASC app record + fastlane Appfile if you changed the id.`);
