'use strict';

import exifr from 'https://cdn.jsdelivr.net/npm/exifr/dist/full.esm.js';

const LOGO_DIR = './assets/logos';

// ── フォント ──────────────────────────────────────────────────────────────────
const FONTS = [
  { label: 'San Francisco',       value: '-apple-system,"Helvetica Neue",Arial,sans-serif' },
  { label: 'Helvetica Neue',      value: '"Helvetica Neue",Helvetica,Arial,sans-serif'     },
  { label: 'Futura',              value: '"Futura","Century Gothic",sans-serif'            },
  { label: 'Avenir Next',         value: '"Avenir Next","Avenir",sans-serif'               },
  { label: 'Optima',              value: '"Optima",sans-serif'                             },
  { label: 'Gill Sans',           value: '"Gill Sans","Gill Sans MT",sans-serif'           },
  { label: 'Didot',               value: '"Didot",serif'                                   },
  { label: 'Bodoni 72',           value: '"Bodoni 72","Bodoni MT",serif'                   },
  { label: 'Baskerville',         value: '"Baskerville",serif'                             },
  { label: 'Big Caslon',          value: '"Big Caslon","Book Antiqua",serif'               },
  { label: 'Hoefler Text',        value: '"Hoefler Text","Garamond",serif'                 },
  { label: 'Palatino',            value: '"Palatino","Palatino Linotype",serif'            },
  { label: 'Courier New',         value: '"Courier New",Courier,monospace'                },
  { label: 'American Typewriter', value: '"American Typewriter",serif'                    },
];
let currentFont = FONTS[0].value;

