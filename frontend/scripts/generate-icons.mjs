import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SIZES = [192, 512];
const inputSvg = join(__dirname, '../public/favicon.svg');
const outputDir = join(__dirname, '../public/icons');

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  for (const size of SIZES) {
    const outputFile = join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputFile);
      
      console.log(`✓ Generated ${outputFile}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${outputFile}:`, error.message);
    }
  }
  
  console.log('Icon generation complete!');
}

generateIcons();
