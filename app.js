/**
 * Myanmar Voiceover Studio — app.js
 * Pipeline: Upload → Gemini 2.5 Flash Vision → Myanmar Script → TTS → FFmpeg WASM → Download
 */

// ─────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────
let selectedFile  = null;
let selectedTone  = 'friendly';
let selectedRatio = '16:9';
let outputBlob    = null;
let srtContent    = '';
let apiKey        = '';

// ─────────────────────────────────────────
//  TONE CONFIG
// ─────────────────────────────────────────
const TONE = {
  friendly: {
    gemini : 'warm, conversational, and approachable — use simple, welcoming language',
    rate   : 'medium',   pitch: '0st',
    gRate  : 1.0,        gPitch: 0,
  },
  professional: {
    gemini : 'formal, authoritative, and precise — use confident, clear language',
    rate   : 'slow',     pitch: '-2st',
    gRate  : 0.9,        gPitch: -2,
  },
  excited: {
    gemini : 'energetic, enthusiastic, and upbeat — use dynamic, expressive language',
    rate   : 'fast',     pitch: '+4st',
    gRate  : 1.2,        gPitch: 4,
  },
  storyteller: {
    gemini : 'narrative, descriptive, and engaging — use vivid imagery and rhythmic pacing',
    rate   : 'slow',     pitch: '+1st',
    gRate  : 0.88,       gPitch: 1,
  },
};

// ─────────────────────────────────────────
//  ASPECT RATIO → FFmpeg filter
// ─────────────────────────────────────────
const RATIO_FILTER = {
  '9:16' : 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
  '16:9' : 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
  '1:1'  : 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black',
};

// ─────────────────────────────────────────
//  DOM HELPERS
// ─────────────────────────────────────────
const $ = id => document.getElementById(id);

function setProgress(pct, label) {
  $('progressBar').style.width  = `${pct}%`;
  $('progressPct').textContent  = `${pct}%`;
  $('progressLabel').textContent = label;
}

function log(msg, type = 'default') {
  const c  = $('logConsole');
  const el = document.createElement('div');
  el.className = `log-entry ${type}`;

  const icons = { info: '◆', success: '✓', error: '✗', default: '›' };
  el.innerHTML = `<span class="icon">${icons[type] || '›'}</span><span>${msg}</span>`;
  c.appendChild(el);
  c.scrollTop = c.scrollHeight;
}

function setStep(n, status) {
  // status: 'active' | 'done' | 'idle'
  const el = $(`s${n}`);
  el.classList.remove('active', 'done');
  if (status !== 'idle') el.classList.add(status);
}

// ─────────────────────────────────────────
//  API KEY VALIDATION
// ─────────────────────────────────────────
export async function validateApiKey() {
  apiKey = $('geminiKey').value.trim();
  if (!apiKey) { log('Please enter an API key', 'error'); return; }

  try {
    log('Validating Gemini API key…', 'info');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    $('apiDot').className   = 'api-dot ok';
    $('apiLabel').textContent = 'Connected';
    log('Gemini API key validated ✓', 'success');
  } catch (e) {
    $('apiDot').className   = 'api-dot fail';
    $('apiLabel').textContent = 'Failed';
    log(`API validation failed: ${e.message}`, 'error');
  }
}

// ─────────────────────────────────────────
//  FILE HANDLING
// ─────────────────────────────────────────
export function handleFileSelect(e) {
  const f = e.target.files[0];
  if (f) applyFile(f);
}

export function handleDragOver(e) {
  e.preventDefault();
  $('uploadZone').classList.add('drag-over');
}

export function handleDragLeave() {
  $('uploadZone').classList.remove('drag-over');
}

export function handleDrop(e) {
  e.preventDefault();
  $('uploadZone').classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f && (f.type === 'video/mp4' || f.type === 'video/quicktime')) {
    applyFile(f);
  } else {
    log('Please drop an MP4 or MOV file', 'error');
  }
}

function applyFile(f) {
  selectedFile = f;
  $('uploadEmpty').classList.add('hidden');
  $('uploadFilled').classList.remove('hidden');
  $('fileName').textContent = f.name;
  $('fileSize').textContent = fmtBytes(f.size);
}

export function clearFile(e) {
  e.stopPropagation();
  selectedFile = null;
  $('uploadEmpty').classList.remove('hidden');
  $('uploadFilled').classList.add('hidden');
  $('fileInput').value = '';
}