// ── Brands ────────────────────────────────────────────────────────────────────
const BRANDS = [
  { keywords: ['canon'],                             logoFile: 'Canon_logo.svg'                        },
  { keywords: ['fujifilm', 'fuji film'],             logoFile: 'Fujifilm_logo.svg',
    processSvgForDark: (t) => t.replace(/fill:#000000/gi, 'fill:#ffffff') },
  { keywords: ['panasonic'],                         logoFile: 'Lumix_logo.svg',      invertOnDark: true },
  { keywords: ['nikon'],                             logoFile: 'Nikon_Logo.svg'                        },
  { keywords: ['sony'],                              logoFile: 'Sony_logo.svg',       invertOnDark: true },
  { keywords: ['leica'],                             logoFile: 'Leica_Camera.svg'                      },
  { keywords: ['olympus','om system','om digital'],  logoFile: 'OM_Digital_Solutions_Logo.svg', invertOnDark: true },
  { keywords: ['ricoh'],                             logoFile: 'Ricoh_logo_2005.svg'                   },
  { keywords: ['hasselblad'],                        logoFile: 'Hasselblad_logo.svg', invertOnDark: true },
  { keywords: ['dji'],                               logoFile: 'DJI_Innovations_logo.svg'              },
  { keywords: ['kodak'],                             logoFile: 'Eastman_Kodak_Company_logo_(2016).svg' },
  { keywords: ['gopro'],                             logoFile: 'GoPro_logo_light.svg'                  },
  { keywords: ['sigma'],                             logoFile: 'Sigma_logo.svg',      invertOnDark: true },
  { keywords: ['apple'],                             logoFile: 'Apple_logo_black.svg', invertOnDark: true },
];
const DEFAULT_BRAND = {
  logoFile: null, circleColor: '#999999', circleText: '📷',
  circleTextColor: '#FFFFFF', circleFont: (sz) => `${sz}px sans-serif`,
};

function detectBrand(make = '') {
  const lower = make.toLowerCase();
  for (const b of BRANDS) if (b.keywords.some(k => lower.includes(k))) return b;
  return DEFAULT_BRAND;
}

// ── Logo cache ────────────────────────────────────────────────────────────────
const logoCache = new Map();

async function getLogoImage(brand, isDark = false) {
  if (!brand.logoFile) return null;
  const key = (isDark && brand.processSvgForDark) ? `${brand.logoFile}__dark` : brand.logoFile;
  if (logoCache.has(key)) return logoCache.get(key);

  let svg;
  try { svg = await fetch(`${LOGO_DIR}/${brand.logoFile}`).then(r => r.text()); }
  catch { return null; }

  if (brand.processSvg)             svg = brand.processSvg(svg);
  if (isDark && brand.processSvgForDark) svg = brand.processSvgForDark(svg);

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = await new Promise(resolve => {
    const i = new Image();
    i.onload  = () => { URL.revokeObjectURL(url); resolve(i); };
    i.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    i.src = url;
  });
  logoCache.set(key, img);
  return img;
}

// ── EXIF helpers ──────────────────────────────────────────────────────────────
const formatShutter = s => !s ? null : s >= 1 ? `${s}s` : `1/${Math.round(1/s)}s`;
const formatFNumber = n => !n ? null : `f/${Number(n).toFixed(1).replace('.0','')}`;
const formatFocal   = mm => !mm ? null : `${Number.isInteger(+mm) ? +mm : (+mm).toFixed(1)}mm`;
const formatISO     = iso => !iso ? null : `ISO${iso}`;
const formatModel   = (make, model) => model?.trim() || make?.trim() || 'Unknown Camera';

function formatDateTime(dt) {
  if (!dt) return null;
  const d = dt instanceof Date ? dt : new Date(dt);
  if (isNaN(d)) return null;
  const p = n => String(n).padStart(2,'0');
  return { time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
           date: `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())}` };
}

function buildSettingsLine(exif) {
  return [formatFocal(exif?.FocalLength), formatFNumber(exif?.FNumber),
          formatShutter(exif?.ExposureTime), formatISO(exif?.ISO)].filter(Boolean).join('  ') || null;
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawLogoOnCanvas(ctx, logoImg, brand, isDark, cx, cy, maxW, maxH) {
  if (logoImg) {
    const scale = Math.min(maxH/logoImg.naturalHeight, maxW/logoImg.naturalWidth);
    const lw = logoImg.naturalWidth*scale, lh = logoImg.naturalHeight*scale;
    ctx.save();
    if (isDark && brand.invertOnDark && !brand.processSvgForDark) ctx.filter = 'invert(1)';
    ctx.drawImage(logoImg, cx-lw/2, cy-lh/2, lw, lh);
    ctx.restore();
  } else if (brand.circleColor) {
    const r = Math.min(maxW,maxH)/2;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=brand.circleColor; ctx.fill();
    const sz = Math.round(r*0.52);
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=brand.circleTextColor||'#FFF';
    ctx.font=(brand.circleFont||(()=>`bold ${sz}px sans-serif`))(sz);
    ctx.fillText(brand.circleText||'?',cx,cy); ctx.restore();
  }
}

const barColors = isDark => ({
  bg:        isDark ? '#000000' : '#FFFFFF',
  border:    isDark ? '#2e2e2e' : '#DDDDDD',
  primary:   isDark ? '#FFFFFF' : '#1a1a1a',
  secondary: isDark ? '#999999' : '#777777',
});

// ── Templates ─────────────────────────────────────────────────────────────────
async function renderWatermark(imgElement, exif, barStyle='white', template=0, fontScale=1.0, barScale=1.0) {
  const isDark=barStyle==='black', brand=detectBrand(exif?.Make), logoImg=await getLogoImage(brand,isDark);
  const p={imgElement,exif,barStyle,isDark,brand,logoImg,imgW:imgElement.naturalWidth,imgH:imgElement.naturalHeight,fontScale,barScale};
  return [renderT0,renderT1,renderT2,renderT3,renderT4,renderT5][template]?.(p) ?? renderT0(p);
}

function renderT0({imgElement,exif,isDark,brand,logoImg,imgW,imgH,fontScale=1,barScale=1}) {
  const baseBarH=Math.max(60,Math.round(Math.max(imgW,imgH)*0.072));
  const barH=Math.max(60,Math.round(baseBarH*barScale));
  const canvas=document.createElement('canvas'); canvas.width=imgW; canvas.height=imgH+barH;
  const ctx=canvas.getContext('2d'), col=barColors(isDark);
  const pad=barH*0.24, lineGap=barH*0.07, barY=imgH, barCY=imgH+barH/2;
  ctx.drawImage(imgElement,0,0,imgW,imgH);
  ctx.fillStyle=col.bg;     ctx.fillRect(0,barY,imgW,barH);
  ctx.fillStyle=col.border; ctx.fillRect(0,barY,imgW,Math.max(1,Math.round(barH*0.005)));
  drawLogoOnCanvas(ctx,logoImg,brand,isDark,imgW/2,barCY,imgW*0.20,barH*0.50);
  const ms=Math.round(baseBarH*0.27*fontScale), ls=Math.round(baseBarH*0.155*fontScale);
  const topY=barCY-(ms+lineGap+ls)/2+ms;
  ctx.save(); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=col.primary; ctx.font=`bold ${ms}px ${currentFont}`;
  ctx.fillText(formatModel(exif?.Make,exif?.Model),pad,topY);
  if(exif?.LensModel){ctx.fillStyle=col.secondary;ctx.font=`${ls}px ${currentFont}`;ctx.fillText(exif.LensModel.trim(),pad,topY+lineGap+ls);}
  ctx.restore();
  _drawRightBlock(ctx,exif,isDark,col,baseBarH,imgW,pad,barCY,lineGap,fontScale);
  return canvas;
}

function renderT1({imgElement,exif,isDark,brand,logoImg,imgW,imgH,fontScale=1,barScale=1}) {
  const baseBarH=Math.max(60,Math.round(Math.max(imgW,imgH)*0.072));
  const barH=Math.max(60,Math.round(baseBarH*barScale));
  const canvas=document.createElement('canvas'); canvas.width=imgW; canvas.height=imgH+barH;
  const ctx=canvas.getContext('2d'), col=barColors(isDark);
  const pad=barH*0.18, lineGap=barH*0.07, barY=imgH, barCY=imgH+barH/2;
  ctx.drawImage(imgElement,0,0,imgW,imgH);
  ctx.fillStyle=col.bg;     ctx.fillRect(0,barY,imgW,barH);
  ctx.fillStyle=col.border; ctx.fillRect(0,barY,imgW,Math.max(1,Math.round(barH*0.005)));
  const logoZone=barH*0.72;
  drawLogoOnCanvas(ctx,logoImg,brand,isDark,pad+logoZone/2,barCY,logoZone*1.2,logoZone*0.72);
  const divX=pad+logoZone+pad*0.6;
  ctx.fillStyle=col.border; ctx.fillRect(divX,barY+barH*0.18,Math.max(1,Math.round(barH*0.01)),barH*0.64);
  const textX=divX+pad*0.7;
  const ms=Math.round(baseBarH*0.27*fontScale), ls=Math.round(baseBarH*0.155*fontScale);
  const topY=barCY-(ms+lineGap+ls)/2+ms;
  ctx.save(); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=col.primary; ctx.font=`bold ${ms}px ${currentFont}`;
  ctx.fillText(formatModel(exif?.Make,exif?.Model),textX,topY);
  if(exif?.LensModel){ctx.fillStyle=col.secondary;ctx.font=`${ls}px ${currentFont}`;ctx.fillText(exif.LensModel.trim(),textX,topY+lineGap+ls);}
  ctx.restore();
  _drawRightBlock(ctx,exif,isDark,col,baseBarH,imgW,barH*0.18,barCY,lineGap,fontScale);
  return canvas;
}

function renderT2({imgElement,exif,isDark,brand,logoImg,imgW,imgH,fontScale=1,barScale=1}) {
  const baseBarH=Math.max(36,Math.round(Math.max(imgW,imgH)*0.042));
  const barH=Math.max(36,Math.round(baseBarH*barScale));
  const canvas=document.createElement('canvas'); canvas.width=imgW; canvas.height=imgH+barH;
  const ctx=canvas.getContext('2d'), col=barColors(isDark);
  const barY=imgH, barCY=imgH+barH/2;
  ctx.drawImage(imgElement,0,0,imgW,imgH);
  ctx.fillStyle=col.bg;     ctx.fillRect(0,barY,imgW,barH);
  ctx.fillStyle=col.border; ctx.fillRect(0,barY,imgW,Math.max(1,Math.round(barH*0.008)));
  const pad=barH*0.3;
  const logoCX=pad+barH*0.28, logoSize=barH*0.56;
  drawLogoOnCanvas(ctx,logoImg,brand,isDark,logoCX,barCY,logoSize,logoSize);
  // ミニマル: カメラ名・レンズ・日付のみ（焦点距離/F値/SS/ISOは省略）
  const dt=formatDateTime(exif?.DateTimeOriginal||exif?.DateTime);
  const parts=[formatModel(exif?.Make,exif?.Model),exif?.LensModel?.trim(),dt?dt.date:null].filter(Boolean);
  const fontSize=Math.round(baseBarH*0.36*fontScale);
  const logoRightEdge=logoCX+logoSize/2+pad*0.5;
  const textCenterX=logoRightEdge+(imgW-pad-logoRightEdge)/2;
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=col.primary; ctx.font=`${fontSize}px ${currentFont}`;
  ctx.beginPath(); ctx.rect(logoRightEdge,barY,imgW-logoRightEdge,barH); ctx.clip();
  ctx.fillText(parts.join('  ·  '),textCenterX,barCY);
  ctx.restore();
  return canvas;
}

function renderT3({imgElement,exif,isDark,brand,logoImg,imgW,imgH,fontScale=1,barScale=1}) {
  const baseBarH=Math.max(120,Math.round(Math.max(imgW,imgH)*0.145));
  const barH=Math.max(120,Math.round(baseBarH*barScale));
  const canvas=document.createElement('canvas'); canvas.width=imgW; canvas.height=imgH+barH;
  const ctx=canvas.getContext('2d'), col=barColors(isDark);
  const pad=barH*0.13, lineGap=barH*0.04, barY=imgH;
  ctx.drawImage(imgElement,0,0,imgW,imgH);
  ctx.fillStyle=col.bg;     ctx.fillRect(0,barY,imgW,barH);
  ctx.fillStyle=col.border; ctx.fillRect(0,barY,imgW,Math.max(1,Math.round(barH*0.003)));
  const upperH=barH*0.50;
  ctx.fillStyle=col.border; ctx.fillRect(pad*2,barY+upperH,imgW-pad*4,Math.max(1,Math.round(barH*0.003)));
  drawLogoOnCanvas(ctx,logoImg,brand,isDark,imgW/2,barY+upperH/2,imgW*0.28,upperH*0.62);
  const lowerCY=barY+upperH+(barH-upperH)/2;
  const ms=Math.round(baseBarH*0.165*fontScale), ls=Math.round(baseBarH*0.1*fontScale);
  const ss=Math.round(baseBarH*0.155*fontScale), ts=Math.round(baseBarH*0.095*fontScale);
  const modelTopY=lowerCY-(ms+lineGap+ls)/2+ms;
  ctx.save(); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=col.primary; ctx.font=`bold ${ms}px ${currentFont}`;
  ctx.fillText(formatModel(exif?.Make,exif?.Model),pad,modelTopY);
  if(exif?.LensModel){ctx.fillStyle=col.secondary;ctx.font=`${ls}px ${currentFont}`;ctx.fillText(exif.LensModel.trim(),pad,modelTopY+lineGap+ls);}
  ctx.restore();
  const settingsText=buildSettingsLine(exif), dt=formatDateTime(exif?.DateTimeOriginal||exif?.DateTime);
  const rightH=(settingsText&&dt)?ss+lineGap+ts:ss;
  const rightTopY=lowerCY-rightH/2+ss;
  ctx.save(); ctx.textAlign='right'; ctx.textBaseline='alphabetic';
  if(settingsText){ctx.fillStyle=col.primary;ctx.font=`bold ${ss}px ${currentFont}`;ctx.fillText(settingsText,imgW-pad,rightTopY);}
  if(dt){ctx.fillStyle=col.secondary;ctx.font=`${ts}px ${currentFont}`;ctx.fillText(dt.date,imgW-pad,settingsText?rightTopY+lineGap+ts:rightTopY);}
  ctx.restore();
  return canvas;
}

function renderT4({imgElement,exif,isDark,brand,logoImg,imgW,imgH,fontScale=1,barScale=1}) {
  const baseBarW=Math.max(100,Math.round(imgW*0.135));
  const barW=Math.max(100,Math.round(baseBarW*barScale));
  const canvas=document.createElement('canvas'); canvas.width=imgW+barW; canvas.height=imgH;
  const ctx=canvas.getContext('2d'), col=barColors(isDark);
  ctx.drawImage(imgElement,0,0,imgW,imgH);
  ctx.fillStyle=col.bg;     ctx.fillRect(imgW,0,barW,imgH);
  ctx.fillStyle=col.border; ctx.fillRect(imgW,0,Math.max(1,Math.round(barW*0.007)),imgH);
  const cx=imgW+barW/2, pad=barW*0.11;
  drawLogoOnCanvas(ctx,logoImg,brand,isDark,cx,pad+barW*0.285/2,barW*0.80,barW*0.285);
  const focal=exif?.FocalLength?`${Math.round(exif.FocalLength)}mm`:null;
  const fnum=exif?.FNumber?`f${Number(exif.FNumber).toFixed(1).replace('.0','')}`:null;
  const ss=exif?.ExposureTime?(exif.ExposureTime>=1?`SS${exif.ExposureTime}s`:`SS1/${Math.round(1/exif.ExposureTime)}`):null;
  const iso=exif?.ISO?`ISO${exif.ISO}`:null;
  const dt=formatDateTime(exif?.DateTimeOriginal||exif?.DateTime);
  const modelSz=baseBarW*0.148*fontScale, lensSz=baseBarW*0.105*fontScale;
  const valSz=baseBarW*0.155*fontScale, dateSz=baseBarW*0.108*fontScale;
  const mainItems=[
    {text:formatModel(exif?.Make,exif?.Model),sz:modelSz,bold:true,color:col.primary},
    exif?.LensModel?{text:exif.LensModel.trim(),sz:lensSz,bold:false,color:col.secondary}:null,
    focal?{text:focal,sz:valSz,bold:false,color:col.primary}:null,
    fnum?{text:fnum,sz:valSz,bold:false,color:col.primary}:null,
    ss?{text:ss,sz:valSz,bold:false,color:col.primary}:null,
    iso?{text:iso,sz:valSz,bold:false,color:col.primary}:null,
  ].filter(Boolean);
  const mainBlockH=mainItems.reduce((s,i)=>s+i.sz*1.38,0);
  const dateGap=barW*0.025, sepGap=barW*0.06;
  let y=imgH/2-(mainBlockH+(dt?dateGap+sepGap+dateSz*1.38:0))/2;
  let maxTW=0;
  for(const item of mainItems){ctx.font=`${item.bold?'bold ':''}${Math.round(item.sz)}px ${currentFont}`;maxTW=Math.max(maxTW,ctx.measureText(item.text).width);}
  const availW=barW-pad*2, startX=cx-Math.min(maxTW,availW)/2;
  for(const item of mainItems){
    ctx.save(); ctx.font=`${item.bold?'bold ':''}${Math.round(item.sz)}px ${currentFont}`;
    ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillStyle=item.color;
    const mw=ctx.measureText(item.text).width;
    if(mw>availW)ctx.transform(availW/mw,0,0,1,startX*(1-availW/mw),0);
    ctx.fillText(item.text,startX,y); ctx.restore(); y+=item.sz*1.38;
  }
  if(dt){
    y+=dateGap;
    ctx.fillStyle=col.border; ctx.fillRect(imgW+pad,y,barW-pad*2,Math.max(1,Math.round(barW*0.007)));
    y+=sepGap;
    ctx.save(); ctx.font=`${Math.round(dateSz)}px ${currentFont}`;
    ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillStyle=col.secondary;
    ctx.fillText(dt.date,cx,y); ctx.restore();
  }
  return canvas;
}

function renderT5({imgElement,exif,isDark,brand,logoImg,imgW,imgH,fontScale=1,barScale=1}) {
  const baseBarH=Math.max(60,Math.round(Math.max(imgW,imgH)*0.072));
  const barH=Math.max(60,Math.round(baseBarH*barScale));
  const canvas=document.createElement('canvas'); canvas.width=imgW; canvas.height=imgH+barH;
  const ctx=canvas.getContext('2d'), col=barColors(isDark);
  const pad=barH*0.24, lineGap=barH*0.07, barCY=barH/2;
  ctx.fillStyle=col.bg;     ctx.fillRect(0,0,imgW,barH);
  ctx.fillStyle=col.border; ctx.fillRect(0,barH-Math.max(1,Math.round(barH*0.005)),imgW,Math.max(1,Math.round(barH*0.005)));
  ctx.drawImage(imgElement,0,barH,imgW,imgH);
  drawLogoOnCanvas(ctx,logoImg,brand,isDark,imgW/2,barCY,imgW*0.20,barH*0.50);
  const ms=Math.round(baseBarH*0.27*fontScale), ls=Math.round(baseBarH*0.155*fontScale);
  const topY=barCY-(ms+lineGap+ls)/2+ms;
  ctx.save(); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=col.primary; ctx.font=`bold ${ms}px ${currentFont}`;
  ctx.fillText(formatModel(exif?.Make,exif?.Model),pad,topY);
  if(exif?.LensModel){ctx.fillStyle=col.secondary;ctx.font=`${ls}px ${currentFont}`;ctx.fillText(exif.LensModel.trim(),pad,topY+lineGap+ls);}
  ctx.restore();
  _drawRightBlock(ctx,exif,isDark,col,baseBarH,imgW,pad,barCY,lineGap,fontScale);
  return canvas;
}

function _drawRightBlock(ctx,exif,isDark,col,barH,imgW,pad,barCY,lineGap,fontScale=1) {
  const settingsText=buildSettingsLine(exif), dt=formatDateTime(exif?.DateTimeOriginal||exif?.DateTime);
  const ss=Math.round(barH*0.25*fontScale), ts=Math.round(barH*0.152*fontScale);
  const rightTotalH=(settingsText&&dt)?ss+lineGap+ts:ss;
  const rightTopY=barCY-rightTotalH/2+ss;
  ctx.save(); ctx.textAlign='right'; ctx.textBaseline='alphabetic';
  if(settingsText){ctx.fillStyle=col.primary;ctx.font=`bold ${ss}px ${currentFont}`;ctx.fillText(settingsText,imgW-pad,rightTopY);}
  if(dt){ctx.fillStyle=col.secondary;ctx.font=`${ts}px ${currentFont}`;ctx.fillText(dt.date,imgW-pad,settingsText?rightTopY+lineGap+ts:rightTopY);}
  ctx.restore();
}

// ── Preview ───────────────────────────────────────────────────────────────────
function drawPreviewScaled(fullCanvas, scrollEl) {
  const dpr = Math.max(window.devicePixelRatio || 1, 3);
  const maxW = scrollEl.clientWidth  - 24;
  const maxH = scrollEl.clientHeight - 24;
  const scale = Math.min(1, maxW / fullCanvas.width, maxH / fullCanvas.height);

  // CSSサイズ（論理ピクセル）
  const cssW = Math.round(fullCanvas.width  * scale);
  const cssH = Math.round(fullCanvas.height * scale);

  // 物理ピクセル（Retina対応）
  previewCanvas.width  = cssW * dpr;
  previewCanvas.height = cssH * dpr;
  previewCanvas.style.width  = cssW + 'px';
  previewCanvas.style.height = cssH + 'px';

  const ctx = previewCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fullCanvas, 0, 0, cssW * dpr, cssH * dpr);
}

// ── Download ──────────────────────────────────────────────────────────────────
function downloadCanvas(canvas, filename) {
  canvas.toBlob(blob => {
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  },'image/jpeg',0.95);
}
const buildSaveName = file => `${file.name.replace(/\.[^.]+$/,'')}_watermark.jpg`;

// ── App state ─────────────────────────────────────────────────────────────────
const state = { items:[], current:0, selected:new Set(), barStyle:'white', template:0, fontScale:1, barScale:1, fontFamily:0 };

// ── DOM refs ──────────────────────────────────────────────────────────────────
// Desktop sidebar
const dropZone        = document.getElementById('dropZone');
const fileInput       = document.getElementById('fileInput');
const openBtn         = document.getElementById('openBtn');
const fileList        = document.getElementById('fileList');
const fileListHeader  = document.getElementById('fileListHeader');
const fileCount       = document.getElementById('fileCount');
const selectAllBtn    = document.getElementById('selectAllBtn');
const deselectAllBtn  = document.getElementById('deselectAllBtn');
const clearBtn        = document.getElementById('clearBtn');
const batchExportBtn  = document.getElementById('batchExportBtn');
// Mobile drawer
const hamburgerBtn    = document.getElementById('hamburgerBtn');
const drawerOverlay   = document.getElementById('drawerOverlay');
const mobileDrawer    = document.getElementById('mobileDrawer');
const drawerCloseBtn  = document.getElementById('drawerCloseBtn');
const drawerLibraryBtn   = document.getElementById('drawerLibraryBtn');
const drawerCameraBtn    = document.getElementById('drawerCameraBtn');
const drawerLibraryInput = document.getElementById('drawerLibraryInput');
const drawerCameraInput  = document.getElementById('drawerCameraInput');
const drawerFileList     = document.getElementById('drawerFileList');
// Mobile pick area (initial, no files)
const mobilePickArea  = document.getElementById('mobilePickArea');
const pickLibraryBtn  = document.getElementById('pickLibraryBtn');
const pickCameraBtn   = document.getElementById('pickCameraBtn');
const pickLibraryInput= document.getElementById('pickLibraryInput');
const pickCameraInput = document.getElementById('pickCameraInput');
// Preview
const previewEmpty    = document.getElementById('previewEmpty');
const previewContent  = document.getElementById('previewContent');
const previewCanvas   = document.getElementById('previewCanvas');
const canvasLoading   = document.getElementById('canvasLoading');
const navCounter      = document.getElementById('navCounter');
const prevBtn         = document.getElementById('prevBtn');
const nextBtn         = document.getElementById('nextBtn');
const barWhiteBtn     = document.getElementById('barWhiteBtn');
const barBlackBtn     = document.getElementById('barBlackBtn');
const exportBtn       = document.getElementById('exportBtn');
const exifStrip       = document.getElementById('exifStrip');
const toast           = document.getElementById('toast');
const fontScaleSlider = document.getElementById('fontScaleSlider');
const fontScaleValue  = document.getElementById('fontScaleValue');
const barScaleSlider  = document.getElementById('barScaleSlider');
const barScaleValue   = document.getElementById('barScaleValue');
const templateSelect  = document.getElementById('templateSelect');
const fontSelect      = document.getElementById('fontSelect');
const paramsToggleBtn = document.getElementById('paramsToggleBtn');
const paramsBar       = document.getElementById('paramsBar');

// ── Drawer open / close ───────────────────────────────────────────────────────
function openDrawer() {
  renderDrawerFileList();
  drawerOverlay.style.display = 'block';
  mobileDrawer.style.display  = 'flex';
  requestAnimationFrame(() => {
    drawerOverlay.classList.add('open');
    mobileDrawer.classList.add('open');
  });
}
function closeDrawer() {
  drawerOverlay.classList.remove('open');
  mobileDrawer.classList.remove('open');
  setTimeout(() => {
    drawerOverlay.style.display = 'none';
    mobileDrawer.style.display  = 'none';
  }, 280);
}

hamburgerBtn.addEventListener('click', openDrawer);
drawerCloseBtn.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// ── Drawer file list ──────────────────────────────────────────────────────────
function renderDrawerFileList() {
  drawerFileList.innerHTML = '';
  if (state.items.length === 0) {
    drawerFileList.innerHTML = '<div style="padding:20px;text-align:center;color:#555;font-size:13px;">写真がありません</div>';
    return;
  }
  state.items.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'drawer-item' + (idx === state.current ? ' active' : '');

    const thumb = document.createElement('img');
    thumb.className = 'drawer-thumb';
    if (item.fullCanvas) {
      const tmp = document.createElement('canvas');
      tmp.width = 104; tmp.height = 104;
      tmp.getContext('2d').drawImage(item.fullCanvas, 0, 0, 104, 104);
      thumb.src = tmp.toDataURL('image/jpeg', 0.75);
    } else {
      const url = URL.createObjectURL(item.file);
      thumb.src = url;
      thumb.onload = () => URL.revokeObjectURL(url);
    }

    const info = document.createElement('div');
    info.className = 'drawer-item-info';
    info.innerHTML = `<div class="drawer-item-name">${item.file.name}</div>
                      <div class="drawer-item-status">${item.fullCanvas ? '完了' : '処理中…'}</div>`;

    const delBtn = document.createElement('button');
    delBtn.className = 'drawer-delete-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', e => { e.stopPropagation(); deleteItem(idx); });

    el.appendChild(thumb);
    el.appendChild(info);
    el.appendChild(delBtn);
    el.addEventListener('click', () => { showItem(idx); closeDrawer(); });
    drawerFileList.appendChild(el);
  });
}

