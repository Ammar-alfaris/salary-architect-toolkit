import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getOrgLifecycleStatus } from "@/lib/trial.functions";
import { useAuth } from "@/lib/auth";

export type LifecycleStatus =
  | "none"
  | "trial"
  | "trial_ending"
  | "grace"
  | "restricted"
  | "dormant"
  | "active"
  | "canceled";

export interface TrialStatus {
  status: LifecycleStatus;
  trialEndAt: string | null;
  planName: string | null;
  daysLeft: number; // negative when past end
  canWrite: boolean;
  canRead: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useTrialStatus(): TrialStatus {
  const { user } = useAuth();
  const getStatus = useServerFn(getOrgLifecycleStatus);
  const [data, setData] = useState<{ status: LifecycleStatus; trialEndAt: string | null; planName: string | null }>({
    status: "none",
    trialEndAt: null,
    planName: null,
  });
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await getStatus({ data: undefined as any });
      setData({
        status: (res.status as LifecycleStatus) ?? "none",
        trialEndAt: res.trialEndAt,
        planName: res.planName,
      });
    } finally {
      setLoading(false);
    }
  }, [user, getStatus]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const daysLeft = data.trialEndAt
    ? Math.ceil((new Date(data.trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const canWrite = data.status === "trial" || data.status === "trial_ending" || data.status === "active";
  const canRead = data.status !== "dormant";

  return { ...data, daysLeft, canWrite, canRead, loading, refetch };
}
