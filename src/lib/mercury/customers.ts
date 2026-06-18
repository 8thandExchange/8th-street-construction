import { mercuryFetch } from "./client";
import type { MercuryCustomer } from "./types";

export async function createMercuryCustomer(input: {
  name: string;
  email: string;
}): Promise<MercuryCustomer> {
  return mercuryFetch<MercuryCustomer>("/ar/customers", {
    method: "POST",
    json: input,
  });
}

export async function getMercuryCustomer(customerId: string): Promise<MercuryCustomer> {
  return mercuryFetch<MercuryCustomer>(`/ar/customers/${customerId}`);
}