// ── Delete item ───────────────────────────────────────────────────────────────
function deleteItem(idx) {
  state.items.splice(idx, 1);
  // remap selected indices
  const newSelected = new Set();
  for (const i of state.selected) {
    if (i < idx) newSelected.add(i);
    else if (i > idx) newSelected.add(i - 1);
  }
  state.selected = newSelected;
  // fix current
  if (state.current >= state.items.length) state.current = Math.max(0, state.items.length - 1);

  rebuildDesktopFileList();
  renderDrawerFileList();
  updateUI();
  updateNav();
  if (state.items.length > 0) showItem(state.current);
}

function rebuildDesktopFileList() {
  fileList.innerHTML = '';
  state.items.forEach((item, idx) => {
    addFileListItem(item, idx);
    if (item.fullCanvas) updateThumb(idx);
    if (item.exif !== undefined && !item.fullCanvas) setItemStatus(idx, 'processing');
    else if (item.fullCanvas) setItemStatus(idx, 'done');
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type='info') {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className='toast'; }, 3000);
}

// ── File loading ──────────────────────────────────────────────────────────────
async function loadFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpe?g|tiff?|heic|heif|png|webp)$/i)) continue;
    const item = { file, exif:null, img:null, fullCanvas:null };
    state.items.push(item);
    const idx = state.items.length - 1;
    addFileListItem(item, idx);
    processItem(item, idx);
  }
  updateUI();
}

