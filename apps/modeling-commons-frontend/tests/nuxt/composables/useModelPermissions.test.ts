import { clearNuxtData } from "#app";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import useUserModelPermissions, { type UserModelPermissions } from "~/composables/model/useModelPermissions";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

function makePermissions(granted: boolean): UserModelPermissions {
  return {
    canView: true,
    canFork: granted,
    canComment: granted,
    canReport: granted,
    canLike: granted,
    canEdit: granted,
    canPublishVersion: granted,
    canEditDraft: granted,
    canRevertVersion: granted,
    canManageAuthors: granted,
    canChangePermissions: granted,
    canTransferOwnership: granted,
    canDelete: granted,
  };
}

const PermissionsProbe = defineComponent({
  async setup() {
    const { data } = await useUserModelPermissions("model-1");
    return () => h("span", String(data.value?.canEdit));
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  clearNuxtData();
  apiState.current = makeApiClientMock();
});

describe("useUserModelPermissions", () => {
  it("fetches permissions again on remount instead of reusing the earlier payload", async () => {
    apiState
      .current!.GET.mockResolvedValueOnce(apiResult.ok(makePermissions(true)))
      .mockResolvedValueOnce(apiResult.ok(makePermissions(false)));

    const asOwner = await mountSuspended(PermissionsProbe);
    expect(asOwner.text()).toBe("true");
    asOwner.unmount();
    await nextTick();

    const afterLogout = await mountSuspended(PermissionsProbe);

    expect(apiState.current!.GET).toHaveBeenCalledTimes(2);
    expect(afterLogout.text()).toBe("false");
  });
});
