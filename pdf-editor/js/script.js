// script.js - Full featured PDF editor (frontend only)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// ---------- GLOBAL STATE ----------
let currentPdfBytes = null;          // Uint8Array
let currentPdfDoc = null;            // pdf-lib PDFDocument
let currentFileName = "document.pdf";
let totalPages = 0;
let currentPage = 1;
let pdfJsDoc = null;                 // PDF.js document for preview
let isPlacementMode = false;
let placementCallback = null;
let signatureImageBytes = null;
let tempTextOverlay = { text: "", fontSize: 24 };

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const dashboard = document.getElementById('dashboard');
const canvas = document.getElementById('pdfCanvas');
const prevBtn = document.getElementById('prevPageBtn');
const nextBtn = document.getElementById('nextPageBtn');
const pageNumSpan = document.getElementById('pageNumDisplay');
const totalPagesSpan = document.getElementById('totalPagesDisplay');
const fileInfoDiv = document.getElementById('fileInfo');
const toolSettingsDiv = document.getElementById('toolSettingsContent');
const toolTitleSpan = document.getElementById('toolTitle');
const resetBtn = document.getElementById('resetAppBtn');
const downloadBtn = document.getElementById('downloadFinalBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Helper: Show toast
function showToast(message, type = "success") {
  const container = document.getElementById('toastContainer') || (()=>{let d=document.createElement('div'); d.id='toastContainer'; document.body.appendChild(d); return d;})();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Loading spinner
function setLoading(show) {
  loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Refresh preview from currentPdfBytes
async function refreshPreview() {
  if (!currentPdfBytes) return;
  setLoading(true);
  try {
    const blob = new Blob([currentPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    pdfJsDoc = await pdfjsLib.getDocument(url).promise;
    totalPages = pdfJsDoc.numPages;
    totalPagesSpan.innerText = totalPages;
    fileInfoDiv.innerText = `📄 ${currentFileName} | ${(currentPdfBytes.length/1024).toFixed(1)} KB | ${totalPages} pages`;
    await renderPage(currentPage);
    URL.revokeObjectURL(url);
  } catch(e) { showToast("Preview error: "+e.message, "error"); }
  setLoading(false);
}

async function renderPage(pageNum) {
  if (!pdfJsDoc) return;
  const page = await pdfJsDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  pageNumSpan.innerText = pageNum;
  prevBtn.disabled = pageNum <= 1;
  nextBtn.disabled = pageNum >= totalPages;
}

// Update global doc after modification
async function updateDocFromBytes(newBytes, newName = null) {
  currentPdfBytes = newBytes;
  currentPdfDoc = await PDFLib.PDFDocument.load(newBytes);
  totalPages = currentPdfDoc.getPageCount();
  currentPage = Math.min(currentPage, totalPages);
  if (newName) currentFileName = newName;
  await refreshPreview();
}

// Helper to get current pdf-lib doc and bytes
async function applyAndRefresh(actionAsync) {
  setLoading(true);
  try {
    await actionAsync();
    const newBytes = await currentPdfDoc.save();
    currentPdfBytes = newBytes;
    await refreshPreview();
    showToast("Operation completed!");
  } catch (err) { showToast("Error: "+err.message, "error"); }
  setLoading(false);
}

// ----- UPLOAD HANDLER -----
async function handleUpload(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    currentPdfDoc = await PDFLib.PDFDocument.load(bytes);
    currentPdfBytes = bytes;
    currentFileName = file.name;
    await refreshPreview();
    dashboard.style.display = 'grid';
    uploadArea.style.display = 'none';
  } 
  else if (['jpg','jpeg','png'].includes(ext)) {
    // Convert image to PDF using pdf-lib
    const imgBytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await PDFLib.PDFDocument.create();
    let image;
    if (ext === 'png') image = await pdfDoc.embedPng(imgBytes);
    else image = await pdfDoc.embedJpg(imgBytes);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    const pdfBytes = await pdfDoc.save();
    currentPdfDoc = pdfDoc;
    currentPdfBytes = pdfBytes;
    currentFileName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
    await refreshPreview();
    dashboard.style.display = 'grid';
    uploadArea.style.display = 'none';
  } else showToast("Please upload PDF or image", "error");
}

// UI: Browse & drag drop
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => { if(e.target.files[0]) handleUpload(e.target.files[0]); });
uploadArea.addEventListener('dragover', (e) => e.preventDefault());
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); handleUpload(e.dataTransfer.files[0]); });