async function processItem(item, idx) {
  setItemStatus(idx, 'processing');
  try {
    const buf = await item.file.arrayBuffer();
    item.exif = await exifr.parse(buf, {tiff:true,xmp:false,icc:false,iptc:false}).catch(()=>null);
    item.img  = await loadImage(item.file);
    item.fullCanvas = await renderWatermark(item.img, item.exif, state.barStyle, state.template, state.fontScale, state.barScale);
    setItemStatus(idx, 'done');
    updateThumb(idx);
    if (state.items.length === 1 || state.current === idx) showItem(idx);
  } catch(err) {
    console.error('processItem error', err);
    setItemStatus(idx, 'error');
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img);}; img.onerror=reject; img.src=url;
  });
}

// ── Desktop file list UI ──────────────────────────────────────────────────────
function addFileListItem(item, idx) {
  const el = document.createElement('div');
  el.className = 'file-item'; el.dataset.idx = idx;
  el.innerHTML = `
    <input type="checkbox" class="file-check">
    <img class="file-thumb" src="" alt="">
    <div class="file-info">
      <div class="file-name">${item.file.name}</div>
      <div class="file-meta">読み込み中…</div>
    </div>
    <div class="file-status"></div>`;
  const checkbox = el.querySelector('.file-check');
  checkbox.addEventListener('change', e => { e.stopPropagation(); toggleSelection(idx, checkbox.checked); });
  el.addEventListener('click', e => { if(e.target===checkbox) return; showItem(idx); });
  fileList.appendChild(el);
  const thumb=el.querySelector('.file-thumb'), turl=URL.createObjectURL(item.file);
  thumb.src=turl; thumb.onload=()=>URL.revokeObjectURL(turl);
}

