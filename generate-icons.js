/**
 * Blue Links PWA Icon Generator
 * ==============================
 * Generates all required PWA icon sizes from a single SVG.
 *
 * HOW TO USE:
 *   1. npm install sharp
 *   2. node generate-icons.js
 *
 * This creates the /icons/ folder with all sizes defined in manifest.json
 */

const fs = require('fs');
const path = require('path');

// ─── Icon SVG Source ─────────────────────────────────────────────────────────
// This is your Blue Links shield icon in SVG format.
// The icon uses the official brand colors: #00104e (navy) and #b9c3ff (light blue).
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background circle -->
  <rect width="512" height="512" rx="128" fill="#00104e"/>

  <!-- Shield shape -->
  <path d="M256 80
    L368 128
    L368 256
    Q368 352 256 432
    Q144 352 144 256
    L144 128
    Z"
    fill="#002080"
    stroke="#b9c3ff"
    stroke-width="8"
  />

  <!-- Heart inside shield -->
  <path d="M256 320
    Q210 290 195 255
    Q178 214 205 193
    Q225 178 256 210
    Q287 178 307 193
    Q334 214 317 255
    Q302 290 256 320Z"
    fill="#b9c3ff"
  />

  <!-- BL monogram text -->
  <text x="256" y="220"
    font-family="Georgia, serif"
    font-size="72"
    font-weight="900"
    fill="white"
    text-anchor="middle"
    opacity="0.15"
  >BL</text>
</svg>`;

// ─── Sizes Required by manifest.json ────────────────────────────────────────
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// ─── Generate ────────────────────────────────────────────────────────────────
async function generateIcons() {
  const iconsDir = path.join(__dirname, 'icons');

  // Create /icons directory if it doesn't exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log('✅ Created /icons directory');
  }

  // Save the master SVG source
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), ICON_SVG, 'utf-8');
  console.log('✅ Saved icon.svg source');

  try {
    // Try to use Sharp for PNG generation (requires: npm install sharp)
    const sharp = require('sharp');
    const svgBuffer = Buffer.from(ICON_SVG);

    for (const size of ICON_SIZES) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }

    console.log('\n🎉 All icons generated successfully!');
    console.log(`📁 Icons saved to: ${iconsDir}`);

  } catch (err) {
    // If sharp is not installed, give clear instructions
    console.log('\n⚠️  Sharp not installed. To generate PNGs, run:');
    console.log('   npm install sharp');
    console.log('   node generate-icons.js\n');
    console.log('📌 Alternative: Use https://realfavicongenerator.net/');
    console.log('   Upload the icon.svg file and download all sizes.\n');

    // Create placeholder README in icons folder
    const readme = `# Blue Links PWA Icons

## How to Generate Icons

### Option A — Node.js (Recommended)
\`\`\`bash
npm install sharp
node generate-icons.js
\`\`\`

### Option B — Online Tool
1. Go to https://realfavicongenerator.net/
2. Upload the \`icon.svg\` file from this folder
3. Download and extract all icon PNGs here

### Option C — Manual (Figma / Photoshop)
Use the \`icon.svg\` as your source. Export at these sizes:
${ICON_SIZES.map(s => `- ${s}x${s}px → icon-${s}x${s}.png`).join('\n')}

## Icon Design
- Background: #00104e (Blue Links Navy)
- Foreground: #b9c3ff (Light Blue)
- Shape: Rounded square (safe zone for maskable icons)
`;
    fs.writeFileSync(path.join(iconsDir, 'README.md'), readme);
    console.log('📄 Created icons/README.md with instructions');
  }
}

generateIcons();