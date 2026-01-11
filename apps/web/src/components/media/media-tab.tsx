"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@vamsa/ui/primitives";
import { MediaUploader } from "./media-uploader";
import { MediaGallery } from "./media-gallery";
import { MediaViewerModal } from "./media-viewer-modal";
import { MediaMetadataEditor } from "./media-metadata-editor";
import {
  getPersonMedia,
  getMediaObject,
  deleteMedia,
  updateMediaMetadata,
  setPrimaryPhoto,
  uploadMedia,
} from "~/server/media";

export function MediaTab() {
  const { personId } = useParams({ from: "/_authenticated/people/$personId" });
  const queryClient = useQueryClient();

  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch all media for this person
  const { data: mediaData, isLoading: isLoadingMedia } = useQuery({
    queryKey: ["personMedia", personId],
    queryFn: () => getPersonMedia({ data: { personId } }),
  });

  // Fetch selected media details
  const { data: selectedMedia } = useQuery({
    queryKey: ["mediaObject", selectedMediaId],
    queryFn: () =>
      selectedMediaId
        ? getMediaObject({ data: { mediaId: selectedMediaId } })
        : null,
    enabled: !!selectedMediaId,
  });

  // Fetch editing media details
  const { data: editingMedia } = useQuery({
    queryKey: ["mediaObject", editingMediaId],
    queryFn: () =>
      editingMediaId
        ? getMediaObject({ data: { mediaId: editingMediaId } })
        : null,
    enabled: !!editingMediaId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Read file as base64
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(",")[1];
          if (!base64String) {
            reject(new Error("Failed to read file"));
            return;
          }
          resolve(base64String);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      }).then((base64Data) =>
        uploadMedia({
          data: {
            personId,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            base64Data,
            title: file.name.split(".")[0],
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personMedia", personId] });
      setUploadError(null);
    },
    onError: (error: Error) => {
      setUploadError(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => deleteMedia({ data: { mediaId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personMedia", personId] });
      setSelectedMediaId(null);
    },
  });

  // Update metadata mutation
  const updateMetadataMutation = useMutation({
    mutationFn: ({
      mediaId,
      ...data
    }: {
      mediaId: string;
      title?: string;
      description?: string;
      caption?: string;
      source?: string;
    }) => updateMediaMetadata({ data: { mediaId, ...data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personMedia", personId] });
      queryClient.invalidateQueries({
        queryKey: ["mediaObject", editingMediaId],
      });
    },
  });

  // Set primary photo mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (mediaId: string) =>
      setPrimaryPhoto({ data: { personId, mediaId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personMedia", personId] });
    },
  });

  const handleUpload = (file: File) => {
    uploadMutation.mutate(file);
  };

  const handleView = (mediaId: string) => {
    setSelectedMediaId(mediaId);
  };

  const handleEdit = (mediaId: string) => {
    setEditingMediaId(mediaId);
  };

  const handleDelete = (mediaId: string) => {
    deleteMutation.mutate(mediaId);
  };

  const handleSetPrimary = (mediaId: string) => {
    setPrimaryMutation.mutate(mediaId);
  };

  const handleSaveMetadata = (data: {
    title?: string;
    description?: string;
    caption?: string;
    source?: string;
  }) => {
    if (editingMediaId) {
      updateMetadataMutation.mutate({ mediaId: editingMediaId, ...data });
    }
  };

  const media = mediaData?.items || [];
  const primaryPhoto = media.find((m) => m.isPrimary);

  return (
    <>
      <div className="space-y-6">
        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Photos & Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Total Photos:</span>
                <span className="text-foreground ml-2 font-medium">
                  {media.length}
                </span>
              </div>
              {primaryPhoto && (
                <div>
                  <span className="text-muted-foreground">Primary Photo:</span>
                  <span className="text-foreground ml-2 font-medium">
                    {primaryPhoto.title || "Untitled"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload New Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <MediaUploader
              onUpload={handleUpload}
              isUploading={uploadMutation.isPending}
              error={uploadError}
            />
          </CardContent>
        </Card>

        {/* Gallery section */}
        <Card>
          <CardHeader>
            <CardTitle>Photo Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <MediaGallery
              media={media}
              isLoading={isLoadingMedia}
              onView={handleView}
              onSetPrimary={handleSetPrimary}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      </div>

      {/* Media viewer modal */}
      {selectedMediaId && selectedMedia && (
        <MediaViewerModal
          media={selectedMedia}
          allMediaIds={media.map((m) => m.mediaId)}
          relatedEvents={selectedMedia.eventMedia}
          onClose={() => setSelectedMediaId(null)}
          onNavigate={(mediaId) => setSelectedMediaId(mediaId)}
          onEdit={() => {
            setEditingMediaId(selectedMediaId);
            setSelectedMediaId(null);
          }}
          onDelete={() => handleDelete(selectedMediaId)}
        />
      )}

      {/* Metadata editor modal */}
      {editingMediaId && editingMedia && (
        <MediaMetadataEditor
          media={editingMedia}
          caption={
            editingMedia.personMedia.find((pm) => pm.personId === personId)
              ?.caption
          }
          onSave={handleSaveMetadata}
          onClose={() => setEditingMediaId(null)}
          isSaving={updateMetadataMutation.isPending}
        />
      )}
    </>
  );
}