function toggleSelection(idx, checked) {
  if (checked) state.selected.add(idx); else state.selected.delete(idx);
  const el=fileList.querySelector(`[data-idx="${idx}"]`);
  if(el){el.classList.toggle('checked',checked);el.querySelector('.file-check').checked=checked;}
  updateSelectionUI();
}

function updateSelectionUI() {
  const n=state.selected.size, readyTotal=state.items.filter(i=>i.fullCanvas).length;
  batchExportBtn.textContent=`保存 (${n}枚選択)`; batchExportBtn.disabled=n===0;
  const all=readyTotal>0&&n===readyTotal;
  selectAllBtn.style.display=all?'none':''; deselectAllBtn.style.display=all?'':'none';
}

function setItemStatus(idx, status) {
  const el=fileList.querySelector(`[data-idx="${idx}"]`); if(!el)return;
  el.classList.remove('done','processing','error');
  if(status!=='error')el.classList.add(status);
  const meta=el.querySelector('.file-meta');
  if(meta)meta.textContent=status==='done'?'完了':status==='processing'?'処理中…':'エラー';
}

function updateThumb(idx) {
  const item=state.items[idx]; if(!item?.fullCanvas)return;
  const el=fileList.querySelector(`[data-idx="${idx}"]`); if(!el)return;
  const tmp=document.createElement('canvas'); tmp.width=72; tmp.height=72;
  tmp.getContext('2d').drawImage(item.fullCanvas,0,0,72,72);
  el.querySelector('.file-thumb').src=tmp.toDataURL('image/jpeg',0.7);
}

