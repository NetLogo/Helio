import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import useTrackedField from "~/composables/shared/useTrackedField";

describe("useTrackedField", () => {
  it("seeds data from the source on creation", () => {
    const source = ref("hello");
    const field = useTrackedField(() => source.value);

    expect(field.data.value).toBe("hello");
    expect(field.persisted.value).toBe("hello");
    expect(field.isDirty.value).toBe(false);
  });

  it("isDirty flips true when data diverges from persisted", () => {
    const source = ref("a");
    const field = useTrackedField(() => source.value);

    field.data.value = "b";
    expect(field.isDirty.value).toBe(true);
  });

  it("reset reverts data back to the persisted source value", () => {
    const source = ref("original");
    const field = useTrackedField(() => source.value);

    field.data.value = "edited";
    expect(field.isDirty.value).toBe(true);

    field.reset();
    expect(field.data.value).toBe("original");
    expect(field.isDirty.value).toBe(false);
  });

  it("updates data when the source ref changes", async () => {
    const source = ref("first");
    const field = useTrackedField(() => source.value);

    source.value = "second";
    await nextTick();

    expect(field.persisted.value).toBe("second");
    expect(field.data.value).toBe("second");
    expect(field.isDirty.value).toBe(false);
  });

  it("uses the provided equals function to compute isDirty", () => {
    const source = ref({ id: 1, label: "x" });
    const field = useTrackedField(
      () => source.value,
      (a, b) => a.id === b.id,
    );

    field.data.value = { id: 1, label: "different label" };
    expect(field.isDirty.value).toBe(false);

    field.data.value = { id: 2, label: "x" };
    expect(field.isDirty.value).toBe(true);
  });

  it("applies toData when seeding and resetting", () => {
    const source = ref("abc");
    const field = useTrackedField(
      () => source.value,
      (a, b) => a === b,
      (v) => v.toUpperCase(),
    );

    expect(field.data.value).toBe("ABC");
    field.data.value = "edited";
    field.reset();
    expect(field.data.value).toBe("ABC");
  });
});
