"use client";

import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  /** Title shown in the dialog header. */
  title: string;
  /** Descriptive message explaining what will happen. */
  message: React.ReactNode;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Variant applied to the confirm button. Defaults to "danger". */
  confirmVariant?: "danger" | "primary";
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Called when the user clicks Confirm. */
  onConfirm: () => void;
  /** Called when the user dismisses the dialog. */
  onCancel: () => void;
  /** Whether the confirm action is in progress (shows spinner). */
  loading?: boolean;
}

/**
 * Confirmation dialog for destructive or irreversible actions.
 *
 * Render conditionally — when `isOpen` is true, mount; otherwise unmount.
 *
 * Usage:
 * ```tsx
 * {showDelete && (
 *   <ConfirmDialog
 *     title="Delete Invoice?"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *     loading={isDeleting}
 *   />
 * )}
 * ```
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps): React.ReactElement {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <ModalBody>
        <div className="flex items-start gap-3">
          {/* Warning icon */}
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg
              className="h-5 w-5 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 pt-2">
            {message}
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          size="md"
          onClick={onConfirm}
          loading={loading}
          disabled={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