function setActiveItem(idx) {
  fileList.querySelectorAll('.file-item').forEach(el=>el.classList.remove('active'));
  const el=fileList.querySelector(`[data-idx="${idx}"]`);
  if(el){el.classList.add('active');el.scrollIntoView({block:'nearest'});}
}

// ── Preview ───────────────────────────────────────────────────────────────────
function showItem(idx) {
  state.current = idx;
  const item = state.items[idx];
  previewEmpty.style.display   = 'none';
  previewContent.style.display = 'flex';
  if(mobilePickArea) mobilePickArea.style.display = 'none';
  setActiveItem(idx);
  updateNav();
  if(!item?.fullCanvas){canvasLoading.classList.remove('hidden');return;}
  canvasLoading.classList.add('hidden');
  requestAnimationFrame(()=>drawPreviewScaled(item.fullCanvas, document.querySelector('.canvas-scroll')));
  updateExifStrip(item.exif);
}

function updateNav() {
  const n=state.items.length;
  navCounter.textContent=n?`${state.current+1} / ${n}`:'0 / 0';
  prevBtn.disabled=state.current<=0; nextBtn.disabled=state.current>=n-1;
}

function updateExifStrip(exif) {
  if(!exif){exifStrip.innerHTML='';return;}
  exifStrip.innerHTML=[
    {label:'カメラ',  value:formatModel(exif.Make,exif.Model)},
    {label:'レンズ',  value:exif.LensModel?.trim()},
    {label:'焦点距離',value:formatFocal(exif.FocalLength)},
    {label:'絞り',    value:formatFNumber(exif.FNumber)},
    {label:'SS',      value:formatShutter(exif.ExposureTime)},
    {label:'ISO',     value:formatISO(exif.ISO)},
  ].filter(c=>c.value).map(c=>`<div class="exif-chip"><span class="exif-chip-label">${c.label}</span><span class="exif-chip-value">${c.value}</span></div>`).join('');
}

