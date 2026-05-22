// Shapes returned by the backend (mirror app/schemas/*).

export interface Envelope<T> {
  message: string;
  status: boolean;
  data: T | null;
}

export type UserRole = "user" | "admin" | "superadmin";

export interface User {
  id: string;
  email: string;
  username: string;
  phone: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type LabStatus = "pending" | "provisioning" | "running" | "stopped" | "failed";

export interface Lab {
  id: string;
  name: string;
  status: LabStatus;
  status_message: string | null;
  internal_ip: string;
  host_port: number | null;
  image: string;
  created_at: string;
  updated_at: string;
}

export interface LabCredentials {
  code_server_password: string;
  host_port: number | null;
}

export interface LabStats {
  cpu_percent: number;
  mem_used: number;
  mem_limit: number;
  mem_percent: number;
  rx_bytes: number;
  tx_bytes: number;
}

export interface PeerStatus {
  id: string;
  device_name: string;
  device_type: string;
  address: string;
  public_key: string;
  endpoint: string | null;
  latest_handshake: number;
  rx_bytes: number;
  tx_bytes: number;
  created_at: string;
}

export type DatabaseEngine = "mysql" | "mariadb" | "mongodb";

export interface ManagedDatabase {
  id: string;
  engine: DatabaseEngine;
  name: string;
  db_name: string;
  username: string;
  password: string;
  host: string;
  port: number;
  connection_uri: string;
  created_at: string;
}
