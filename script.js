// Global variables
let loadedFont = null;
let glyphs = {};
let fontIcons = [];
let filteredIcons = [];
let selectedIcon = null;
let generatedSVG = "";
let currentCategory = "all";

// Load font file
document
  .getElementById("fontFile")
  .addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById("fontStatus");
    statusDiv.style.display = "block";
    statusDiv.className = "font-status loading";
    statusDiv.textContent = "Loading font file...";

    try {
      const arrayBuffer = await file.arrayBuffer();
      loadedFont = opentype.parse(arrayBuffer);

      statusDiv.className = "font-status success";
      statusDiv.textContent = `✅ Font loaded: ${loadedFont.names.fontFamily.en} (${loadedFont.glyphs.length} glyphs)`;

      // Process the font
      processFontGlyphs();
      enableInterface();
    } catch (error) {
      statusDiv.className = "font-status error";
      statusDiv.textContent = `❌ Error loading font: ${error.message}`;
      console.error("Font loading error:", error);
    }
  });

function processFontGlyphs() {
  fontIcons = [];
  const glyphMap = {};

  // Process each glyph in the font
  for (let i = 0; i < loadedFont.glyphs.length; i++) {
    const glyph = loadedFont.glyphs.glyphs[i];

    if (glyph.unicode !== undefined) {
      const unicode = glyph.unicode;
      const hexCode = unicode.toString(16).toUpperCase().padStart(4, "0");
      const unicodeChar = String.fromCharCode(unicode);

      // Try to determine icon category and name
      let category = "other";
      let name = `glyph-${hexCode}`;

      // Basic categorization based on unicode ranges
      if (unicode >= 0xe000 && unicode <= 0xf8ff) {
        category = "private-use";
      } else if (unicode >= 0xf000 && unicode <= 0xf2ff) {
        category = "fontawesome";
      } else if (unicode >= 0xe200 && unicode <= 0xe2ff) {
        category = "weather";
      } else if (unicode >= 0xe700 && unicode <= 0xe7ff) {
        category = "dev";
      }

      // Look for name in glyph
      if (glyph.name && glyph.name !== ".notdef") {
        name = glyph.name.replace(/[_-]/g, " ");
      }

      const icon = {
        name: name,
        unicode: unicodeChar,
        hexCode: hexCode,
        glyphIndex: i,
        category: category,
        glyph: glyph,
      };

      fontIcons.push(icon);
      glyphMap[hexCode] = icon;
    }
  }

  // If we have the glyphs mapping from the user, merge it
  if (window.userGlyphs) {
    mergeWithUserGlyphs(glyphMap);
  }

  filteredIcons = [...fontIcons];
  generateFilters();
  renderIcons();
}

function mergeWithUserGlyphs(glyphMap) {
  // If user provided the glyphs object, use it to enhance our data
  for (const [iconName, hexCode] of Object.entries(window.userGlyphs)) {
    const upperHex = hexCode.toUpperCase();
    if (glyphMap[upperHex]) {
      glyphMap[upperHex].name = iconName.replace("nf-", "").replace(/-/g, " ");
      glyphMap[upperHex].originalName = iconName;

      // Better categorization
      const nameParts = iconName.split("-");
      if (nameParts.includes("cod")) glyphMap[upperHex].category = "vscode";
      else if (nameParts.includes("fa"))
        glyphMap[upperHex].category = "fontawesome";
      else if (nameParts.includes("dev")) glyphMap[upperHex].category = "dev";
      else if (nameParts.includes("file")) glyphMap[upperHex].category = "file";
      else if (nameParts.includes("weather"))
        glyphMap[upperHex].category = "weather";
      else if (nameParts.includes("oct"))
        glyphMap[upperHex].category = "octicons";
      else if (nameParts.includes("md") || nameParts.includes("mdi"))
        glyphMap[upperHex].category = "material";
      else if (nameParts.includes("linux"))
        glyphMap[upperHex].category = "linux";
      else if (nameParts.includes("pom") || nameParts.includes("powerline"))
        glyphMap[upperHex].category = "powerline";
      else if (nameParts.includes("seti")) glyphMap[upperHex].category = "seti";
      else if (nameParts.includes("custom"))
        glyphMap[upperHex].category = "custom";
    }
  }
}

