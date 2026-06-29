import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardAPI, dealsAPI, referralAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import AiDashboardView from "../components/AiDashboardView";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: myDealsData } = useQuery({ queryKey: ["deals"], queryFn: () => dealsAPI.getAll().then(r => r.data || r) });
  const dealsList = Array.isArray(myDealsData) ? myDealsData : (myDealsData?.data || []);
  const PST = ["Lead_Created", "Invoice_Generation", "Legal_Review", "Doc_Sending", "Waiting_Payment", "Paid_And_Reserved", "Issuing_Goods", "Deal_Closed"];
  const PSL: Record<string, string> = { Lead_Created: "Лид", Invoice_Generation: "Счёт", Legal_Review: "Юристы", Doc_Sending: "Документы", Waiting_Payment: "Оплата", Paid_And_Reserved: "Резерв", Issuing_Goods: "Отгрузка", Deal_Closed: "Закрыто" };
  const pipelineData = PST.map(s => {
    const stageDeals = dealsList.filter((d: any) => d.status === s);
    const total = stageDeals.reduce((sum: number, d: any) => sum + (d.expectedAmount || 0), 0);
    return { status: s, label: PSL[s], count: stageDeals.length, total };
  });
  const myDeals = dealsList;
  const myActive = myDeals.filter((d: any) => d.status !== "Deal_Closed" && d.responsibleAgentId === (user?.id || ""));
  const myClosed = myDeals.filter((d: any) => d.status === "Deal_Closed" && d.responsibleAgentId === (user?.id || ""));
  const myAmount = myActive.reduce((s: number, d: any) => s + (d.expectedAmount || 0), 0);
  const { data: myEarnings } = useQuery({ queryKey: ["referral-earnings"], queryFn: () => referralAPI.getEarnings() });
  const { data: summary } = useQuery({ queryKey: ["dashboard-summary"], queryFn: () => dashboardAPI.getSummary().then((r: any) => r.data) });
  const { data: finances } = useQuery({ queryKey: ["dashboard-finance"], queryFn: () => dashboardAPI.getFinance().then((r: any) => r.data) });
  const { data: pulse } = useQuery({ queryKey: ["dashboard-pulse"], queryFn: () => dashboardAPI.getPulse().then((r: any) => r.data) });

  const crmDataForAI = {
    summary, finances, pulse,
    deals: dealsList?.slice(0, 10)?.map((d: any) => ({ dealNumber: d.dealNumber, status: d.status, expectedAmount: d.expectedAmount, client: d.client?.name })),
    pipeline: pipelineData, myActive: myActive?.length, myClosed: myClosed?.length, myAmount, myCommission: myEarnings?.total || 0,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>{"🧠"}</span>
            {"👋 " + (user?.firstName || "User") + ", добро пожаловать!"}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">AI-дашборд — каждый раз новый взгляд на ваш бизнес</p>
        </div>
      </div>
      <AiDashboardView crmData={crmDataForAI} />
    </div>
      {cinemaMode && <CinemaMode cards={cinemaCards} activeTab={cinemaTab} onClose={() => setCinemaMode(false)} />}
  );
}
