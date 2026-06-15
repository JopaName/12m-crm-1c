import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Download, FileText, File, Image, Film, Music, Archive, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, RotateCw
} from "lucide-react";
import {
  fetchFileWithAuth, formatFileSize, categorizeFile, getFileExtension,
  FileCategory, FileFetchResult, AppFileError, isUnsafePreview
} from "../utils/fetchFile";

interface FilePreviewModalProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

interface DocxPreviewProps {
  blob: Blob;
  fileName: string;
}

function DocxPreviewComponent({ blob, fileName }: DocxPreviewProps) {
  var containerRef = useRef<HTMLDivElement>(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      var mammoth = (window as any).mammoth;
      if (!mammoth) {
        import("mammoth").then(function(mod) {
          renderDocx(mod, containerRef.current!, blob, setLoading, setError);
        }).catch(function() {
          setError(true);
          setLoading(false);
        });
      } else {
        renderDocx(mammoth, containerRef.current, blob, setLoading, setError);
      }
    } catch (e) {
      setError(true);
      setLoading(false);
    }
  }, [blob]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (error) return <FallbackPreview fileName={fileName} blob={blob} message="???? ?????????????? ???????????????????? ????????????????" />;
  return <div ref={containerRef} className="w-full max-h-[70vh] overflow-auto bg-white p-6 rounded border border-gray-200 prose prose-sm max-w-none" />;
}

function renderDocx(mod: any, container: HTMLDivElement, blob: Blob, setLoading: (v: boolean) => void, setError: (v: boolean) => void) {
  var reader = new FileReader();
  reader.onload = function() {
    var arrayBuffer = reader.result as ArrayBuffer;
    mod.convertToHtml({ arrayBuffer: arrayBuffer })
      .then(function(result: any) {
        container.innerHTML = result.value || "<p>???????????? ????????????????</p>";
        setLoading(false);
      })
      .catch(function() {
        setError(true);
        setLoading(false);
      });
  };
  reader.onerror = function() {
    setError(true);
    setLoading(false);
  };
  reader.readAsArrayBuffer(blob);
}

interface XlsxPreviewProps {
  blob: Blob;
  fileName: string;
}

