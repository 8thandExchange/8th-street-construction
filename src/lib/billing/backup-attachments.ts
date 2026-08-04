/**
 * Backup invoices (vendor/sub PDFs) attached behind an invoice cover sheet.
 * Files live in the project-documents bucket under invoice-backups/<invoiceId>/.
 */

export const INVOICE_BACKUP_PREFIX = "invoice-backups/";
export const MAX_BACKUP_BYTES = 15 * 1024 * 1024;

// pdf-lib can only embed PNG/JPEG pages into the merged packet
const IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
export const ALLOWED_BACKUP_TYPES = ["application/pdf", ...IMAGE_TYPES];

export type InvoiceAttachmentRecord = {
  id: string;
  invoice_id: string;
  line_item_id: string | null;
  file_name: string;
  storage_path: string;
  media_type: string;
  file_size: number | null;
  display_order: number;
};
