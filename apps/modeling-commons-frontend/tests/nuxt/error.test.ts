import { describe, expect, it, vi } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import ErrorPage from "~/error.vue";

const { clearErrorMock } = vi.hoisted(() => ({
  clearErrorMock: vi.fn(),
}));

mockNuxtImport("clearError", () => clearErrorMock);

const stubs = {
  ClientNavbar: { template: '<nav data-testid="stub-navbar" />' },
  ClientFooter: { template: '<footer data-testid="stub-footer" />' },
  ErrorDisplay: {
    props: ["errorCode", "errorDetails"],
    template:
      '<div data-testid="error-display"><span data-testid="error-code">{{ errorCode }}</span><span data-testid="error-details">{{ errorDetails }}</span><button data-testid="go-home" @click="$emit(\'home\')">Go home</button></div>',
  },
};

describe("error.vue", () => {
  it("renders the 404 status code from props.error.statusCode", async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 404, message: "Not found" }) },
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="error-code"]').text()).toBe("404");
  });

  it("renders the 500 status code from props.error.statusCode", async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 500, message: "Boom" }) },
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="error-code"]').text()).toBe("500");
  });

  it("renders the error message from props.error.message", async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 500, message: "Internal failure" }) },
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="error-details"]').text()).toBe("Internal failure");
  });

  it("forwards both ClientNavbar and ClientFooter around the ErrorDisplay", async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 404, message: "Not found" }) },
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="stub-navbar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="stub-footer"]').exists()).toBe(true);
  });

  it.todo(
    "clicking 'Go home' / 'Try again' calls clearError({ redirect: '/' }) — error.vue currently has no in-template button; the action lives inside the (not-yet-implemented) ErrorDisplay component",
  );
});