function XlsxPreviewComponent({ blob, fileName }: XlsxPreviewProps) {
  var [sheets, setSheets] = useState<Array<{ name: string; rows: any[][] }>>([]);
  var [activeSheet, setActiveSheet] = useState(0);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);

  useEffect(() => {
    try {
      var XLSX = (window as any).XLSX;
      if (!XLSX) {
        import("xlsx").then(function(mod) {
          renderXLSX(mod, blob, setSheets, setLoading, setError);
        }).catch(function() {
          setError(true);
          setLoading(false);
        });
      } else {
        renderXLSX(XLSX, blob, setSheets, setLoading, setError);
      }
    } catch (e) {
      setError(true);
      setLoading(false);
    }
  }, [blob]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (error) return <FallbackPreview fileName={fileName} blob={blob} message="???? ?????????????? ???????????????????? ??????????????" />;
  if (sheets.length === 0) return <div className="text-gray-400 text-sm py-8 text-center">???????? ????????</div>;

  var sheet = sheets[activeSheet];

  return (
    <div className="w-full max-h-[70vh] overflow-auto bg-white rounded border border-gray-200">
      {sheets.length > 1 && (
        <div className="flex gap-1 p-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 flex-wrap">
          {sheets.map(function(s, i) {
            return (
              <button key={i}
                onClick={function() { setActiveSheet(i); }}
                className={"px-3 py-1.5 text-xs rounded " + (i === activeSheet ? "bg-primary-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100")}>
                {s.name}
              </button>
            );
          })}
        </div>
      )}
      <table className="w-full text-xs">
        <tbody>
          {sheet.rows.map(function(row, ri) {
            return (
              <tr key={ri} className={ri === 0 ? "bg-gray-100 font-semibold" : ""}>
                {row.map(function(cell, ci) {
                  return (
                    <td key={ci} className="border border-gray-200 px-2 py-1 whitespace-nowrap">
                      {String(cell ?? "")}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderXLSX(mod: any, blob: Blob, setSheets: any, setLoading: (v: boolean) => void, setError: (v: boolean) => void) {
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var wb = mod.read(reader.result, { type: "array" });
      var result = wb.SheetNames.map(function(name: string) {
        var ws = wb.Sheets[name];
        var rows = mod.utils.sheet_to_json(ws, { header: 1, defval: "" });
        return { name: name, rows: rows };
      });
      setSheets(result);
      setLoading(false);
    } catch (e) {
      setError(true);
      setLoading(false);
    }
  };
  reader.onerror = function() {
    setError(true);
    setLoading(false);
  };
  reader.readAsArrayBuffer(blob);
}

function FallbackPreview({ fileName, blob, message }: { fileName: string; blob?: Blob; message: string }) {
  var ext = getFileExtension(fileName);
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <File className="w-16 h-16 text-gray-300 mb-4" />
      <p className="text-sm text-gray-500 mb-1">{message}</p>
      <p className="text-xs text-gray-400">.{ext} ?? {blob ? formatFileSize(blob.size) : ""}</p>
    </div>
  );
}

function OtherFilePreview({ fileName, fileSize }: { fileName: string; fileSize: number }) {
  var ext = getFileExtension(fileName).toUpperCase() || "?";
  var iconMap: Record<string, React.ReactNode> = {
    ZIP: <Archive className="w-12 h-12 text-amber-500" />,
    RAR: <Archive className="w-12 h-12 text-amber-600" />,
    "7Z": <Archive className="w-12 h-12 text-amber-700" />,
    EXE: <FileText className="w-12 h-12 text-gray-500" />,
    PSD: <Image className="w-12 h-12 text-blue-500" />,
    DWG: <FileText className="w-12 h-12 text-red-500" />,
    AI: <FileText className="w-12 h-12 text-orange-500" />,
  };
  var icon = iconMap[ext] || <File className="w-12 h-12 text-gray-400" />;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="mb-4">{icon}</div>
      <p className="text-sm font-medium text-gray-700 mb-1">.{ext}</p>
      <p className="text-xs text-gray-400 mb-4">{formatFileSize(fileSize)}</p>
      <p className="text-xs text-gray-400">???????????????????????? ???????????????????? ?????? ?????????? ???????? ????????????</p>
    </div>
  );
}

function UnsafeFilePreview({ fileName, fileSize, mimeType }: { fileName: string; fileSize: number; mimeType: string }) {
  var ext = getFileExtension(fileName).toUpperCase() || "?";
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
      <h4 className="text-sm font-semibold text-gray-700 mb-1">????????????? ??? ???????????????????? ????????????????</h4>
      <p className="text-xs text-gray-400 text-center max-w-md mb-1">
        ???? ??? ?????????? ?????? ??? ????????? ??????? ????????????????????? ?????? ? ??? ??????????????? ????????? ?????????? ? ??? ???????????? ??????. ???????????????? ???????? ??? ?????????? ??????????????.
      </p>
      <p className="text-xs text-gray-400">.{ext} ?? {formatFileSize(fileSize)}</p>
    </div>
  );
}

export default function FilePreviewModal({ fileUrl, fileName, onClose }: FilePreviewModalProps) {
  var [result, setResult] = useState<FileFetchResult | null>(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState<string | null>(null);
  var [blobUrl, setBlobUrl] = useState<string | null>(null);
  var [zoom, setZoom] = useState(1);
  var [rotation, setRotation] = useState(0);
  var [page, setPage] = useState(0);
  var [showToolbar, setShowToolbar] = useState(true);

  var category = result ? categorizeFile(result.mimeType, result.fileName) : null;
  var ext = getFileExtension(fileName);

  var loadFile = useCallback(function() {
    setLoading(true);
    setError(null);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }

    fetchFileWithAuth(fileUrl)
      .then(function(r) {
        setResult(r);
        var url = URL.createObjectURL(r.blob);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(function(err) {
        if (err instanceof AppFileError) {
          if (err.statusCode === 401) {
            setError("?????????? ???????????? ??????? ??????????????????. ???????????????????? ??????????.");
            return;
          }
          setError(err.message);
        } else {
          setError("???????????? ???????????????? ??????????");
        }
        setLoading(false);
      });
  }, [fileUrl]);

  useEffect(function() {
    loadFile();
    return function() {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, []);

  useEffect(function() {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return function() { document.removeEventListener("keydown", handleKey); };
  }, [onClose]);

  var handleDownload = function() {
    if (!result) return;
    var a = document.createElement("a");
    a.href = URL.createObjectURL(result.blob);
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
  };

  var content: React.ReactNode = null;

  if (loading) {
    content = (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-3" />
        <p className="text-sm text-gray-400">????????????????...</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={loadFile} className="mt-4 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          ??????????????????
        </button>
      </div>
    );
  } else if (result && blobUrl) {
    var unsafe = isUnsafePreview(result.mimeType, result.fileName);
    if (unsafe) {
      content = <UnsafeFilePreview fileName={result.fileName} fileSize={result.fileSize} mimeType={result.mimeType} />;
    } else if (category === "image") {
      content = (
        <div className="flex items-center justify-center overflow-auto" style={{ maxHeight: "calc(70vh - 40px)" }}>
          <img
            src={blobUrl}
            alt={result.fileName}
            className="object-contain transition-transform duration-200"
            style={{ transform: "scale(" + zoom + ") rotate(" + rotation + "deg)", maxWidth: "100%" }}
          />
        </div>
      );
    } else if (category === "pdf") {
      content = (
        <iframe
          src={blobUrl + "#toolbar=1"}
          className="w-full h-[70vh] rounded"
          title={result.fileName}
        />
      );
    } else if (category === "docx") {
      content = <DocxPreviewComponent blob={result.blob} fileName={result.fileName} />;
    } else if (category === "xlsx") {
      content = <XlsxPreviewComponent blob={result.blob} fileName={result.fileName} />;
    } else if (category === "text") {
      content = <TextPreviewComponent blob={result.blob} />;
    } else if (category === "video") {
      content = (
        <video controls className="max-w-full max-h-[70vh] rounded" src={blobUrl}>
          ?????? ?????????????? ???? ???????????????????????? ??????????
        </video>
      );
    } else if (category === "audio") {
      content = (
        <div className="flex flex-col items-center justify-center py-8">
          <Music className="w-16 h-16 text-gray-300 mb-4" />
          <audio controls className="w-full max-w-md" src={blobUrl}>
            ?????? ?????????????? ???? ???????????????????????? ??????????
          </audio>
        </div>
      );
    } else if (category === "archive") {
      content = <OtherFilePreview fileName={result.fileName} fileSize={result.fileSize} />;
    } else {
      content = <OtherFilePreview fileName={result.fileName} fileSize={result.fileSize} />;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col mx-4" onClick={function(e) { e.stopPropagation(); }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <File className="w-4 h-4 text-primary-500 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-800 truncate">{fileName || result?.fileName || "????????"}</h3>
            {result && (
              <span className="text-[11px] text-gray-400 shrink-0">{formatFileSize(result.fileSize)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {category === "image" && (
              <>
                <button onClick={function() { setZoom(function(z) { return Math.min(z + 0.25, 3); }); }}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="????????????????????"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={function() { setZoom(function(z) { return Math.max(z - 0.25, 0.25); }); }}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="????????????????"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={function() { setRotation(function(r) { return r + 90; }); }}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="??????????????????"><RotateCw className="w-4 h-4" /></button>
                <button onClick={function() { setZoom(1); setRotation(0); }}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="????????????????"><Maximize className="w-4 h-4" /></button>
                <span className="w-px h-4 bg-gray-200 mx-1" />
              </>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs font-medium transition-colors"
              title="??????????????"
            >
              <Download className="w-3.5 h-3.5" />??????????????
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 ml-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 min-h-[300px] bg-gray-50/50">
          {content}
        </div>
      </div>
    </div>
  );
}

function TextPreviewComponent({ blob }: { blob: Blob }) {
  var [text, setText] = useState("");
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var reader = new FileReader();
    reader.onload = function() { setText(reader.result as string || ""); setLoading(false); };
    reader.onerror = function() { setText("???????????? ???????????? ??????????"); setLoading(false); };
    reader.readAsText(blob);
  }, [blob]);

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <pre className="w-full text-xs text-gray-700 whitespace-pre-wrap break-all max-h-[70vh] overflow-auto bg-white p-4 rounded border border-gray-200 font-mono">
      {text}
    </pre>
  );
}