// Preview navigation
prevBtn.onclick = () => { if(currentPage>1) { currentPage--; renderPage(currentPage); }};
nextBtn.onclick = () => { if(currentPage<totalPages) { currentPage++; renderPage(currentPage); }};

// Reset
resetBtn.onclick = () => { location.reload(); };
downloadBtn.onclick = async () => {
  if(currentPdfBytes) {
    const blob = new Blob([currentPdfBytes], {type:'application/pdf'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = currentFileName;
    link.click();
    showToast("Download started");
  }
};

// ----- TOOL SWITCHING -----
const toolBtns = document.querySelectorAll('.tool-btn');
function setActiveTool(btn) {
  toolBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Render dynamic settings panel based on tool
async function loadToolUI(toolId) {
  toolSettingsDiv.innerHTML = '<div class="setting-group">Loading...</div>';
  switch(toolId) {
    case 'previewInfo': showInfoUI(); break;
    case 'merge': showMergeUI(); break;
    case 'split': showSplitUI(); break;
    case 'jpgToPdf': showJpgToPdfUI(); break;
    case 'pdfToJpg': showPdfToJpgUI(); break;
    case 'compress': showCompressUI(); break;
    case 'watermark': showWatermarkUI(); break;
    case 'pageNumbers': showPageNumbersUI(); break;
    case 'signature': showSignatureUI(); break;
    case 'editText': showEditTextUI(); break;
    case 'rotate': showRotateUI(); break;
    case 'deletePages': showDeleteUI(); break;
    default: toolSettingsDiv.innerHTML = '<div class="setting-group">Select tool</div>';
  }
}

toolBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    setActiveTool(btn);
    const tool = btn.getAttribute('data-tool');
    toolTitleSpan.innerText = btn.querySelector('span')?.innerText || 'Settings';
    loadToolUI(tool);
  });
});