function enableInterface() {
  document.getElementById("searchInput").disabled = false;
  document.getElementById("generateBtn").disabled = false;
  document.getElementById("copyBtn").disabled = false;
  document.getElementById("downloadBtn").disabled = false;
  document.getElementById("copyPathBtn").disabled = false;
}

function generateFilters() {
  const categories = [
    ...new Set(fontIcons.map((icon) => icon.category)),
  ].sort();
  const filterSection = document.getElementById("filterSection");

  const categoryButtons = categories
    .map((category) => {
      const displayName = category.charAt(0).toUpperCase() + category.slice(1);
      return `<div class="filter-btn" onclick="filterByCategory('${category}')">${displayName}</div>`;
    })
    .join("");

  filterSection.innerHTML = `
            <div class="filter-btn active" onclick="filterByCategory('all')">All</div>
            ${categoryButtons}
        `;
}

function renderIcons() {
  const grid = document.getElementById("iconsGrid");
  const stats = document.getElementById("stats");

  if (filteredIcons.length === 0) {
    grid.innerHTML = `
                <div class="no-results">
                    <i class="nf nf-fa-search"></i>
                    <p>No icons found</p>
                </div>
            `;
    stats.textContent = "No icons found";
    return;
  }

  stats.textContent = `Showing ${filteredIcons.length} of ${fontIcons.length} icons`;

  grid.innerHTML = filteredIcons
    .map(
      (icon, index) => `
            <div class="icon-item" onclick="selectIcon(${index})">
                <div class="icon-display" style="font-family: '${loadedFont.names.fontFamily.en}';">
                    ${icon.unicode}
                </div>
                <div class="icon-name">${icon.name}</div>
                <div class="icon-code">U+${icon.hexCode}</div>
            </div>
        `
    )
    .join("");
}

function searchIcons() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  filteredIcons = fontIcons.filter((icon) => {
    const matchesSearch =
      icon.name.toLowerCase().includes(query) ||
      icon.hexCode.toLowerCase().includes(query);
    const matchesCategory =
      currentCategory === "all" || icon.category === currentCategory;
    return matchesSearch && matchesCategory;
  });
  renderIcons();
}

function filterByCategory(category) {
  currentCategory = category;

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  event.currentTarget.classList.add("active");

  searchIcons();
}

function selectIcon(index) {
  selectedIcon = filteredIcons[index];

  document.querySelectorAll(".icon-item").forEach((item) => {
    item.classList.remove("selected");
  });
  event.currentTarget.classList.add("selected");

  document.getElementById("selectedSection").classList.add("show");

  document.getElementById("selectedIcon").innerHTML = selectedIcon.unicode;
  document.getElementById(
    "selectedIcon"
  ).style.fontFamily = `'${loadedFont.names.fontFamily.en}'`;
  document.getElementById("selectedName").textContent = selectedIcon.name;
  document.getElementById(
    "selectedUnicode"
  ).textContent = `U+${selectedIcon.hexCode}`;
  document.getElementById("selectedGlyphIndex").textContent =
    selectedIcon.glyphIndex;
  document.getElementById("selectedCategory").textContent =
    selectedIcon.category;
}

