# Extension Icons

This directory needs icon files for the Chrome extension.

## Required Files

- `icon16.png` - 16x16px - Toolbar icon
- `icon48.png` - 48x48px - Extension management page
- `icon128.png` - 128x128px - Chrome Web Store

## Generating Icons

### Option 1: Use the SVG generator

```bash
node scripts/generate-icons.js
```

This creates SVG files. You'll need to convert them to PNG:

```bash
# Using ImageMagick (if installed)
convert icon16.svg icon16.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png
```

### Option 2: Use an online tool

1. Go to https://www.favicon-generator.org/ or similar
2. Upload your logo design
3. Download the generated icons
4. Rename them to match the required filenames above

### Option 3: Create manually

Use any image editing software (Photoshop, GIMP, Figma, etc.) to create PNG icons with:
- Transparent or solid background
- Brand colors: Blue (#60a5fa) to Purple (#a78bfa) gradient
- Letter "L" or your preferred logo
- Export as PNG at the required sizes

## Temporary Workaround

For development, you can create simple colored squares:

```bash
# Using ImageMagick
convert -size 16x16 xc:#3b82f6 icon16.png
convert -size 48x48 xc:#3b82f6 icon48.png
convert -size 128x128 xc:#3b82f6 icon128.png
```

Or download any 128x128 PNG and resize it to create all three sizes.