function fmtBytes(b) {
  if (b < 1048576)        return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824)     return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

// ─────────────────────────────────────────
//  SELECTION HANDLERS
// ─────────────────────────────────────────
export function selectTone(tone) {
  selectedTone = tone;
  document.querySelectorAll('[data-tone]').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-tone="${tone}"]`).classList.add('active');
}

export function selectRatio(ratio) {
  selectedRatio = ratio;
  document.querySelectorAll('[data-ratio]').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-ratio="${ratio}"]`).classList.add('active');
}

// ─────────────────────────────────────────
//  MAIN PIPELINE
// ─────────────────────────────────────────
export async function startProcessing() {
  apiKey = $('geminiKey').value.trim();

  if (!apiKey)       { log('Please enter your Gemini API key', 'error'); return; }
  if (!selectedFile) { log('Please upload a video file first', 'error'); return; }

  const btn = $('processBtn');
  btn.disabled = true;
  btn.textContent = '⏳  Processing…';

  // Reset UI
  $('progressSection').classList.remove('hidden');
  $('scriptSection').classList.add('hidden');
  $('downloadSection').classList.add('hidden');
  $('logConsole').innerHTML = '';
  [1,2,3,4].forEach(n => setStep(n, 'idle'));

  try {
    // ── STEP 1: Upload video ──────────────────────────────
    setStep(1, 'active');
    setProgress(5, 'Uploading video to Gemini File API…');
    log('Starting resumable upload to Gemini…', 'info');

    const fileInfo = await uploadVideoToGemini(selectedFile, apiKey);
    log(`File created: ${fileInfo.name}`, 'success');

    setProgress(12, 'Waiting for Gemini to process video…');
    log('Polling until file state = ACTIVE…', 'info');
    const readyFile = await waitForActive(fileInfo.name, apiKey);
    log(`File ready (${readyFile.mimeType})`, 'success');
    setStep(1, 'done');

    // ── STEP 2: Gemini Vision → Myanmar Script + SRT ─────
    setStep(2, 'active');
    setProgress(28, 'Analyzing video with Gemini 1.5 Flash…');
    log(`Sending multimodal request (tone: ${selectedTone})…`, 'info');

    const analysis = await analyzeVideo(readyFile.uri, readyFile.mimeType, selectedTone, apiKey);
    srtContent = analysis.srt_content;

    log(`Script generated: ${analysis.myanmar_script.length} characters`, 'success');
    log(`SRT segments: ${(srtContent.match(/^\d+$/gm) || []).length}`, 'success');

    // Show script preview
    $('scriptSection').classList.remove('hidden');
    $('scriptText').textContent = analysis.myanmar_script;
    setStep(2, 'done');

    // ── STEP 3: TTS ───────────────────────────────────────
    setStep(3, 'active');
    setProgress(52, 'Generating Myanmar voiceover…');

    const engine = $('ttsEngine').value;
    let audioB64;

    if (engine === 'gcloud') {
      log('Attempting Google Cloud TTS (my-MM)…', 'info');
      audioB64 = await ttsGCloud(analysis.myanmar_script, selectedTone, apiKey);
    } else {
      log('Using Gemini 2.5 Flash audio output…', 'info');
      audioB64 = await ttsGemini(analysis.myanmar_script, selectedTone, apiKey);
    }

    log('Myanmar audio generated ✓', 'success');
    setStep(3, 'done');

    // ── STEP 4: FFmpeg WASM ────────────────────────────────
    setStep(4, 'active');
    setProgress(68, 'Loading FFmpeg WASM…');
    log('Initialising FFmpeg WASM (this may take ~30s first run)…', 'info');

    outputBlob = await renderWithFFmpeg(
      selectedFile, audioB64, srtContent, selectedRatio,
      (pct, label) => {
        const mapped = 68 + Math.round(pct * 0.30);
        setProgress(Math.min(mapped, 98), label);
        if (label) log(label, 'info');
      }
    );

    setStep(4, 'done');
    setProgress(100, 'Complete!');
    log('🎉  All done — video ready for download!', 'success');

    $('downloadSection').classList.remove('hidden');

  } catch (err) {
    log(`Error: ${err.message}`, 'error');
    console.error('[Myanmar Studio]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = '▶  Generate Myanmar Voiceover';
  }
}

// ─────────────────────────────────────────
//  STEP 1 — Gemini File API Upload
// ─────────────────────────────────────────
async function uploadVideoToGemini(file, key) {
  // Initiate resumable upload session
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`,
    {
      method : 'POST',
      headers: {
        'X-Goog-Upload-Protocol'             : 'resumable',
        'X-Goog-Upload-Command'              : 'start',
        'X-Goog-Upload-Header-Content-Length': String(file.size),
        'X-Goog-Upload-Header-Content-Type'  : file.type,
        'Content-Type'                       : 'application/json',
      },
      body: JSON.stringify({ file: { display_name: file.name } }),
    }
  );

  if (!initRes.ok) {
    const t = await initRes.text();
    throw new Error(`Upload init failed (${initRes.status}): ${t}`);
  }

  const uploadUrl = initRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini did not return an upload URL');

  // Upload the actual bytes
  const uploadRes = await fetch(uploadUrl, {
    method : 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset' : '0',
      'Content-Type'         : file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const t = await uploadRes.text();
    throw new Error(`File upload failed (${uploadRes.status}): ${t}`);
  }

  const data = await uploadRes.json();
  return data.file;   // { name, uri, mimeType, state, … }
}

// Poll until file.state === 'ACTIVE'
async function waitForActive(fileName, key, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${key}`);
    const info = await res.json();

    if (info.state === 'ACTIVE') return info;
    if (info.state === 'FAILED') throw new Error('Gemini file processing FAILED');

    await delay(3000);
  }
  throw new Error('File never became ACTIVE (timeout)');
}

