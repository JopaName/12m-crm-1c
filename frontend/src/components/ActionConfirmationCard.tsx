import React from "react";

interface Props {
  action: string;
  payload: Record<string, any>;
  onConfirm: () => void;
  onCancel: () => void;
}

const actionLabels: Record<string, string> = {
  # removed,
  update_deal_status: "Обновить статус сделки",
  create_task: "Создать задачу",
};

export default function ActionConfirmationCard({ action, payload, onConfirm, onCancel }: Props) {
  const label = actionLabels[action] || action;

  return (
    <div className="bg-white rounded-lg border border-yellow-300 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800">{label}</h4>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {Object.entries(payload).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-gray-400 capitalize">{key}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Отмена
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Подтвердить
        </button>
      </div>
    </div>
  );
}