function updateUI() {
  const n=state.items.length;
  fileListHeader.style.display=n?'':'none';
  fileCount.textContent=`${n}枚`;
  clearBtn.disabled=n===0;
  updateSelectionUI();
  if(n===0){
    previewEmpty.style.display='';
    previewContent.style.display='none';
    if(mobilePickArea) mobilePickArea.style.display='flex';
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportCurrent() {
  const item=state.items[state.current]; if(!item?.fullCanvas)return;
  downloadCanvas(item.fullCanvas, buildSaveName(item.file));
  showToast('ダウンロード開始','success');
}

async function exportBatch() {
  const targets=[...state.selected].sort((a,b)=>a-b).map(i=>state.items[i]).filter(i=>i?.fullCanvas);
  if(!targets.length)return;
  const prev=batchExportBtn.textContent;
  batchExportBtn.disabled=true; batchExportBtn.textContent='保存中…';
  for(const item of targets){downloadCanvas(item.fullCanvas,buildSaveName(item.file));await new Promise(r=>setTimeout(r,200));}
  batchExportBtn.disabled=false; batchExportBtn.textContent=prev;
  showToast(`${targets.length}枚をダウンロード開始`,'success');
}

// ── Re-render ─────────────────────────────────────────────────────────────────
async function reRenderAll() {
  for(let i=0;i<state.items.length;i++){
    const item=state.items[i];
    if(item.img){
      item.fullCanvas=await renderWatermark(item.img,item.exif,state.barStyle,state.template,state.fontScale,state.barScale);
      updateThumb(i);
      if(i===state.current){canvasLoading.classList.add('hidden');drawPreviewScaled(item.fullCanvas,document.querySelector('.canvas-scroll'));}
    }
  }
}

async function switchBarStyle(style) {
  if(state.barStyle===style)return;
  state.barStyle=style;
  barWhiteBtn.classList.toggle('active',style==='white');
  barBlackBtn.classList.toggle('active',style==='black');
  await reRenderAll();
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Desktop: drop zone
openBtn.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',e=>{loadFiles(Array.from(e.target.files));fileInput.value='';});
dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('drag-over');});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('drag-over');loadFiles(Array.from(e.dataTransfer.files));});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',e=>{e.preventDefault();loadFiles(Array.from(e.dataTransfer.files));});

