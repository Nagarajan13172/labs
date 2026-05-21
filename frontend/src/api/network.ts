import { api } from "./client";
import type { PeerStatus } from "./types";

export interface DomainList {
  auto_host: string;
  domains: string[];
}

export const networkApi = {
  listPeers: () => api.get<PeerStatus[]>("/network/peers"),
  createPeer: (device_name: string) =>
    api.post<PeerStatus>("/network/peers", { device_name }),
  deletePeer: (id: string) => api.del<null>(`/network/peers/${id}`),
  peerConfig: (id: string) => api.text(`/network/peers/${id}/config`),
  peerQrBlob: (id: string) => api.blob(`/network/peers/${id}/qr`),

  listDomains: () => api.get<DomainList>("/network/domains"),
  addDomain: (domain_name: string) => api.post<DomainList>("/network/domains", { domain_name }),
  removeDomain: (domain: string) => api.del<null>(`/network/domains/${domain}`),
};
