"use client";

import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  PUSH_CONFIG_QUERY_KEY,
  PUSH_DEVICES_QUERY_KEY,
  deletePushDevice,
  getPushConfig,
  listPushDevices,
  savePushDevice,
  type PushDevice,
} from "./api";
import {
  readLocalPushState,
  subscribeThisDevice,
  unsubscribeThisDevice,
} from "./client";

export const PUSH_LOCAL_QUERY_KEY = ["push", "local"] as const;

export function usePush() {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: PUSH_CONFIG_QUERY_KEY,
    queryFn: getPushConfig,
    staleTime: Infinity,
  });

  const local = useQuery({
    queryKey: PUSH_LOCAL_QUERY_KEY,
    queryFn: readLocalPushState,
  });

  const devices = useQuery({
    queryKey: PUSH_DEVICES_QUERY_KEY,
    queryFn: config.data?.enabled ? listPushDevices : skipToken,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PUSH_LOCAL_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PUSH_DEVICES_QUERY_KEY }),
    ]);
  };

  const enable = useMutation({
    mutationFn: async () => {
      const input = await subscribeThisDevice(config.data?.publicKey ?? "");
      await savePushDevice(input);
    },
    onSettled: refresh,
  });

  const disable = useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeThisDevice();
      const row = devices.data?.find((device) => device.endpoint === endpoint);
      if (row) await deletePushDevice(row.id);
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: async (device: PushDevice) => {
      if (device.endpoint === local.data?.endpoint) {
        await unsubscribeThisDevice();
      }
      await deletePushDevice(device.id);
    },
    onSettled: refresh,
  });

  return { config, local, devices, enable, disable, remove };
}