// Mobile: initial pick area
// 🖼️ カメラロールから選択 → photo library (no capture)
pickLibraryBtn.addEventListener('click',()=>pickLibraryInput.click());
pickLibraryInput.addEventListener('change',e=>{loadFiles(Array.from(e.target.files));pickLibraryInput.value='';});
// 📸 カメラで撮影 → camera (capture=environment)
pickCameraBtn.addEventListener('click',()=>pickCameraInput.click());
pickCameraInput.addEventListener('change',e=>{loadFiles(Array.from(e.target.files));pickCameraInput.value='';});

// Mobile: drawer add buttons
drawerLibraryBtn.addEventListener('click',()=>drawerLibraryInput.click());
drawerLibraryInput.addEventListener('change',e=>{loadFiles(Array.from(e.target.files));drawerLibraryInput.value='';closeDrawer();});
drawerCameraBtn.addEventListener('click',()=>drawerCameraInput.click());
drawerCameraInput.addEventListener('change',e=>{loadFiles(Array.from(e.target.files));drawerCameraInput.value='';closeDrawer();});

// Clear / select all
clearBtn.addEventListener('click',()=>{state.items.length=0;state.current=0;state.selected.clear();fileList.innerHTML='';updateUI();updateNav();});
selectAllBtn.addEventListener('click',()=>{state.items.forEach((item,idx)=>{if(item.fullCanvas)toggleSelection(idx,true);});});
deselectAllBtn.addEventListener('click',()=>{[...state.selected].forEach(idx=>toggleSelection(idx,false));});

// Nav
prevBtn.addEventListener('click',()=>{if(state.current>0)showItem(state.current-1);});
nextBtn.addEventListener('click',()=>{if(state.current<state.items.length-1)showItem(state.current+1);});

// Bar style
barWhiteBtn.addEventListener('click',()=>switchBarStyle('white'));
barBlackBtn.addEventListener('click',()=>switchBarStyle('black'));

// Template / font / sliders
templateSelect.addEventListener('change',async()=>{state.template=Number(templateSelect.value);await reRenderAll();});
fontScaleSlider.addEventListener('input',async()=>{state.fontScale=fontScaleSlider.value/100;fontScaleValue.textContent=`${fontScaleSlider.value}%`;await reRenderAll();});
barScaleSlider.addEventListener('input',async()=>{state.barScale=barScaleSlider.value/100;barScaleValue.textContent=`${barScaleSlider.value}%`;await reRenderAll();});
fontSelect.addEventListener('change',async()=>{state.fontFamily=Number(fontSelect.value);currentFont=FONTS[state.fontFamily].value;await reRenderAll();});

// Params toggle (mobile)
paramsToggleBtn?.addEventListener('click',()=>{
  const open=paramsBar.classList.toggle('open');
  paramsToggleBtn.textContent=open?'⚙ 閉じる':'⚙ 設定';
});

// Export
exportBtn.addEventListener('click',exportCurrent);
batchExportBtn.addEventListener('click',exportBatch);

// Keyboard nav
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'&&!prevBtn.disabled)showItem(state.current-1);
  if(e.key==='ArrowRight'&&!nextBtn.disabled)showItem(state.current+1);
});

// Resize
let resizeTimer;
window.addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    const item=state.items[state.current];
    if(item?.fullCanvas)drawPreviewScaled(item.fullCanvas,document.querySelector('.canvas-scroll'));
  },100);
});

setInterval(()=>{
  const item=state.items[state.current];
  if(item?.fullCanvas&&canvasLoading&&!canvasLoading.classList.contains('hidden'))showItem(state.current);
},500);
