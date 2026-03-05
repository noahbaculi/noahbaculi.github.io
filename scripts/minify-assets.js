import { readFileSync, writeFileSync } from "fs";
import { glob } from "fs/promises";
import CleanCSS from "clean-css";
import { minify } from "terser";

const cleanCss = new CleanCSS();

// Minify CSS files
for await (const file of glob("_site/assets/css/*.css")) {
  const input = readFileSync(file, "utf-8");
  const output = cleanCss.minify(input);
  if (output.errors.length) {
    console.error(`CSS errors in ${file}:`, output.errors);
  } else {
    writeFileSync(file, output.styles);
    console.log(`Minified CSS: ${file}`);
  }
}

// Minify JS files (skip already minified)
for await (const file of glob("_site/assets/js/*.js")) {
  if (file.endsWith(".min.js")) continue;
  const input = readFileSync(file, "utf-8");
  const result = await minify(input);
  if (result.code) {
    writeFileSync(file, result.code);
    console.log(`Minified JS: ${file}`);
  }
}
