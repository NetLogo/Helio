import { createSharedComposable } from "@vueuse/core";
import WebsiteMeta from "~/assets/website-meta.json";

function _useWebsite() {
  return ref<{
    name: string;
    fullName: string;
    logo: string;
    description: string;
    longDescription: string;
    url: string;
    keywords: Array<string>;
  }>(WebsiteMeta);
}

const useWebsite = import.meta.client ? createSharedComposable(_useWebsite) : _useWebsite;

export { useWebsite };
