import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import UStripedTable from "./UStripedTable.vue";

type Row = { id: string; name: string };

const rows: Row[] = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Bravo" },
  { id: "3", name: "Charlie" },
];

const columns = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
];

describe("UStripedTable", () => {
  it("renders a row for each data item", async () => {
    const wrapper = await mountSuspended(UStripedTable<Row>, {
      props: { data: rows, columns },
    });
    expect(wrapper.text()).toContain("Alpha");
    expect(wrapper.text()).toContain("Bravo");
    expect(wrapper.text()).toContain("Charlie");
  });

  it("applies striping classes to alternating rows via tbody class", async () => {
    const wrapper = await mountSuspended(UStripedTable<Row>, {
      props: { data: rows, columns },
    });
    const tbody = wrapper.find("tbody");
    expect(tbody.exists()).toBe(true);
    expect(tbody.classes().join(" ")).toContain("nth-child(even)");
  });

  it("renders the column headers", async () => {
    const wrapper = await mountSuspended(UStripedTable<Row>, {
      props: { data: rows, columns },
    });
    expect(wrapper.text()).toContain("ID");
    expect(wrapper.text()).toContain("Name");
  });
});
