import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import SignatureCanvas from 'react-signature-canvas';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import toast from 'react-hot-toast';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const TEXT_EXT = ['txt', 'csv', 'json', 'xml', 'md', 'yaml', 'yml', 'ini', 'cfg', 'log', 'env', 'sh', 'bat', 'ps1', 'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'css', 'scss', 'less', 'html', 'htm', 'sql', 'go', 'rust'];
const OFFICE_EXT = ['doc', 'docx', 'xls', 'xlsx'];
const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
  py: 'python', rb: 'ruby', php: 'php', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
  css: 'css', scss: 'scss', less: 'less', html: 'html', htm: 'html',
  json: 'json', xml: 'xml', md: 'markdown', yaml: 'yaml', yml: 'yaml',
  sh: 'shell', bat: 'bat', ps1: 'powershell',
  sql: 'sql', go: 'go', rust: 'rust',
};

function getLang(ext: string): string {
  return LANG_MAP[ext] || 'plaintext';
}

export default function FilePreviewModal({ file, onClose, token }: { file: any; onClose: () => void; token?: string | null }) {
  const ext = file.fileName?.split('.').pop()?.toLowerCase() || '';
  const isText = TEXT_EXT.includes(ext);
  const isOffice = OFFICE_EXT.includes(ext);
  const isImage = IMG_EXT.includes(ext);
  const isPdf = ext === 'pdf';
  const isPython = ext === 'py';

  const baseUrl = file.downloadUrl || file.fileUrl || ('/api/files/download/' + file.id);
  const authUrl = token ? baseUrl + '?token=' + encodeURIComponent(token) : baseUrl;

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [officeHtml, setOfficeHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState('');
  const [saving, setSaving] = useState(false);

  const [pyOut, setPyOut] = useState<string | null>(null);
  const [pyRunning, setPyRunning] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);

  useEffect(() => {
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = 'Bearer ' + token;
    const ext2 = file.fileName?.split('.').pop()?.toLowerCase() || '';
    const isDoc = ['doc', 'docx'].includes(ext2);
    const isXls = ['xls', 'xlsx'].includes(ext2);
    const isOfficeFile = isDoc || isXls;

    fetch(authUrl, { headers: h })
      .then(async (r) => {
        if (!r.ok) throw Error();
        if (isText) return { type: 'text', data: await r.text() };
        if (isOfficeFile) return { type: 'office', data: await r.arrayBuffer(), isDoc, isXls };
        return { type: 'blob', data: await r.blob() };
      })
      .then(async (d: any) => {
        if (d.type === 'text') { setContent(d.data); setEdited(d.data); }
        else if (d.type === 'office') {
          try {
            if (d.isDoc) {
              const result = await mammoth.convertToHtml({ arrayBuffer: d.data });
              setOfficeHtml(result.value);
            } else {
              const wb = XLSX.read(d.data, { type: 'array' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              if (ws) {
                const html = XLSX.utils.sheet_to_html(ws);
                const styledHtml = '<div class="xlsx-table"><style>'
                  + '.xlsx-table table { border-collapse: collapse; width: 100%; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }'
                  + '.xlsx-table table td, .xlsx-table table th { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; white-space: nowrap; }'
                  + '.xlsx-table table th { background: #f3f4f6; font-weight: 600; color: #374151; }'
                  + '.xlsx-table table tr:nth-child(even) { background-color: #f9fafb; }'
                  + '.xlsx-table table tr:hover { background-color: #e5e7eb; }'
                  + '</style>' + html + '</div>';
                setOfficeHtml(styledHtml);
              } else {
                setError(true);
              }
            }
          } catch {
            setError(true);
          }
          setLoading(false);
        }
        else { setBlobUrl(URL.createObjectURL(d.data)); setLoading(false); }
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [file, token]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const fd = new FormData();
    fd.append('file', new Blob([edited], { type: 'text/plain' }), file.fileName);
    try {
      const h: Record<string, string> = {};
      if (token) h['Authorization'] = 'Bearer ' + token;
      const r = await fetch('/api/files/' + file.id, { method: 'PUT', headers: h, body: fd });
      if (!r.ok) throw Error();
      setContent(edited);
      setEditing(false);
      toast.success('Saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [edited, file, token]);

  const handleRunPython = useCallback(async () => {
    setPyRunning(true);
    setPyOut(null);
    try {
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = 'Bearer ' + token;
      const r = await fetch('/api/files/execute', { method: 'POST', headers: h, body: JSON.stringify({ code: editing ? edited : content }) });
      const d = await r.json();
      if (d.error) setPyOut('Error: ' + d.error);
      else setPyOut((d.stdout || '') + (d.stderr ? '\nStderr:\n' + d.stderr : '') + '\nExit code: ' + d.exitCode);
    } catch {
      setPyOut('Network error');
    } finally {
      setPyRunning(false);
    }
  }, [editing, edited, content, token]);

  const handleSaveImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
    );
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setSaving(true);
      const fd = new FormData();
      fd.append('file', blob, file.fileName);
      try {
        const h: Record<string, string> = {};
        if (token) h['Authorization'] = 'Bearer ' + token;
        const r = await fetch('/api/files/' + file.id, { method: 'PUT', headers: h, body: fd });
        if (!r.ok) throw Error();
        toast.success('Saved');
      } catch {
        toast.error('Save failed');
      } finally {
        setSaving(false);
      }
    }, 'image/png');
  }, [completedCrop, file, token]);

  const handleSaveSignature = useCallback(async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    const dataUrl = sigRef.current.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    setSaving(true);
    const fd = new FormData();
    fd.append('file', blob, 'signature.png');
    try {
      const h: Record<string, string> = {};
      if (token) h['Authorization'] = 'Bearer ' + token;
      const r = await fetch('/api/files/' + file.id, { method: 'PUT', headers: h, body: fd });
      if (!r.ok) throw Error();
      toast.success('Signature saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [file, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 truncate">{file.fileName}</h3>
          <div className="flex items-center gap-2">
            {isText && !editing && (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs">Edit</button>
            )}
            {isText && editing && (
              <>
                <button onClick={() => { setEdited(content); setEditing(false); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs">{saving ? 'Saving...' : 'Save'}</button>
              </>
            )}
            {isImage && completedCrop && (
              <button onClick={handleSaveImage} disabled={saving} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs">{saving ? 'Saving...' : 'Save Crop'}</button>
            )}
            {isPdf && (
              <button onClick={handleSaveSignature} disabled={saving} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs">{saving ? 'Saving...' : 'Save Signature'}</button>
            )}
            {isPython && (
              <button onClick={handleRunPython} disabled={pyRunning} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs">{pyRunning ? 'Running...' : 'Run Code'}</button>
            )}
            <a href={authUrl} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs">Download</a>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500 ml-1">X</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-[300px] flex items-center justify-center">
          {loading && <p className="text-gray-400 text-sm">Loading...</p>}
          {error && <p className="text-red-500 text-sm">Failed to load file</p>}

          {!loading && !error && isText && (
            <div className="w-full h-[65vh] border border-gray-200 rounded overflow-hidden">
              <Editor
                height="100%"
                language={getLang(ext)}
                value={editing ? edited : content}
                onChange={(val) => { if (editing) setEdited(val || ''); }}
                options={{
                  readOnly: !editing,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          )}

          {!loading && !error && isPython && pyOut !== null && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-900 text-green-400 text-xs p-3 max-h-32 overflow-auto font-mono">
              {pyOut}
            </div>
          )}

          {!loading && !error && isOffice && (
            <div className="w-full h-[65vh] border border-gray-200 rounded overflow-auto bg-white p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: officeHtml || '<p class="text-gray-400">Failed to render preview</p>' }}
            />
          )}

          {!loading && !error && isImage && blobUrl && (
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
              <img ref={imgRef} src={blobUrl} alt={file.fileName} className="max-w-full max-h-[65vh] object-contain" />
            </ReactCrop>
          )}

          {!loading && !error && isPdf && blobUrl && (
            <div className="w-full relative">
              <embed src={blobUrl} type="application/pdf" className="w-full h-[65vh] rounded border border-gray-200" />
              <div className="mt-4 border border-gray-200 rounded p-2 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">Signature</p>
                <SignatureCanvas ref={sigRef} penColor="black" canvasProps={{ className: 'w-full h-32 border border-gray-300 rounded bg-white' }} />
                <button onClick={() => sigRef.current?.clear()} className="mt-1 text-xs text-gray-500 hover:text-gray-700">Clear</button>
              </div>
            </div>
          )}

          {!loading && !error && !isText && !isOffice && !isImage && !isPdf && (
            <p className="text-gray-400 text-sm">Preview not available for this file type</p>
          )}
        </div>
      </div>
    </div>
  );
}
