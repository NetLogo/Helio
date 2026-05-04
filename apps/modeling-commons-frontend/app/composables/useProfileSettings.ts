import { userKindOptions, type UserKind } from "~/assets/auth";
import type { SocialMediaLink } from "~/components/utility-components/SocialLink.vue";

type SaveResult = {
  data: { ok: true } | null;
  error: { message?: string } | null;
};

type UploadAvatarResult = {
  data: { image: string } | null;
  error: { message?: string } | null;
};

function normalizeUserKind(value: string | undefined | null): NonNullable<UserKind> {
  if (value === "student" || value === "teacher" || value === "researcher" || value === "other") {
    return value;
  }

  return "other";
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

function sameSocialLinks(a: Array<SocialMediaLink>, b: Array<SocialMediaLink>): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return Boolean(other && other.type === item.type && other.rawValue === item.rawValue);
  });
}

export default function useProfileSettings() {
  const auth = useNuxtApp().$auth;
  const { POST } = useApi();
  const { profile, refresh } = useProfile();
  const isSaving = ref(false);

  const nameField = useTrackedField(() => profile.value?.name ?? "");
  const bioField = useTrackedField(() => profile.value?.bio ?? "");
  const dobField = useTrackedField(() => toDate(profile.value?.dob), sameDay);
  const socialLinksField = useTrackedField(
    () => (Array.isArray(profile.value?.socialLinks) ? profile.value?.socialLinks : []),
    sameSocialLinks,
  );
  const countryField = useTrackedField(() => profile.value?.country ?? null);
  const affiliationField = useTrackedField(() => profile.value?.affiliation ?? "");
  const isProfilePublicField = useTrackedField(() => profile.value?.isProfilePublic ?? false);
  const userKindField = useTrackedField(() => normalizeUserKind(profile.value?.userKind));
  const fields = {
    name: nameField,
    bio: bioField,
    country: countryField,
    affiliation: affiliationField,
    dob: dobField,
    socialLinks: socialLinksField,
    isProfilePublic: isProfilePublicField,
    userKind: userKindField,
  };
  const isDirty = computed(() => Object.values(fields).some((f) => f.isDirty.value));
  const resetProfileSettings = () => Object.values(fields).forEach((f) => f.reset());

  const isAvatarUploading = ref(false);

  const userId = computed(() => profile.value?.id ?? null);

  const displayName = computed<string>(() => nameField.data.value || "Modeling Commons Member");
  const displayEmail = computed(() => profile.value?.email || "No email available");
  const displayImage = computed(() => profile.value?.image || undefined);
  const emailVerified = computed(() => profile.value?.emailVerified ?? false);
  const systemRoleLabel = computed(() => sentenceCase(profile.value?.systemRole ?? "user"));

  const hasCustomAvatar = computed(() => Boolean(displayImage.value));

  async function saveProfileSettings(): Promise<SaveResult> {
    if (!userId.value || !profile.value || !isDirty.value || isSaving.value) {
      return { data: null, error: null };
    }

    isSaving.value = true;

    const authPayload = Object.entries(fields).reduce(
      (payload, [key, field]) => {
        if (field.isDirty.value) {
          payload[key as keyof typeof fields] = field.data.value;
        }
        return payload;
      },
      {} as Record<string, unknown>,
    );

    try {
      await auth.client.updateUser(authPayload);
      await refresh();
      return { data: { ok: true }, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message || "Failed to save profile" },
      };
    } finally {
      isSaving.value = false;
    }
  }

  async function uploadAvatar(file: File): Promise<UploadAvatarResult> {
    isAvatarUploading.value = true;
    try {
      const form = new FormData();
      form.append("file", file);

      const { error, response, data } = await POST("/api/v1/uploads/avatar", {
        // @ts-expect-error - FormData doesn't type well with openAPI
        // -Omar Ibrahim, May 04 26
        body: form as unknown,
      });
      if (error || !response.ok) {
        return {
          data: null,
          error: { message: error || "Failed to upload avatar" },
        };
      }

      const { url } = data;
      const updateRes = await auth.client.updateUser({ image: url });
      if (updateRes.error) {
        return { data: null, error: updateRes.error };
      }

      await refresh();
      return { data: { image: url }, error: null };
    } finally {
      isAvatarUploading.value = false;
    }
  }

  async function removeAvatar(): Promise<SaveResult> {
    const res = await auth.client.updateUser({ image: null });
    if (res.error) {
      return { data: null, error: res.error };
    }
    await refresh();
    return { data: { ok: true }, error: null };
  }

  return {
    profile,
    refresh,
    displayName,
    displayEmail,
    displayImage,
    emailVerified,
    systemRoleLabel,

    userKindOptions,

    name: nameField.data,
    bio: bioField.data,
    country: countryField.data,
    dob: dobField.data,
    affiliation: affiliationField.data,
    socialLinks: socialLinksField.data,
    isProfilePublic: isProfilePublicField.data,
    userKind: userKindField.data,

    isAvatarUploading,
    hasCustomAvatar,
    isDirty,
    isSaving,
    resetProfileSettings,
    saveProfileSettings,
    uploadAvatar,
    removeAvatar,
  };
}
