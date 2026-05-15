import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementAPI, productsAPI } from "../api";
import toast from "react-hot-toast";

export default function ProcurementPage() {
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [reqForm, setReqForm] = useState({ productId: "", quantity: 1 });
  const [supForm, setSupForm] = useState({
    name: "",
    phone: "",
    email: "",
    inn: "",
  });
  const [ordForm, setOrdForm] = useState({
    supplierId: "",
    orderNumber: "",
    totalAmount: 0,
  });

  const { data } = useQuery({
    queryKey: ["procurement"],
    queryFn: () => procurementAPI.getAll().then((r) => r.data),
  });
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsAPI.getAll().then((r) => r.data),
  });

  const createReq = useMutation({
    mutationFn: (d: any) => procurementAPI.createRequest(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      toast.success("Заявка создана");
      setShowRequestForm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const createSup = useMutation({
    mutationFn: (d: any) => procurementAPI.createSupplier(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      toast.success("Поставщик добавлен");
      setShowSupplierForm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const createOrd = useMutation({
    mutationFn: (d: any) => procurementAPI.createOrder(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      toast.success("Заказ создан");
      setShowOrderForm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Закупки и поставщики
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              Заявки ({data?.requests?.length || 0})
            </h2>
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="text-blue-600 text-sm hover:underline"
            >
              +
            </button>
          </div>
          {showRequestForm && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <select
                value={reqForm.productId}
                onChange={(e) =>
                  setReqForm({ ...reqForm, productId: e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="">Товар</option>
                {products?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={reqForm.quantity}
                placeholder="Кол-во"
                onChange={(e) =>
                  setReqForm({ ...reqForm, quantity: +e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => {
                  if (!reqForm.productId) return;
                  createReq.mutate(reqForm);
                }}
                className="w-full py-1.5 bg-blue-600 text-white rounded text-sm"
              >
                Создать
              </button>
            </div>
          )}
          {data?.requests?.map((r: any) => (
            <div key={r.id} className="p-3 bg-gray-50 rounded-lg mb-2 text-sm">
              <p className="font-medium">{r.product?.name}</p>
              <p className="text-gray-500">
                {r.quantity} шт · {r.status}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              Поставщики ({data?.suppliers?.length || 0})
            </h2>
            <button
              onClick={() => setShowSupplierForm(!showSupplierForm)}
              className="text-blue-600 text-sm hover:underline"
            >
              +
            </button>
          </div>
          {showSupplierForm && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <input
                placeholder="Название *"
                value={supForm.name}
                onChange={(e) =>
                  setSupForm({ ...supForm, name: e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <input
                placeholder="Телефон"
                value={supForm.phone}
                onChange={(e) =>
                  setSupForm({ ...supForm, phone: e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <input
                placeholder="Email"
                value={supForm.email}
                onChange={(e) =>
                  setSupForm({ ...supForm, email: e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <input
                placeholder="ИНН"
                value={supForm.inn}
                onChange={(e) =>
                  setSupForm({ ...supForm, inn: e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => {
                  if (!supForm.name) return;
                  createSup.mutate(supForm);
                }}
                className="w-full py-1.5 bg-green-600 text-white rounded text-sm"
              >
                Добавить
              </button>
            </div>
          )}
          {data?.suppliers?.map((s: any) => (
            <div key={s.id} className="p-3 bg-gray-50 rounded-lg mb-2 text-sm">
              <p className="font-medium">{s.name}</p>
              <p className="text-gray-500">{s.phone || "-"}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              Заказы ({data?.orders?.length || 0})
            </h2>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              className="text-blue-600 text-sm hover:underline"
            >
              +
            </button>
          </div>
          {showOrderForm && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <select
                value={ordForm.supplierId}
                onChange={(e) =>
                  setOrdForm({ ...ordForm, supplierId: e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="">Поставщик</option>
                {data?.suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Номер заказа *"
                value={ordForm.orderNumber}
                onChange={(e) =>
                  setOrdForm({ ...ordForm, orderNumber: e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <input
                placeholder="Сумма"
                type="number"
                value={ordForm.totalAmount}
                onChange={(e) =>
                  setOrdForm({ ...ordForm, totalAmount: +e.target.value })
                }
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => {
                  if (!ordForm.supplierId || !ordForm.orderNumber) return;
                  createOrd.mutate(ordForm);
                }}
                className="w-full py-1.5 bg-blue-600 text-white rounded text-sm"
              >
                Создать
              </button>
            </div>
          )}
          {data?.orders?.map((o: any) => (
            <div key={o.id} className="p-3 bg-gray-50 rounded-lg mb-2 text-sm">
              <p className="font-medium">{o.orderNumber}</p>
              <p className="text-gray-500">
                {o.supplier?.name} · {o.status}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