function generateSVGPath() {
  if (!selectedIcon || !loadedFont) return;

  const size = parseInt(document.getElementById("svgSize").value);
  const fillColor = document.getElementById("svgColor").value;
  const strokeColor = document.getElementById("svgStroke").value;
  const strokeWidth = parseFloat(
    document.getElementById("svgStrokeWidth").value
  );
  const optimize = document.getElementById("svgOptimize").value === "true";

  const glyph = selectedIcon.glyph;

  if (!glyph.path || !glyph.path.commands || glyph.path.commands.length === 0) {
    alert("This glyph has no path data or is empty");
    return;
  }

  try {
    // Get font metrics
    const unitsPerEm = loadedFont.unitsPerEm || 1000;
    const ascender = loadedFont.ascender || 800;
    const descender = loadedFont.descender || -200;

    // Calculate glyph bounding box
    const bbox = glyph.getBoundingBox();

    // Create a scale factor to fit the glyph in our desired size
    const glyphWidth = bbox.x2 - bbox.x1;
    const glyphHeight = bbox.y2 - bbox.y1;
    const maxDimension = Math.max(glyphWidth, glyphHeight);
    const scale =
      maxDimension > 0 ? (size * 0.8) / maxDimension : size / unitsPerEm;

    // Calculate centering offsets
    const centerX = size / 2;
    const centerY = size / 2;
    const glyphCenterX = (bbox.x1 + bbox.x2) / 2;
    const glyphCenterY = (bbox.y1 + bbox.y2) / 2;

    // Generate path with proper positioning and scaling
    let pathData = "";

    for (let i = 0; i < glyph.path.commands.length; i++) {
      const cmd = glyph.path.commands[i];

      switch (cmd.type) {
        case "M": // Move to
          const mx = centerX + (cmd.x - glyphCenterX) * scale;
          const my = centerY - (cmd.y - glyphCenterY) * scale; // Flip Y
          pathData += `M${mx.toFixed(2)},${my.toFixed(2)}`;
          break;

        case "L": // Line to
          const lx = centerX + (cmd.x - glyphCenterX) * scale;
          const ly = centerY - (cmd.y - glyphCenterY) * scale; // Flip Y
          pathData += `L${lx.toFixed(2)},${ly.toFixed(2)}`;
          break;

        case "C": // Cubic bezier curve
          const c1x = centerX + (cmd.x1 - glyphCenterX) * scale;
          const c1y = centerY - (cmd.y1 - glyphCenterY) * scale;
          const c2x = centerX + (cmd.x2 - glyphCenterX) * scale;
          const c2y = centerY - (cmd.y2 - glyphCenterY) * scale;
          const cx = centerX + (cmd.x - glyphCenterX) * scale;
          const cy = centerY - (cmd.y - glyphCenterY) * scale;
          pathData += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(
            2
          )},${c2y.toFixed(2)} ${cx.toFixed(2)},${cy.toFixed(2)}`;
          break;

        case "Q": // Quadratic bezier curve
          const q1x = centerX + (cmd.x1 - glyphCenterX) * scale;
          const q1y = centerY - (cmd.y1 - glyphCenterY) * scale;
          const qx = centerX + (cmd.x - glyphCenterX) * scale;
          const qy = centerY - (cmd.y - glyphCenterY) * scale;
          pathData += `Q${q1x.toFixed(2)},${q1y.toFixed(2)} ${qx.toFixed(
            2
          )},${qy.toFixed(2)}`;
          break;

        case "Z": // Close path
          pathData += "Z";
          break;
      }
    }

    // Build SVG
    const strokeAttr =
      strokeWidth > 0
        ? `stroke="${strokeColor}" stroke-width="${strokeWidth}"`
        : "";
    const fillAttr =
      fillColor !== "none" ? `fill="${fillColor}"` : 'fill="none"';

    generatedSVG = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <path d="${pathData}" ${fillAttr} ${strokeAttr}/>
</svg>`;

    // Show preview
    document.getElementById("svgPreview").style.display = "block";
    document.getElementById("svgVisualPreview").innerHTML = generatedSVG;
    document.getElementById("svgOutput").textContent = generatedSVG;
  } catch (error) {
    console.error("Error generating SVG:", error);
    alert(`Error generating SVG: ${error.message}`);
  }
}

function copySVG() {
  if (!generatedSVG) generateSVGPath();
  if (!generatedSVG) return;

  navigator.clipboard.writeText(generatedSVG).then(() => {
    showSuccessFeedback(event.currentTarget, "SVG Copied!");
  });
}

function copyPath() {
  if (!selectedIcon || !loadedFont) return;

  const glyph = selectedIcon.glyph;

  if (!glyph.path || !glyph.path.commands || glyph.path.commands.length === 0) {
    alert("This glyph has no path data");
    return;
  }

  try {
    const size = parseInt(document.getElementById("svgSize").value);

    // Get font metrics
    const bbox = glyph.getBoundingBox();
    const glyphWidth = bbox.x2 - bbox.x1;
    const glyphHeight = bbox.y2 - bbox.y1;
    const maxDimension = Math.max(glyphWidth, glyphHeight);
    const scale = maxDimension > 0 ? (size * 0.8) / maxDimension : size / 1000;

    // Calculate centering offsets
    const centerX = size / 2;
    const centerY = size / 2;
    const glyphCenterX = (bbox.x1 + bbox.x2) / 2;
    const glyphCenterY = (bbox.y1 + bbox.y2) / 2;

    // Generate path data
    let pathData = "";

    for (let i = 0; i < glyph.path.commands.length; i++) {
      const cmd = glyph.path.commands[i];

      switch (cmd.type) {
        case "M":
          const mx = centerX + (cmd.x - glyphCenterX) * scale;
          const my = centerY - (cmd.y - glyphCenterY) * scale;
          pathData += `M${mx.toFixed(2)},${my.toFixed(2)}`;
          break;
        case "L":
          const lx = centerX + (cmd.x - glyphCenterX) * scale;
          const ly = centerY - (cmd.y - glyphCenterY) * scale;
          pathData += `L${lx.toFixed(2)},${ly.toFixed(2)}`;
          break;
        case "C":
          const c1x = centerX + (cmd.x1 - glyphCenterX) * scale;
          const c1y = centerY - (cmd.y1 - glyphCenterY) * scale;
          const c2x = centerX + (cmd.x2 - glyphCenterX) * scale;
          const c2y = centerY - (cmd.y2 - glyphCenterY) * scale;
          const cx = centerX + (cmd.x - glyphCenterX) * scale;
          const cy = centerY - (cmd.y - glyphCenterY) * scale;
          pathData += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(
            2
          )},${c2y.toFixed(2)} ${cx.toFixed(2)},${cy.toFixed(2)}`;
          break;
        case "Q":
          const q1x = centerX + (cmd.x1 - glyphCenterX) * scale;
          const q1y = centerY - (cmd.y1 - glyphCenterY) * scale;
          const qx = centerX + (cmd.x - glyphCenterX) * scale;
          const qy = centerY - (cmd.y - glyphCenterY) * scale;
          pathData += `Q${q1x.toFixed(2)},${q1y.toFixed(2)} ${qx.toFixed(
            2
          )},${qy.toFixed(2)}`;
          break;
        case "Z":
          pathData += "Z";
          break;
      }
    }

    navigator.clipboard.writeText(pathData).then(() => {
      showSuccessFeedback(event.currentTarget, "Path Copied!");
    });
  } catch (error) {
    console.error("Error copying path:", error);
    alert(`Error copying path: ${error.message}`);
  }
}

function downloadSVG() {
  if (!generatedSVG) generateSVGPath();
  if (!generatedSVG) return;

  const blob = new Blob([generatedSVG], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${selectedIcon.name.replace(/\s+/g, "-")}-${
    selectedIcon.hexCode
  }.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showSuccessFeedback(button, message) {
  const originalText = button.innerHTML;
  button.innerHTML = `<i class="nf nf-fa-check"></i> ${message}`;
  button.style.background = "#48bb78";

  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.background = "";
  }, 2000);
}

// Event listeners
document.getElementById("searchInput").addEventListener("input", searchIcons);

// Allow users to add their glyphs mapping
window.addGlyphsMapping = function (glyphsObject) {
  window.userGlyphs = glyphsObject;
  if (loadedFont) {
    processFontGlyphs();
  }
};

console.log(
  "💡 Tip: If you have a glyphs mapping object, call window.addGlyphsMapping(glyphsObject) to enhance glyph names and categories"
);
