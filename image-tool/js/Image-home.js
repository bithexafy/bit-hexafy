/**
 * Load an image file into an HTMLImageElement
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Draw image onto canvas with optional dimensions
 */
function drawImageOnCanvas(img, width = img.width, height = img.height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Resize image to given width/height (maintain aspect ratio if only one dimension)
 */
export async function resizeImage(file, maxWidth, maxHeight) {
  const img = await loadImage(file);
  let { width, height } = img;
  
  if (maxWidth && maxHeight) {
    width = maxWidth;
    height = maxHeight;
  } else if (maxWidth) {
    height = Math.round((maxWidth / width) * height);
    width = maxWidth;
  } else if (maxHeight) {
    width = Math.round((maxHeight / height) * width);
    height = maxHeight;
  }
  
  const canvas = drawImageOnCanvas(img, width, height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), file.type);
  });
}

/**
 * Convert image to another format (image/jpeg, image/png, image/webp)
 */
export async function convertImage(file, format, quality = 0.92) {
  const img = await loadImage(file);
  const canvas = drawImageOnCanvas(img);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), format, quality);
  });
}

/**
 * Apply a simple grayscale filter
 */
export async function grayscaleImage(file) {
  const img = await loadImage(file);
  const canvas = drawImageOnCanvas(img);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i+1] + data[i+2]) / 3;
    data[i] = avg;     // R
    data[i+1] = avg;   // G
    data[i+2] = avg;   // B
  }
  
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), file.type);
  });
}

// Additional tools like brightness, contrast, rotate, etc. follow the same pattern.
// For brevity we only include a few; the rest can be implemented similarly.