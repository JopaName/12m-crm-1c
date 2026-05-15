import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { clientsAPI } from "../api";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => clientsAPI.getById(id!).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading)
    return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
  if (!client)
    return (
      <div className="text-center py-8 text-gray-400">Клиент не найден</div>
    );

  return (
    <div>
      <button
        onClick={() => navigate("/clients")}
        className="text-blue-600 text-sm mb-4 hover:underline"
      >
        ← Назад к клиентам
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{client.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Информация</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Телефон:</span>{" "}
              <span className="text-gray-800">{client.phone || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>{" "}
              <span className="text-gray-800">{client.email || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">ИНН:</span>{" "}
              <span className="text-gray-800">{client.inn || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">Юр. адрес:</span>{" "}
              <span className="text-gray-800">
                {client.legalAddress || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            Сделки ({client.deals?.length || 0})
          </h2>
          <div className="space-y-2">
            {client.deals?.map((deal: any) => (
              <div key={deal.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-800">{deal.dealNumber}</p>
                <p className="text-gray-500">
                  {deal.status} · {deal.expectedAmount?.toLocaleString()} ₽
                </p>
              </div>
            )) || <p className="text-gray-400 text-sm">Нет сделок</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            Документы ({client.legalDocuments?.length || 0})
          </h2>
          <div className="space-y-2">
            {client.legalDocuments?.map((doc: any) => (
              <div key={doc.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-800">{doc.documentType}</p>
                <p className="text-gray-500">{doc.status}</p>
              </div>
            )) || <p className="text-gray-400 text-sm">Нет документов</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