// ----- UI builders (essential implementations)-----
function showInfoUI() { toolSettingsDiv.innerHTML = `<div class="setting-group"><i class="fas fa-info-circle"></i> Current file: ${currentFileName}<br>Pages: ${totalPages}<br>Size: ${(currentPdfBytes?.length/1024).toFixed(1)} KB</div>`; }
async function showMergeUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Select PDF(s) to merge</label><input type="file" id="mergeFiles" accept=".pdf" multiple><button id="doMergeBtn" class="action-btn">Merge into current</button></div>`;
  document.getElementById('doMergeBtn').onclick = async () => {
    const files = document.getElementById('mergeFiles').files;
    if(!files.length) return;
    const mergedDoc = await PDFLib.PDFDocument.create();
    const pageIndices = async (doc) => (await mergedDoc.copyPages(doc, doc.getPageIndices()));
    const currentDoc = await PDFLib.PDFDocument.load(currentPdfBytes);
    const currentPages = await pageIndices(currentDoc);
    for(const p of currentPages) mergedDoc.addPage(p);
    for(const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFLib.PDFDocument.load(bytes);
      const pages = await pageIndices(doc);
      for(const p of pages) mergedDoc.addPage(p);
    }
    const newBytes = await mergedDoc.save();
    await updateDocFromBytes(newBytes, "merged.pdf");
  };
}
function showSplitUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Page range (e.g., 1-3,5)</label><input id="splitRange" placeholder="1-3,5"><button id="splitBtn" class="action-btn">Extract & Replace</button></div>`;
  document.getElementById('splitBtn').onclick = async () => {
    const rangeText = document.getElementById('splitRange').value;
    const newDoc = await PDFLib.PDFDocument.create();
    const current = await PDFLib.PDFDocument.load(currentPdfBytes);
    const total = current.getPageCount();
    const pagesToKeep = [];
    rangeText.split(',').forEach(part => {
      if(part.includes('-')) { let [s,e]=part.split('-'); for(let i=parseInt(s); i<=parseInt(e); i++) pagesToKeep.push(i-1); }
      else pagesToKeep.push(parseInt(part)-1);
    });
    const pages = await newDoc.copyPages(current, pagesToKeep);
    pages.forEach(p=>newDoc.addPage(p));
    const newBytes = await newDoc.save();
    await updateDocFromBytes(newBytes, "split.pdf");
  };
}
function showJpgToPdfUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Select Images</label><input type="file" id="imgFiles" accept="image/*" multiple><button id="convertImgBtn" class="action-btn">Create PDF & Replace</button></div>`;
  document.getElementById('convertImgBtn').onclick = async () => {
    const files = document.getElementById('imgFiles').files;
    if(!files.length) return;
    const pdfDoc = await PDFLib.PDFDocument.create();
    for(const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let img;
      if(file.type === 'image/png') img = await pdfDoc.embedPng(bytes);
      else img = await pdfDoc.embedJpg(bytes);
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x:0, y:0, width:img.width, height:img.height });
    }
    const newBytes = await pdfDoc.save();
    await updateDocFromBytes(newBytes, "images.pdf");
  };
}
function showPdfToJpgUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><button id="exportJpgBtn" class="action-btn">Convert all pages to JPG (ZIP)</button></div>`;
  document.getElementById('exportJpgBtn').onclick = async () => {
    setLoading(true);
    const zip = new JSZip();
    const blobPdf = new Blob([currentPdfBytes], {type:'application/pdf'});
    const loadingDoc = await pdfjsLib.getDocument(URL.createObjectURL(blobPdf)).promise;
    for(let i=1; i<=loadingDoc.numPages; i++) {
      const page = await loadingDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvasTemp = document.createElement('canvas');
      canvasTemp.width = viewport.width;
      canvasTemp.height = viewport.height;
      const ctx = canvasTemp.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const jpgBlob = await new Promise(resolve => canvasTemp.toBlob(resolve, 'image/jpeg', 0.9));
      zip.file(`page_${i}.jpg`, jpgBlob);
    }
    const content = await zip.generateAsync({type:"blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "pdf_pages.zip";
    link.click();
    setLoading(false);
    showToast("ZIP downloaded");
  };
}
function showCompressUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><button id="compressBtn" class="action-btn">Simulate Compress (re-save)</button></div>`;
  document.getElementById('compressBtn').onclick = async () => {
    const beforeSize = currentPdfBytes.length;
    const newDoc = await PDFLib.PDFDocument.load(currentPdfBytes);
    const compressedBytes = await newDoc.save();
    showToast(`Size reduced from ${(beforeSize/1024).toFixed(1)}KB to ${(compressedBytes.length/1024).toFixed(1)}KB`);
    await updateDocFromBytes(compressedBytes, "compressed.pdf");
  };
}
function showWatermarkUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Text</label><input id="wmText" placeholder="WATERMARK"><label>Opacity (0-1)</label><input id="wmOpacity" type="number" step="0.1" value="0.3"><label>Position</label><select id="wmPos"><option>center</option><option>top</option><option>bottom</option></select><button id="applyWmBtn" class="action-btn">Apply to all pages</button></div>`;
  document.getElementById('applyWmBtn').onclick = async () => {
    const text = document.getElementById('wmText').value || "WATERMARK";
    const opacity = parseFloat(document.getElementById('wmOpacity').value);
    const pos = document.getElementById('wmPos').value;
    const pages = currentPdfDoc.getPages();
    for(const page of pages) {
      const { width, height } = page.getSize();
      let y = pos === 'top' ? height-50 : (pos === 'bottom' ? 50 : height/2);
      page.drawText(text, { x: width/2-50, y, size: 40, opacity, color: [0.8,0.2,0.2] });
    }
    await applyAndRefresh(async()=>{});
  };
}
function showPageNumbersUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Position: </label><select id="numPos"><option>bottom-center</option><option>top-right</option></select><button id="addNumbersBtn" class="action-btn">Add Page Numbers</button></div>`;
  document.getElementById('addNumbersBtn').onclick = async () => {
    const pages = currentPdfDoc.getPages();
    for(let i=0; i<pages.length; i++) {
      const { width, height } = pages[i].getSize();
      pages[i].drawText(`${i+1}`, { x: width/2, y: 30, size: 18, color: [0,0,0] });
    }
    await applyAndRefresh(async()=>{});
  };
}
function showSignatureUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Draw Signature</label><canvas id="sigCanvas" class="signature-canvas" width="300" height="120"></canvas><button id="clearSigBtn">Clear</button><button id="uploadSigImgBtn">Upload Image</button><button id="placeSigBtn" class="action-btn">Place Mode (click on preview)</button></div>`;
  const sigCanvas = document.getElementById('sigCanvas');
  let drawing = false;
  const ctx = sigCanvas.getContext('2d');
  ctx.fillStyle = 'white'; ctx.fillRect(0,0,300,120);
  ctx.strokeStyle = 'black'; ctx.lineWidth=2;
  sigCanvas.addEventListener('mousedown', (e)=>{drawing=true; ctx.beginPath(); ctx.moveTo(e.offsetX,e.offsetY);});
  sigCanvas.addEventListener('mousemove', (e)=>{if(drawing){ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke();}});
  sigCanvas.addEventListener('mouseup',()=>drawing=false);
  document.getElementById('clearSigBtn').onclick = ()=>{ctx.clearRect(0,0,300,120); ctx.fillStyle='white'; ctx.fillRect(0,0,300,120);};
  document.getElementById('uploadSigImgBtn').onclick = ()=>{
    const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange = async(e)=>{
      const file=e.target.files[0];
      const reader=new FileReader();
      reader.onload=(ev)=> { const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,300,120); img.src=ev.target.result; };
      reader.readAsDataURL(file);
    }; inp.click();
  };
  document.getElementById('placeSigBtn').onclick = ()=>{
    showToast("Click on preview to place signature at that location");
    isPlacementMode = true;
    placementCallback = async (x,y,pageNum) => {
      const canvasData = sigCanvas.toDataURL('image/png');
      const pngBytes = await fetch(canvasData).then(res=>res.arrayBuffer());
      const pngImage = await currentPdfDoc.embedPng(new Uint8Array(pngBytes));
      const pages = currentPdfDoc.getPages();
      const page = pages[pageNum-1];
      const {width,height}=page.getSize();
      page.drawImage(pngImage, { x: (x/ canvas.clientWidth)*width, y: height - (y/ canvas.clientHeight)*height, width: 100, height: 50 });
      await applyAndRefresh(async()=>{});
      isPlacementMode=false;
    };
  };
  canvas.addEventListener('click', (e) => {
    if(!isPlacementMode) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    placementCallback(x, y, currentPage);
    isPlacementMode=false;
  });
}
function showEditTextUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Text overlay</label><input id="overlayText" placeholder="Your text"><label>Font size</label><input id="fontSize" value="24"><button id="textPlaceBtn" class="action-btn">Placement Mode (click on preview)</button></div>`;
  document.getElementById('textPlaceBtn').onclick = ()=>{
    const text = document.getElementById('overlayText').value;
    const size = parseInt(document.getElementById('fontSize').value);
    if(!text) return;
    showToast("Click on PDF preview to add text");
    isPlacementMode=true;
    placementCallback = async (x,y,pageNum)=>{
      const pages = currentPdfDoc.getPages();
      const page = pages[pageNum-1];
      const {width,height}=page.getSize();
      page.drawText(text, { x: (x/ canvas.clientWidth)*width, y: height - (y/ canvas.clientHeight)*height, size });
      await applyAndRefresh(async()=>{});
      isPlacementMode=false;
    };
  };
}
function showRotateUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Page number(s) (1-${totalPages})</label><input id="rotatePages" placeholder="all or 1,3"><button id="rotateLeftBtn">Rotate Left</button><button id="rotateRightBtn">Rotate Right</button></div>`;
  const rotate = async (deg) => {
    const pagesInput = document.getElementById('rotatePages').value;
    const allPages = pagesInput === "all" ? currentPdfDoc.getPageIndices() : pagesInput.split(',').map(p=>parseInt(p)-1);
    for(let idx of allPages) currentPdfDoc.getPages()[idx].setRotation(deg);
    await applyAndRefresh(async()=>{});
  };
  document.getElementById('rotateLeftBtn').onclick = ()=>rotate(90);
  document.getElementById('rotateRightBtn').onclick = ()=>rotate(-90);
}
function showDeleteUI() {
  toolSettingsDiv.innerHTML = `<div class="setting-group"><label>Pages to delete (1-index, comma: 1,3)</label><input id="delPages" placeholder="2,4"><button id="deleteBtn" class="action-btn">Delete Pages</button></div>`;
  document.getElementById('deleteBtn').onclick = async () => {
    const del = document.getElementById('delPages').value.split(',').map(p=>parseInt(p)-1).sort((a,b)=>b-a);
    for(let i of del) currentPdfDoc.removePage(i);
    await applyAndRefresh(async()=>{});
  };
}