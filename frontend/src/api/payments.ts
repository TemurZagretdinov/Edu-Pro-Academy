import { apiClient } from "./client";
import type { Payment, PaymentPayload } from "../types";

export async function getPayments(params?: { is_cash?: boolean; student_id?: number }) {
  const { data } = await apiClient.get<Payment[]>("/payments", { params });
  return data;
}

export async function createPayment(payload: PaymentPayload) {
  const { data } = await apiClient.post<Payment>("/payments", payload);
  return data;
}

export async function getMonthlyPaymentSummary() {
  const { data } = await apiClient.get<Array<{ month: string; total_amount: string; payment_count: number }>>(
    "/payments/summary/monthly",
  );
  return data;
}
