import { api } from "@/src/lib/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type FeedbackItemType = "feature" | "improvement" | "bug" | "other";

export type FeedbackItemStatus =
  | "reviewing"
  | "planned"
  | "in_development"
  | "shipped";

export type FeedbackItem = {
  id: string;
  title: string;
  description: string | null;
  type: FeedbackItemType;
  type_label: string;
  status: FeedbackItemStatus;
  status_label: string;
  vote_count: number;
  viewer_has_voted: boolean;
  created_at: string;
  screenshot_urls: string[];
};

export const FEEDBACK_SCREENSHOT_BUCKET = "feedback_screenshots";
export const MAX_FEEDBACK_SCREENSHOTS = 3;

export const feedbackQueryKey = ["feedback", "board"] as const;

export async function fetchFeedbackBoard(): Promise<FeedbackItem[]> {
  return api.get<FeedbackItem[]>("/api/feedback");
}

export async function submitFeedback(input: {
  title: string;
  description?: string;
  type: FeedbackItemType;
  screenshot_paths?: string[];
}): Promise<FeedbackItem> {
  return api.post<FeedbackItem>("/api/feedback", input);
}

export async function toggleFeedbackVote(
  itemId: string
): Promise<{ voted: boolean; vote_count: number }> {
  return api.post<{ voted: boolean; vote_count: number }>(
    `/api/feedback/${itemId}/vote`
  );
}

export function useFeedbackBoard() {
  return useQuery({
    queryKey: feedbackQueryKey,
    queryFn: fetchFeedbackBoard,
    staleTime: 30_000,
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedbackQueryKey });
    },
  });
}

export function useToggleFeedbackVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleFeedbackVote,
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: feedbackQueryKey });
      const prev = queryClient.getQueryData<FeedbackItem[]>(feedbackQueryKey);
      if (prev) {
        queryClient.setQueryData<FeedbackItem[]>(
          feedbackQueryKey,
          prev.map((item) => {
            if (item.id !== itemId) return item;
            const voted = !item.viewer_has_voted;
            return {
              ...item,
              viewer_has_voted: voted,
              vote_count: item.vote_count + (voted ? 1 : -1),
            };
          })
        );
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(feedbackQueryKey, ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: feedbackQueryKey });
    },
  });
}

export const FEEDBACK_TYPE_OPTIONS: {
  code: FeedbackItemType;
  label: string;
}[] = [
  { code: "feature", label: "New feature" },
  { code: "improvement", label: "Improvement" },
  { code: "bug", label: "Bug fix" },
  { code: "other", label: "Other" },
];
