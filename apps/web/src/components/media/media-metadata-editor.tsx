"use client";

import { useState } from "react";
import { Button, Input, Label } from "@vamsa/ui/primitives";

interface MediaMetadataEditorProps {
  media: {
    id: string;
    title: string | null;
    description: string | null;
    source: string | null;
  };
  caption?: string | null;
  onSave: (data: {
    title?: string;
    description?: string;
    caption?: string;
    source?: string;
  }) => void;
  onClose: () => void;
  isSaving: boolean;
}

export function MediaMetadataEditor({
  media,
  caption,
  onSave,
  onClose,
  isSaving,
}: MediaMetadataEditorProps) {
  const [formData, setFormData] = useState({
    title: media.title || "",
    description: media.description || "",
    caption: caption || "",
    source: media.source || "",
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="bg-background/80 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="bg-card border-border relative z-10 mx-4 w-full max-w-2xl rounded-lg border-2 shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-display text-foreground text-2xl">
            Edit Photo Details
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Give this photo a title..."
                disabled={isSaving}
              />
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                type="text"
                value={formData.caption}
                onChange={(e) =>
                  setFormData({ ...formData, caption: e.target.value })
                }
                placeholder="Add a caption for this photo..."
                disabled={isSaving}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the photo, what's happening, who's in it..."
                rows={4}
                disabled={isSaving}
                className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 hover:border-primary/50 placeholder:text-muted-foreground disabled:bg-muted flex w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                type="text"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                placeholder="Where did this photo come from?"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-border flex items-center justify-between border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>

        {/* Success message */}
        {showSuccess && (
          <div className="bg-card/95 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-foreground font-display text-xl font-medium">
                Changes saved!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
