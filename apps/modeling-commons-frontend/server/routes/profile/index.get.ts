import { makeServerClient } from "~~/server/utils/api";
import { GeneralFailureError } from "~~/shared/errors";

export default defineEventHandler(async (event) => {
  const { GET } = makeServerClient(event);

  try {
    const { data } = await GET("/api/v1/users/whoami");
    if (!data || !data.id) {
      throw new GeneralFailureError("Failed to fetch user profile: No user data returned");
    }

    return sendRedirect(event, `/users/${data.id}`, 302);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return sendRedirect(event, "/", 302);
  }
});
