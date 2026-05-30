import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { actionMessagesAPI, actionFilesAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

interface Props {
  clientId: string;
  actionId: string;
  actionTitle: string;
  onClose: () => void;
}

function FilePreviewModal({ file, onClose, token }: { file: any; onClose: () => void; token?: string | null }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const ext = file.fileName?.split(".").pop()?.toLowerCase() || "";
  const previewable = ["jpg", "jpeg", "png", "gif", "webp", "svg", "pdf", "txt", "csv", "json", "xml", "md", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);

  React.useEffect(() => {
    if (!previewable) {
      setLoading(false);
      return;
    }
    const url = file.downloadUrl || file.fileUrl;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    fetch(url, { headers })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.blob();
      })
      .then((blob) => {
        setBlobUrl(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [file, token]);

  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
  const isPdf = ext === "pdf";
  const isText = ["txt", "csv", "json", "xml", "md"].includes(ext);
  const isDocx = ["doc", "docx"].includes(ext);
  const isXlsx = ["xls", "xlsx"].includes(ext);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 truncate">{file.fileName}</h3>
          <div className="flex items-center gap-2">
<DownloadLink file={file} token={token} />
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500 ml-1">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-[300px] flex items-center justify-center">
          {loading && <p className="text-gray-400 text-sm">Загрузка...</p>}
          {error && <p className="text-red-500 text-sm">Ошибка загрузки файла</p>}
          {!loading && !error && !previewable && (
            <p className="text-gray-400 text-sm">Предпросмотр недоступен для этого типа файлов</p>
          )}
          {!loading && blobUrl && isImage && (
            <img src={blobUrl} alt={file.fileName} className="max-w-full max-h-[70vh] object-contain rounded" />
          )}
          {!loading && blobUrl && isPdf && (
            <embed src={blobUrl} type="application/pdf" className="w-full h-[70vh] rounded" />
          )}
          {!loading && blobUrl && isText && (
            <TextPreview url={blobUrl} token={token} />
          )}
        </div>
      </div>
    </div>
  );
}

function DocxPreview({ blobUrl, token }: { blobUrl: string; token?: string | null }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    fetch(blobUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        mammoth.convertToHtml({ arrayBuffer: buf })
          .then((result) => {
            setHtml(result.value);
            setLoading(false);
          })
          .catch(() => {
            setError(true);
            setLoading(false);
          });
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [blobUrl]);

  if (loading) return <p className="text-gray-400 text-sm">Загрузка...</p>;
  if (error) return <p className="text-red-500 text-sm">Ошибка чтения файла</p>;

  return (
    <div
      className="w-full text-sm text-gray-700 prose prose-sm max-h-[70vh] overflow-auto bg-white p-6 rounded border border-gray-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function XlsxPreview({ blobUrl, token }: { blobUrl: string; token?: string | null }) {
  const [sheets, setSheets] = useState<{ name: string; rows: any[][] }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    fetch(blobUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const wb = XLSX.read(buf, { type: "array" });
        const result = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
          return { name, rows };
        });
        setSheets(result);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [blobUrl]);

  if (loading) return <p className="text-gray-400 text-sm">Загрузка...</p>;
  if (error) return <p className="text-red-500 text-sm">Ошибка чтения файла</p>;
  if (sheets.length === 0) return <p className="text-gray-400 text-sm">Файл пуст</p>;

  const sheet = sheets[activeSheet];

  return (
    <div className="w-full max-h-[70vh] overflow-auto bg-white rounded border border-gray-200">
      {sheets.length > 1 && (
        <div className="flex gap-1 p-2 border-b border-gray-200 bg-gray-50">
          {sheets.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSheet(i)}
              className={`px-3 py-1.5 text-xs rounded ${i === activeSheet ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <table className="w-full text-xs">
        <tbody>
          {sheet.rows.map((row, ri) => (
            <tr key={ri} className={ri === 0 ? "bg-gray-100 font-semibold" : ""}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-gray-200 px-2 py-1 whitespace-nowrap">
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextPreview({ url, token }: { url: string; token?: string | null }) {
  const [text, setText] = useState("");
  React.useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    fetch(url, { headers }).then((r) => r.text()).then(setText).catch(() => setText("Ошибка чтения файла"));
  }, [url, token]);
  return (
    <pre className="w-full text-xs text-gray-700 whitespace-pre-wrap break-all max-h-[70vh] overflow-auto bg-gray-50 p-4 rounded">
      {text}
    </pre>
  );
}

function DownloadLink({ file, token }: { file: any; token?: string | null }) {
  const downloadUrl = token
    ? `${file.downloadUrl || file.fileUrl}?token=${encodeURIComponent(token)}`
    : file.downloadUrl || file.fileUrl;
  return (
    <a
      href={downloadUrl}
      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
    >
      Скачать
    </a>
  );
}

function DownloadLinkButton({ file, token }: { file: any; token?: string | null }) {
  const downloadUrl = token
    ? `${file.downloadUrl || file.fileUrl}?token=${encodeURIComponent(token)}`
    : file.downloadUrl || file.fileUrl;
  return (
    <a
      href={downloadUrl}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
    >
      Скачать и открыть
    </a>
  );
}

export default function ActionContextPanel({ clientId, actionId, actionTitle, onClose }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<"chat" | "files">("chat");
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: messages } = useQuery({
    queryKey: ["action-messages", clientId, actionId],
    queryFn: () => actionMessagesAPI.getByAction(clientId, actionId).then((r) => r.data),
    enabled: tab === "chat",
  });

  const { data: files } = useQuery({
    queryKey: ["action-files", clientId, actionId],
    queryFn: () => actionFilesAPI.getByAction(clientId, actionId).then((r) => r.data),
    enabled: tab === "files",
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => actionMessagesAPI.send(clientId, actionId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-messages", clientId, actionId] });
      setNewMessage("");
    },
    onError: () => toast.error("Ошибка отправки"),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => actionFilesAPI.upload(clientId, actionId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-files", clientId, actionId] });
      toast.success("Файл загружен");
    },
    onError: () => toast.error("Ошибка загрузки"),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => actionFilesAPI.delete(clientId, actionId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-files", clientId, actionId] });
      toast.success("Файл удалён");
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white shadow-xl h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{actionTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500 ml-2">
            ✕
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-4">
          <button
            onClick={() => setTab("chat")}
            className={`py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "chat" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Чат
          </button>
          <button
            onClick={() => setTab("files")}
            className={`py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "files" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Файлы
          </button>
        </div>

        {tab === "chat" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!messages || messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center pt-8">Нет сообщений</p>
              ) : (
                messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        msg.senderId === user?.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`text-[10px] mt-0.5 ${
                          msg.senderId === user?.id ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        {msg.sender?.firstName} {msg.sender?.lastName} ·{" "}
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-gray-200 flex gap-2">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Сообщение..."
              />
              <button
                type="submit"
                disabled={sendMutation.isPending || !newMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                Отправить
              </button>
            </form>
          </div>
        )}

        {tab === "files" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3 border-b border-gray-200">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-sm text-gray-500">
                <input type="file" onChange={handleFileUpload} className="hidden" />
                + Загрузить файл
              </label>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {!files || files.length === 0 ? (
                <p className="text-sm text-gray-400 text-center pt-8">Нет файлов</p>
              ) : (
                files.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        onClick={() => setPreviewFile(f)}
                        className="text-sm text-blue-600 hover:underline truncate text-left"
                      >
                        {f.fileName}
                      </button>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <a
                        href={typeof window !== "undefined" && localStorage.getItem("token") ? `${f.downloadUrl || f.fileUrl}?token=${encodeURIComponent(localStorage.getItem("token") || "")}` : f.downloadUrl || f.fileUrl}
                        className="p-1 hover:bg-gray-200 rounded text-gray-500"
                        title="Скачать"
                      >
                        ⬇
                      </a>
                      <button
                        onClick={() => {
                          if (confirm("Удалить файл?")) deleteFileMutation.mutate(f.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-500 ml-1"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            token={typeof window !== "undefined" ? localStorage.getItem("token") : undefined}
          />
        )}
      </div>
    </div>
  );
}
