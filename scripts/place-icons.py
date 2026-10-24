"""Flatten rendered PNGs to RGB (no alpha) and write them where the web app and iOS project expect them."""
import json, os
from PIL import Image

SRC = 'build-assets'
def rgb(name):
    return Image.open(f'{SRC}/{name}.png').convert('RGB')

# web / PWA
for n, dest in [('icon-192', 'public/icon-192.png'), ('icon-512', 'public/icon-512.png'),
                ('icon-512-maskable', 'public/icon-512-maskable.png'), ('apple-touch-icon', 'public/apple-touch-icon.png'),
                ('favicon', 'public/favicon.png')]:
    rgb(n).save(dest)

# iOS app icon set (iPhone sizes + marketing icon)
ICONSET = 'ios/App/App/Assets.xcassets/AppIcon.appiconset'
for f in os.listdir(ICONSET):
    if f.endswith('.png'):
        os.remove(os.path.join(ICONSET, f))
big = rgb('icon-1024')
images = []
for pt, scales in [(20, [2, 3]), (29, [2, 3]), (40, [2, 3]), (60, [2, 3])]:
    for s in scales:
        px = pt * s
        fn = f'AppIcon-{pt}@{s}x.png'
        big.resize((px, px), Image.LANCZOS).save(os.path.join(ICONSET, fn))
        images.append({'filename': fn, 'idiom': 'iphone', 'scale': f'{s}x', 'size': f'{pt}x{pt}'})
big.save(os.path.join(ICONSET, 'AppIcon-1024.png'))
images.append({'filename': 'AppIcon-1024.png', 'idiom': 'ios-marketing', 'scale': '1x', 'size': '1024x1024'})
json.dump({'images': images, 'info': {'author': 'xcode', 'version': 1}}, open(os.path.join(ICONSET, 'Contents.json'), 'w'), indent=2)

# launch image (same file for light/dark/any, as Capacitor's template expects)
SPLASH = 'ios/App/App/Assets.xcassets/Splash.imageset'
sp = rgb('splash-2732')
for fn in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
    sp.save(os.path.join(SPLASH, fn))
# verify: no alpha anywhere
for root, _, files in os.walk(ICONSET):
    for f in files:
        if f.endswith('.png'):
            assert Image.open(os.path.join(root, f)).mode == 'RGB', f
print('icons placed:', len(images), 'iOS icons; web icons updated')
