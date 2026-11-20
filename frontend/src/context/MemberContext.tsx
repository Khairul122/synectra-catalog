'use client';

import { createContext, useContext } from 'react';
import type { Member, MemberMe, MemberOrder, Profile } from '@/types';

export interface MemberContextType {
  token: string;
  me: MemberMe;
  /** Store profile, for the name, avatar and WhatsApp contact. */
  store: Profile | null;
  orders: MemberOrder[] | null;
  ordersError: string | null;
  reloadOrders: () => void;
  setAccount: (account: Member) => void;
}

export const MemberContext = createContext<MemberContextType | null>(null);

export function useMember(): MemberContextType {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error('useMember must be used inside the member layout');
  return ctx;
}

/** Name to greet the member with: saved name, else the name on their latest order, else the email. */
export const memberDisplayName = (me: MemberMe, orders: MemberOrder[] | null) =>
  me.account?.name || orders?.[0]?.buyer_name || me.email.split('@')[0];

export interface Purchase {
  invoiceId: string;
  paidAt: string;
  item: MemberOrder['items'][number];
}

/** One entry per product in each PAID order, newest first. */
export const purchasesOf = (orders: MemberOrder[]): Purchase[] =>
  orders
    .filter((o) => o.status === 'PAID')
    .flatMap((o) => o.items.map((item) => ({ invoiceId: o.invoice_id, paidAt: o.paid_at ?? o.created_at, item })));

export const formatDateTime = (iso: string, intl: string) =>
  new Date(iso).toLocaleString(intl, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
