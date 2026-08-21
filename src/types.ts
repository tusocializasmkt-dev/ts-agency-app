import type { FieldValue, Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'client';
export type FirestoreTimestamp = Timestamp | FieldValue;
export type ISODateString = string;
export type YearMonth = string;

export type BrandStatus = 'active' | 'pending' | 'suspended';
export type PostType = 'feed' | 'reels' | 'stories' | 'carousel' | 'other';
export type PostStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'scheduled';
export type PostDecisionAction = 'approved' | 'rejected' | 'changes_requested' | 'resubmitted';
export type NotificationType = 'post_created' | 'post_approved' | 'post_rejected' | 'post_changes_requested' | 'post_resubmitted' | 'invoice_created' | 'payment_confirmed' | 'payment_promise_requested' | 'payment_promise_approved' | 'payment_promise_rejected' | 'manual';
export type NotificationSource = 'system' | 'admin';
export type PostObjective = 'venda' | 'engajamento' | 'autoridade' | 'tráfego';
export type InvoiceStatus = 'pending' | 'overdue' | 'paid' | 'suspended' | 'cancelled';
export type PaymentPromiseStatus = 'approved' | 'pending' | 'rejected';

export interface AdminProfile {
  id: string;
  email: string;
  role: 'admin';
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface AgencyConfig {
  name: string;
  logoUrl: string;
  phone: string;
  email: string;
  socialLinks: Record<string, string>;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface Brand {
  id: string;
  name: string;
  cnpj: string;
  responsible: string;
  phone: string;
  email?: string;
  status: BrandStatus;
  accessEnabled?: boolean;
  logoUrl?: string;
  website: string;
  login: string;
  driveUrl?: string;
  contractUrl?: string;
  tradeName?: string;
  segment?: string;
  description?: string;
  city?: string;
  state?: string;
  whatsapp?: string;
  logoMediaId?: string;
  brandColors?: string;
  identityNotes?: string;
  targetAudience?: string;
  mainOffers?: string;
  communicationTone?: string;
  contentNotes?: string;
  avoidedTerms?: string;
  references?: string;
  internalNotes?: string;
  socialLinks: Record<string, string>;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface Post {
  id: string;
  brandId: string;
  type: PostType;
  socialNetwork: string;
  objective?: PostObjective;
  caption: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaIds?: string[];
  coverMediaId?: string;
  scheduledDate: ISODateString;
  status: PostStatus;
  feedback?: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface PostDecisionHistory {
  id: string;
  postId: string;
  brandId: string;
  action: PostDecisionAction;
  previousStatus: PostStatus;
  newStatus: PostStatus;
  feedback?: string;
  actorUid: string;
  actorRole: UserRole;
  createdAt?: Date;
}

export interface Notification {
  id: string;
  recipientUid: string;
  brandId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: 'post' | 'invoice';
  entityId?: string;
  readAt?: Date;
  createdAt?: Date;
  createdBy?: string;
  source: NotificationSource;
}

export interface PaymentPromise {
  requestedDate?: ISODateString;
  requestedAt?: FirestoreTimestamp;
  reason?: string;
  status: PaymentPromiseStatus;
  reviewedAt?: FirestoreTimestamp;
  reviewedBy?: string;
  reviewNote?: string;
  promiseDate?: ISODateString;
  description?: string;
}

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
export type InvoiceHistoryAction = 'created' | 'edited' | 'amount_changed' | 'due_date_changed' | 'boleto_replaced' | 'marked_paid' | 'suspended' | 'resumed' | 'cancelled' | 'payment_promise_requested' | 'payment_promise_approved' | 'payment_promise_rejected';
export interface InvoiceHistory { id: string; invoiceId: string; brandId: string; action: InvoiceHistoryAction; previousStatus?: InvoiceStatus; newStatus?: InvoiceStatus; previousAmount?: number; newAmount?: number; previousDueDate?: ISODateString; newDueDate?: ISODateString; previousBoletoMediaId?: string; newBoletoMediaId?: string; note?: string; actorUid: string; actorRole: UserRole; createdAt?: Date; }

export interface Invoice {
  id: string;
  brandId: string;
  amount: number;
  description?: string;
  notes?: string;
  currency?: 'BRL';
  referenceMonth?: YearMonth;
  originalDueDate?: ISODateString;
  dueDate: ISODateString;
  status: InvoiceStatus;
  paidAt?: FirestoreTimestamp;
  cancelledAt?: FirestoreTimestamp;
  suspendedAt?: FirestoreTimestamp;
  createdBy?: string;
  updatedBy?: string;
  activePaymentId?: string;
  paymentProvider?: import('./payments').PaymentProviderType;
  paymentMethodPreference?: import('./payments').PaymentMethod;
  externalReference?: string;
  boletoUrl?: string;
  boletoMediaId?: string;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  pixLink?: string;
  promisedPaymentDate?: ISODateString;
  paymentPromise?: PaymentPromise;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface OrganicMetrics {
  id: string;
  brandId: string;
  month: YearMonth;
  followers: number;
  engagement: number;
  reach: number;
  impressions: number;
  screenshotMediaIds?: string[];
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface PaidMetrics {
  id: string;
  brandId: string;
  month: YearMonth;
  investment: number;
  reach?: number;
  impressions?: number;
  clicks: number;
  leads?: number;
  cpc: number;
  cpl?: number;
  ctr: number;
  conversions: number;
  revenue?: number;
  roas?: number;
  screenshotMediaIds?: string[];
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface TrashItem extends Post {
  sourceCollection?: 'posts';
  deletedAt?: FirestoreTimestamp;
}