// ─────────────────────────────────────────
//  STEP 2 — Gemini 1.5 Flash: Vision + Translation + SRT
// ─────────────────────────────────────────
async function analyzeVideo(fileUri, mimeType, tone, key) {
  const toneDesc = TONE[tone].gemini;

  const prompt = `You are an expert Myanmar (Burmese) language translator and certified subtitle editor.

Analyse this video completely and perform all three tasks below:

TASK 1 — TRANSCRIPTION
Carefully transcribe every word of spoken audio from the video.

TASK 2 — MYANMAR TRANSLATION
Translate the transcript into natural, fluent Myanmar (Burmese) with a ${toneDesc} tone.
- Use authentic Myanmar phrasing, NOT word-for-word literal translation.
- Preserve meaning, humour, idioms where possible.
- Use proper Myanmar punctuation: ။ ၊ etc.

TASK 3 — SRT SUBTITLES
Generate a complete SRT subtitle file in Myanmar language.
Rules for SRT:
  • Each cue: 2–7 seconds
  • Max 2 lines per cue, ~35 characters per line (Myanmar chars are wider)
  • Timing must match the original video precisely
  • Start from 00:00:00,000

Return ONLY a raw JSON object — no markdown, no code fences, no explanation:
{
  "original_transcript": "<original speech in source language>",
  "myanmar_script": "<complete Myanmar narration as a single prose block>",
  "srt_content": "<complete valid SRT file content>",
  "source_language": "<detected source language>",
  "video_description": "<1-sentence summary of what the video shows>"
}

Example SRT fragment (use Myanmar Unicode, not romanisation):
1
00:00:00,000 --> 00:00:03,500
မင်္ဂလာပါ ကျွန်တော်တို့ရဲ့ ချန်နယ်မှ
ကြိုဆိုပါတယ်

2
00:00:03,500 --> 00:00:07,000
ဒီနေ့ ကျွန်တော်တို့ အရေးကြီးသော
အကြောင်းအရာ တစ်ခုကို မျှဝေမှာပါ`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        contents: [{
          role : 'user',
          parts: [
            { file_data: { mime_type: mimeType || 'video/mp4', file_uri: fileUri } },
            { text: prompt },
          ],
        }],
        generation_config: { temperature: 0.25, max_output_tokens: 8192 },
      }),
    }
  );

  if (!res.ok) {
    const d = await res.json();
    throw new Error(`Gemini vision API error: ${d.error?.message || res.statusText}`);
  }

  const data = await res.json();
  if (!data.candidates?.[0]) throw new Error('Gemini returned no candidates');

  const raw = data.candidates[0].content.parts[0].text;

  // Extract JSON robustly
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Could not extract JSON from Gemini response:\n${raw.slice(0,400)}`);

  return JSON.parse(match[0]);
}

// ─────────────────────────────────────────
//  STEP 3a — Google Cloud TTS (my-MM)
// ─────────────────────────────────────────
async function ttsGCloud(text, tone, key) {
  const cfg = TONE[tone];

  const ssml = `<speak><prosody rate="${cfg.rate}" pitch="${cfg.pitch}">${escXml(text)}</prosody></speak>`;

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
    {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        input      : { ssml },
        voice      : { languageCode: 'my-MM', name: 'my-MM-Standard-A', ssmlGender: 'FEMALE' },
        audioConfig: {
          audioEncoding    : 'MP3',
          speakingRate     : cfg.gRate,
          pitch            : cfg.gPitch,
          effectsProfileId : ['headphone-class-device'],
        },
      }),
    }
  );

  if (!res.ok) {
    const d = await res.json();
    log(`Cloud TTS unavailable (${d.error?.message || res.status}) — falling back to Gemini audio`, 'info');
    return ttsGemini(text, tone, key);
  }

  const data = await res.json();
  if (!data.audioContent) throw new Error('Google TTS returned no audio');
  return data.audioContent;   // base64 MP3
}

// ─────────────────────────────────────────
//  STEP 3b — Gemini 2.0 Flash Audio (fallback TTS)
// ─────────────────────────────────────────
async function ttsGemini(text, tone, key) {
  const cfg = TONE[tone];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        system_instruction: {
          parts: [{ text: `You are a professional Myanmar (Burmese) voice narrator. Read the provided text aloud in Myanmar language with a ${cfg.gemini} tone. Speak clearly and naturally.` }],
        },
        contents: [{ role: 'user', parts: [{ text }] }],
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config      : { voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } } },
        },
      }),
    }
  );

  if (!res.ok) {
    const d = await res.json();
    throw new Error(`Gemini audio error: ${d.error?.message || res.statusText}`);
  }

  const data = await res.json();
  if (!data.candidates?.[0]) throw new Error('Gemini audio: no candidates');

  const part = data.candidates[0].content.parts.find(p => p.inline_data);
  if (!part) throw new Error('Gemini audio: no inline_data part found');

  return part.inline_data.data;   // base64 audio (WAV/PCM)
}

// ─────────────────────────────────────────
//  STEP 4 — FFmpeg WASM: Render
// ─────────────────────────────────────────
async function renderWithFFmpeg(videoFile, audioB64, srtText, ratio, onProgress) {
  // Dynamically import @ffmpeg packages from unpkg (ESM builds)
  const { FFmpeg }                = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/esm/index.js');
  const { fetchFile, toBlobURL }  = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');

  const ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    const pct = Math.round(Math.min(progress, 1) * 100);
    onProgress(pct, `Encoding… ${pct}%`);
  });

  // Load core (single-threaded; works without COOP/COEP on older hosts)
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  onProgress(2, 'Downloading FFmpeg WASM core…');
  await ffmpeg.load({
    coreURL : await toBlobURL(`${base}/ffmpeg-core.js`,   'text/javascript'),
    wasmURL : await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  onProgress(10, 'Writing video to virtual FS…');
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

  onProgress(14, 'Writing audio…');
  const audioBytes = Uint8Array.from(atob(audioB64), c => c.charCodeAt(0));
  await ffmpeg.writeFile('narration.mp3', audioBytes);

  // Convert SRT → ASS for rich Myanmar subtitle styling (bold, yellow)
  onProgress(16, 'Building ASS subtitles…');
  const assContent = srtToAss(srtText);
  await ffmpeg.writeFile('subs.ass', new TextEncoder().encode(assContent));

  // Attempt to load Padauk Bold font (proper Myanmar rendering)
  onProgress(18, 'Fetching Myanmar font (Padauk)…');
  let fontLoaded = false;
  try {
    const fontUrls = [
      'https://cdn.jsdelivr.net/gh/googlefonts/Padauk@main/fonts/ttf/Padauk-Bold.ttf',
      'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-myanmar/files/noto-sans-myanmar-myanmar-700-normal.woff',
    ];
    for (const url of fontUrls) {
      try {
        const fr = await fetch(url);
        if (!fr.ok) continue;
        const buf = await fr.arrayBuffer();
        await ffmpeg.createDir('/fonts');
        await ffmpeg.writeFile('/fonts/Padauk-Bold.ttf', new Uint8Array(buf));
        fontLoaded = true;
        log('Padauk Bold font loaded ✓', 'success');
        break;
      } catch { /* try next */ }
    }
  } catch { /* skip */ }

  if (!fontLoaded) log('Font load skipped — boxes may appear for Myanmar chars', 'info');

  onProgress(22, 'Running FFmpeg pipeline…');

  const scaleFilter = RATIO_FILTER[ratio];
  const assFilter   = fontLoaded
    ? 'ass=subs.ass:fontsdir=/fonts'
    : 'ass=subs.ass';
  const vf = `${scaleFilter},${assFilter}`;

  await ffmpeg.exec([
    '-i', 'input.mp4',        // original video
    '-i', 'narration.mp3',    // Myanmar TTS audio
    '-map', '0:v:0',          // keep original video track
    '-map', '1:a:0',          // replace audio with narration
    '-shortest',              // trim to shortest stream
    '-vf', vf,                // scale + subtitle burn-in
    '-c:v', 'libx264',
    '-preset', 'ultrafast',   // fast encode (acceptable for web output)
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart', // web-optimised MP4 atom placement
    'output.mp4',
  ]);

  onProgress(98, 'Reading output file…');
  const data = await ffmpeg.readFile('output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

// ─────────────────────────────────────────
//  SRT → ASS (Advanced SubStation Alpha)
//  Yellow bold Myanmar subtitles
// ─────────────────────────────────────────
function srtToAss(srt) {
  // ASS colour: &HAABBGGRR — Yellow = R=FF G=FF B=00 → &H0000FFFF
  const YELLOW = '&H0000FFFF';
  const BLACK  = '&H00000000';
  const TRANS  = '&H00000000';

  const header = `[Script Info]
