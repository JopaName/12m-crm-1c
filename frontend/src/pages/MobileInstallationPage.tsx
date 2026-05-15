import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { installationAPI } from "../api";
import toast from "react-hot-toast";

export default function MobileInstallationPage() {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["installation"],
    queryFn: () => installationAPI.getAll().then((r) => r.data),
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      installationAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation"] });
      toast.success("Статус обновлён");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        Загрузка...
      </div>
    );
  }

  const myTasks = tasks?.filter((t: any) => t.status !== "Completed") || [];

  if (myTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <span className="text-5xl mb-4">✅</span>
        <p className="text-lg font-medium">Нет активных задач</p>
        <p className="text-sm">Все монтажи выполнены</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Мои монтажи</h1>

      <div className="space-y-4">
        {myTasks.map((t: any) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-800 text-lg">
                  {t.deal?.dealNumber || "Без номера"}
                </p>
                <p className="text-sm text-gray-500">
                  {t.deal?.client?.name || "—"}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                  t.status === "InProgress"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {t.status === "InProgress" ? "В работе" : "Запланирован"}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {new Date(t.installDate).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            {t.notes && (
              <p className="text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg">
                {t.notes}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {t.status === "Scheduled" && (
                <button
                  onClick={() =>
                    updateMutation.mutate({
                      id: t.id,
                      data: { status: "InProgress" },
                    })
                  }
                  className="flex-1 min-w-[120px] py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold active:bg-blue-700 transition-colors"
                >
                  ▶ Начать
                </button>
              )}

              {t.status === "InProgress" && (
                <>
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: t.id,
                        data: { status: "Completed" },
                      })
                    }
                    className="flex-1 min-w-[120px] py-4 bg-green-600 text-white rounded-xl text-lg font-semibold active:bg-green-700 transition-colors"
                  >
                    ✓ Завершить
                  </button>
                  <button
                    onClick={() => toast.success("Фото добавлено (заглушка)")}
                    className="py-4 px-5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium active:bg-gray-200 transition-colors"
                  >
                    📷 Фото
                  </button>
                  <button
                    onClick={() => toast.success("GPS отправлены (заглушка)")}
                    className="py-4 px-5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium active:bg-gray-200 transition-colors"
                  >
                    📍 GPS
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
