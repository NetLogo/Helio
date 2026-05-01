import type { RadioGroupItem } from "@nuxt/ui";
import type { UserProfile } from "./useProfile";

type EditableUserKind = "student" | "teacher" | "researcher" | "other";
type PrivateUserProfile = UserProfile & {
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  systemRole: string;
  userKind: string;
};
type SaveProfileSettingsResult = {
  data: ResponseSuccessData<"PATCH", "/api/v1/users/{id}"> | null;
  error: ResponseErrorData<"PATCH", "/api/v1/users/{id}"> | null;
};

const userKindOptions: Array<RadioGroupItem> = [
  {
    label: "Student",
    value: "student",
    icon: "i-lucide-graduation-cap",
    description: "Learning through models, coursework, or independent study.",
  },
  {
    label: "Teacher",
    value: "teacher",
    icon: "i-lucide-school",
    description: "Using models in lessons, workshops, or curriculum design.",
  },
  {
    label: "Researcher",
    value: "researcher",
    icon: "i-lucide-flask-conical",
    description: "Building or studying models for analysis, experiments, or publications.",
  },
  {
    label: "Other",
    value: "other",
    icon: "i-lucide-user-round",
    description: "A role that does not fit neatly into the categories above.",
  },
];

function hasPrivateProfileFields(
  value: UserProfile | null | undefined,
): value is PrivateUserProfile {
  return Boolean(
    value &&
      "email" in value &&
      "emailVerified" in value &&
      "image" in value &&
      "systemRole" in value &&
      "userKind" in value,
  );
}

function normalizeUserKind(value: string | undefined | null): EditableUserKind {
  if (value === "student" || value === "teacher" || value === "researcher" || value === "other") {
    return value;
  }

  return "other";
}

export default function useProfileSettings() {
  const api = useApi();
  const user = useUser();
  const { profile, refresh, status } = useProfile();

  const isProfilePublic = ref(false);
  const userKind = ref<EditableUserKind>("other");
  const isSaving = ref(false);

  const loggedInUser = computed(() => (user.value.isLoggedIn ? user.value : null));
  const privateProfile = computed(() =>
    hasPrivateProfileFields(profile.value) ? profile.value : null,
  );
  const userId = computed(() => loggedInUser.value?.id ?? null);

  const displayName = computed(
    () => profile.value?.name || loggedInUser.value?.name || "Modeling Commons member",
  );
  const displayEmail = computed(
    () => privateProfile.value?.email || loggedInUser.value?.email || "No email available",
  );
  const displayImage = computed(
    () => privateProfile.value?.image || loggedInUser.value?.image || undefined,
  );
  const emailVerified = computed(
    () => privateProfile.value?.emailVerified ?? loggedInUser.value?.emailVerified ?? false,
  );
  const systemRoleLabel = computed(() => sentenceCase(privateProfile.value?.systemRole ?? "user"));
  const persistedUserKind = computed(() => normalizeUserKind(privateProfile.value?.userKind));

  const isDirty = computed(() => {
    if (!profile.value) {
      return false;
    }

    return (
      isProfilePublic.value !== profile.value.isProfilePublic ||
      userKind.value !== persistedUserKind.value
    );
  });

  watch(
    profile,
    (currentProfile) => {
      if (!currentProfile) {
        return;
      }

      isProfilePublic.value = currentProfile.isProfilePublic;
      userKind.value = normalizeUserKind(
        hasPrivateProfileFields(currentProfile) ? currentProfile.userKind : null,
      );
    },
    { immediate: true },
  );

  function resetProfileSettings() {
    if (!profile.value) {
      return;
    }

    isProfilePublic.value = profile.value.isProfilePublic;
    userKind.value = persistedUserKind.value;
  }

  async function saveProfileSettings(): Promise<SaveProfileSettingsResult> {
    if (!userId.value || !profile.value || !isDirty.value || isSaving.value) {
      return { data: null, error: null };
    }

    isSaving.value = true;

    const response = await api.PATCH("/api/v1/users/{id}", {
      params: { path: { id: userId.value } },
      body: {
        isProfilePublic: isProfilePublic.value,
        userKind: userKind.value,
      },
    });

    isSaving.value = false;

    if (!response.error) {
      await refresh();
    }

    return {
      data: response.data ?? null,
      error: response.error ?? null,
    };
  }

  return {
    profile,
    refresh,
    status,
    displayName,
    displayEmail,
    displayImage,
    emailVerified,
    systemRoleLabel,
    isProfilePublic,
    userKind,
    userKindOptions,
    isDirty,
    isSaving,
    resetProfileSettings,
    saveProfileSettings,
  };
}

export type { EditableUserKind };
