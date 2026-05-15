import React from "react";
import { useQuery } from "@tanstack/react-query";
import { auditAPI } from "../api";

export default function AuditPage() {
  const { data: logs } = useQuery({
    queryKey: ["audit"],
    queryFn: () => auditAPI.getAll().then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Журнал событий</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Действие
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Сущность
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Пользователь
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Дата
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs?.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.action === "CREATE"
                        ? "bg-green-100 text-green-700"
                        : log.action === "UPDATE" ||
                            log.action === "STATUS_CHANGE"
                          ? "bg-blue-100 text-blue-700"
                          : log.action === "DELETE" || log.action === "ARCHIVE"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {log.entityType} #{log.entityId.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {log.user
                    ? `${log.user.firstName} ${log.user.lastName}`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
