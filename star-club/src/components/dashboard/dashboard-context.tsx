"use client";

import { createContext, useContext } from "react";

interface DashboardCtx {
  clubLogo?: string | null;
  clubName?: string;
}

export const DashboardContext = createContext<DashboardCtx>({});
export const useDashboard = () => useContext(DashboardContext);