Title: Myanmar Voiceover Studio
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Myanmar,Padauk,60,${YELLOW},${YELLOW},${BLACK},${TRANS},-1,0,0,0,100,100,0,0,1,3,1,2,30,30,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const blocks = srt.trim().split(/\n\n+/);
  const events = blocks.map(block => {
    const lines = block.trim().split('\n');
    const tIdx  = lines.findIndex(l => l.includes(' --> '));
    if (tIdx === -1) return null;

    const [s, e]   = lines[tIdx].split(' --> ');
    const textBody = lines.slice(tIdx + 1).join('\\N');

    return `Dialogue: 0,${toAss(s.trim())},${toAss(e.trim())},Myanmar,,0,0,0,,${textBody}`;
  }).filter(Boolean);

  return `${header}\n${events.join('\n')}`;
}

/** Convert SRT timestamp → ASS timestamp
 *  00:01:23,456  →  0:01:23.45  */
function toAss(srtTs) {
  const [hms, ms = '000'] = srtTs.split(',');
  const [h, m, s]         = hms.split(':');
  const cs = String(Math.floor(Number(ms) / 10)).padStart(2, '0');
  return `${Number(h)}:${m}:${s}.${cs}`;
}

// ─────────────────────────────────────────
//  DOWNLOAD
// ─────────────────────────────────────────
export function downloadVideo() {
  if (!outputBlob) return;
  const url = URL.createObjectURL(outputBlob);
  trigger(url, `myanmar-voiceover-${Date.now()}.mp4`);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function downloadSRT() {
  if (!srtContent) return;
  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  trigger(url, `myanmar-subs-${Date.now()}.srt`);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function trigger(url, name) {
  const a  = document.createElement('a');
  a.href   = url;
  a.download = name;
  a.click();
}

// ─────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────
function escXml(s) {
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────
//  INIT — wire globals for non-module HTML
// ─────────────────────────────────────────
window.validateApiKey  = validateApiKey;
window.handleFileSelect= handleFileSelect;
window.handleDragOver  = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop      = handleDrop;
window.clearFile       = clearFile;
window.selectTone      = selectTone;
window.selectRatio     = selectRatio;
window.startProcessing = startProcessing;
window.downloadVideo   = downloadVideo;
window.downloadSRT     = downloadSRT;

// Try to pre-load API key injected by Netlify function
(async () => {
  try {
    const r = await fetch('/.netlify/functions/get-config');
    if (r.ok) {
      const { geminiKey } = await r.json();
      if (geminiKey) {
        $('geminiKey').value = geminiKey;
        apiKey = geminiKey;
        log('API key loaded from server environment ✓', 'success');
        $('progressSection').classList.remove('hidden');
        await validateApiKey();
        $('progressSection').classList.add('hidden');
      }
    }
  } catch {
    // No Netlify function — user enters key manually (fine)
  }
})();
